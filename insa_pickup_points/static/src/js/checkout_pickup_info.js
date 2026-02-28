/**
 * INSA Pickup Point Info - Checkout enhancement
 *
 * Adds a popup modal to delivery methods that are pickup points,
 * showing contact info, hours, and an OpenStreetMap map.
 */
import publicWidget from '@web/legacy/js/public/public_widget';
import { rpc } from '@web/core/network/rpc';

// Leaflet loaded flag
let leafletLoaded = false;

/**
 * Load Leaflet CSS + JS from CDN (free, no API key needed)
 */
function loadLeaflet() {
    if (leafletLoaded && window.L) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        // Check if already loading
        if (document.querySelector('link[href*="leaflet"]')) {
            // Already added, wait for L
            const check = setInterval(() => {
                if (window.L) {
                    clearInterval(check);
                    leafletLoaded = true;
                    resolve();
                }
            }, 100);
            setTimeout(() => { clearInterval(check); reject(new Error('Leaflet timeout')); }, 10000);
            return;
        }

        // CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        // JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
            leafletLoaded = true;
            resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * Geocode an address using Nominatim (free, no key required)
 */
async function geocodeAddress(address) {
    const url = 'https://nominatim.openstreetmap.org/search?' +
        'q=' + encodeURIComponent(address) + '&format=json&limit=1';
    try {
        const resp = await fetch(url, {
            headers: { 'Accept-Language': 'es' },
        });
        const data = await resp.json();
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
    } catch (e) {
        console.warn('INSA Pickup: geocode failed', e);
    }
    return null;
}

publicWidget.registry.InsaPickupInfoCheckout = publicWidget.Widget.extend({
    selector: '#shop_checkout',
    events: {
        'click .insa-pickup-info-btn': '_onClickPickupInfo',
    },

    _mapInstance: null,

    async _onClickPickupInfo(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation();

        const btn = ev.currentTarget;
        const carrierId = parseInt(btn.dataset.carrierId);
        if (!carrierId) {
            console.warn('INSA Pickup: no carrier id');
            return;
        }

        // Show modal (plain DOM — no dependency on window.bootstrap)
        const modalEl = document.getElementById('insaPickupInfoModal');
        if (!modalEl) {
            console.warn('INSA Pickup: modal not found');
            return;
        }
        this._showModal(modalEl);

        // Show loading, hide content
        const loading = document.getElementById('insaPickupLoading');
        const content = document.getElementById('insaPickupContent');
        if (loading) {
            loading.classList.remove('d-none');
            loading.innerHTML = '<div class="text-center py-5">' +
                '<div class="spinner-border text-primary" role="status">' +
                '<span class="visually-hidden">Cargando...</span></div>' +
                '<p class="mt-2 text-muted">Cargando información...</p></div>';
        }
        if (content) content.classList.add('d-none');

        // Fetch data via JSON RPC
        let data;
        try {
            data = await rpc('/shop/pickup_point_info/' + carrierId, {});
        } catch (e) {
            console.error('INSA Pickup: RPC error', e);
            if (loading) {
                loading.innerHTML =
                    '<div class="text-center py-4 text-danger">' +
                    '<i class="fa fa-exclamation-triangle fa-2x mb-2 d-block"></i>' +
                    '<p>Error al cargar la información.</p></div>';
            }
            return;
        }

        if (!data || data.error) {
            if (loading) {
                loading.innerHTML =
                    '<div class="text-center py-4 text-warning">' +
                    '<i class="fa fa-info-circle fa-2x mb-2 d-block"></i>' +
                    '<p>Este método de entrega no tiene punto de retiro configurado.</p></div>';
            }
            return;
        }

        // Populate modal fields
        this._populateModal(data);

        // Show content, hide loading
        if (loading) loading.classList.add('d-none');
        if (content) content.classList.remove('d-none');

        // Load Leaflet & render map
        await this._renderMap(data);
    },

    _populateModal(data) {
        var el;

        // Header carrier name
        el = document.getElementById('insaPickupCarrierName');
        if (el) el.textContent = data.carrier_name || '';

        // Partner name
        el = document.getElementById('insaPickupPartnerName');
        if (el) el.textContent = data.partner_name || '';

        // Address
        el = document.getElementById('insaPickupAddress1');
        if (el) el.textContent = data.address_line1 || '';
        el = document.getElementById('insaPickupAddress2');
        if (el) el.textContent = data.address_line2 || '';

        // Phone
        var phoneRow = document.getElementById('insaPickupPhoneRow');
        var phoneEl = document.getElementById('insaPickupPhone');
        if (data.phone) {
            if (phoneRow) phoneRow.classList.remove('d-none');
            if (phoneEl) {
                phoneEl.textContent = data.phone;
                phoneEl.href = 'tel:' + data.phone;
            }
        } else {
            if (phoneRow) phoneRow.classList.add('d-none');
        }

        // Email
        var emailRow = document.getElementById('insaPickupEmailRow');
        var emailEl = document.getElementById('insaPickupEmail');
        if (data.email) {
            if (emailRow) emailRow.classList.remove('d-none');
            if (emailEl) {
                emailEl.textContent = data.email;
                emailEl.href = 'mailto:' + data.email;
            }
        } else {
            if (emailRow) emailRow.classList.add('d-none');
        }

        // Hours
        var hoursCard = document.getElementById('insaPickupHoursCard');
        var noHoursCard = document.getElementById('insaPickupNoHoursCard');
        var hoursEl = document.getElementById('insaPickupHours');
        if (data.pickup_hours) {
            if (hoursCard) hoursCard.classList.remove('d-none');
            if (noHoursCard) noHoursCard.classList.add('d-none');
            if (hoursEl) hoursEl.textContent = data.pickup_hours;
        } else {
            if (hoursCard) hoursCard.classList.add('d-none');
            if (noHoursCard) noHoursCard.classList.remove('d-none');
        }

        // Google Maps external link
        el = document.getElementById('insaPickupMapLink');
        if (el && data.full_address) {
            el.href = 'https://www.google.com/maps/search/?api=1&query=' +
                encodeURIComponent(data.full_address);
        }
    },

    async _renderMap(data) {
        var mapEl = document.getElementById('insaPickupMap');
        if (!mapEl) return;

        try {
            await loadLeaflet();
        } catch (e) {
            console.warn('INSA Pickup: Could not load Leaflet', e);
            mapEl.innerHTML =
                '<div class="text-center py-4 text-muted">' +
                '<i class="fa fa-map fa-2x mb-2 d-block"></i>' +
                '<p>No se pudo cargar el mapa.</p></div>';
            return;
        }

        // Destroy existing map
        if (this._mapInstance) {
            try { this._mapInstance.remove(); } catch(e) {}
            this._mapInstance = null;
        }

        // Clear map container
        mapEl.innerHTML = '';

        // Get coordinates: use stored lat/lng or geocode
        var coords = null;
        if (data.latitude && data.longitude && data.latitude !== 0 && data.longitude !== 0) {
            coords = { lat: data.latitude, lng: data.longitude };
        } else if (data.full_address) {
            coords = await geocodeAddress(data.full_address);
        }

        if (!coords) {
            mapEl.innerHTML =
                '<div class="text-center py-4 text-muted">' +
                '<i class="fa fa-map-marker fa-2x mb-2 d-block"></i>' +
                '<p>No se pudo determinar la ubicación en el mapa.</p>' +
                '<a href="https://www.google.com/maps/search/?api=1&query=' +
                encodeURIComponent(data.full_address || '') +
                '" target="_blank" class="btn btn-sm btn-outline-primary">' +
                '<i class="fa fa-external-link me-1"></i>Buscar en Google Maps</a></div>';
            return;
        }

        // Create Leaflet map
        var map = L.map(mapEl).setView([coords.lat, coords.lng], 16);
        this._mapInstance = map;

        // OpenStreetMap tiles (free)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a>',
            maxZoom: 19,
        }).addTo(map);

        // Custom marker with INSA colors
        var markerIcon = L.divIcon({
            className: 'insa-map-marker-icon',
            html: '<div class="insa-map-marker"><i class="fa fa-map-marker"></i></div>',
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -42],
        });

        // Add marker with popup
        var marker = L.marker([coords.lat, coords.lng], { icon: markerIcon }).addTo(map);
        marker.bindPopup(
            '<div class="insa-map-popup">' +
            '<strong>' + (data.partner_name || '') + '</strong><br/>' +
            '<small>' + (data.address_line1 || '') + '</small></div>'
        ).openPopup();

        // Fix map resize when modal is shown (Leaflet needs this)
        setTimeout(function() { map.invalidateSize(); }, 300);
        setTimeout(function() { map.invalidateSize(); }, 600);
    },

    // ---- Plain DOM modal management (no Bootstrap JS needed) ----

    _showModal(modalEl) {
        // Backdrop
        let backdrop = document.getElementById('insaPickupBackdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = 'insaPickupBackdrop';
            backdrop.className = 'modal-backdrop fade';
            document.body.appendChild(backdrop);
        }
        // Force reflow then add .show
        void backdrop.offsetHeight;
        backdrop.classList.add('show');

        modalEl.style.display = 'block';
        modalEl.setAttribute('aria-hidden', 'false');
        void modalEl.offsetHeight;
        modalEl.classList.add('show');
        document.body.classList.add('modal-open');

        // Close on backdrop click
        this._backdropClickHandler = (ev) => {
            if (ev.target === modalEl) this._hideModal(modalEl);
        };
        modalEl.addEventListener('click', this._backdropClickHandler);

        // Close on [data-bs-dismiss="modal"] buttons
        modalEl.querySelectorAll('[data-bs-dismiss="modal"]').forEach((btn) => {
            btn._insaCloseHandler = () => this._hideModal(modalEl);
            btn.addEventListener('click', btn._insaCloseHandler);
        });

        // Close on Escape key
        this._escHandler = (ev) => {
            if (ev.key === 'Escape') this._hideModal(modalEl);
        };
        document.addEventListener('keydown', this._escHandler);
    },

    _hideModal(modalEl) {
        modalEl.classList.remove('show');
        document.body.classList.remove('modal-open');

        const backdrop = document.getElementById('insaPickupBackdrop');
        if (backdrop) backdrop.classList.remove('show');

        // After CSS transition
        setTimeout(() => {
            modalEl.style.display = 'none';
            modalEl.setAttribute('aria-hidden', 'true');
            if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
        }, 200);

        // Clean up listeners
        if (this._backdropClickHandler) {
            modalEl.removeEventListener('click', this._backdropClickHandler);
            this._backdropClickHandler = null;
        }
        modalEl.querySelectorAll('[data-bs-dismiss="modal"]').forEach((btn) => {
            if (btn._insaCloseHandler) {
                btn.removeEventListener('click', btn._insaCloseHandler);
                delete btn._insaCloseHandler;
            }
        });
        if (this._escHandler) {
            document.removeEventListener('keydown', this._escHandler);
            this._escHandler = null;
        }

        // Destroy map to avoid stale tiles
        if (this._mapInstance) {
            try { this._mapInstance.remove(); } catch(e) {}
            this._mapInstance = null;
        }
    },
});
