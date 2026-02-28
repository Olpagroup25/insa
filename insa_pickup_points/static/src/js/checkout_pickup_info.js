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
    if (leafletLoaded) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        // CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = '';
        document.head.appendChild(link);

        // JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        script.crossOrigin = '';
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
    const url = `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(address)}&format=json&limit=1`;
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

        const btn = ev.currentTarget;
        const carrierId = parseInt(btn.dataset.carrierId);
        if (!carrierId) return;

        // Show modal
        const modalEl = document.getElementById('insaPickupInfoModal');
        if (!modalEl) return;

        // Bootstrap modal
        let bsModal = window.bootstrap?.Modal?.getInstance(modalEl);
        if (!bsModal) {
            bsModal = new window.bootstrap.Modal(modalEl);
        }
        bsModal.show();

        // Show loading, hide content
        const loading = document.getElementById('insaPickupLoading');
        const content = document.getElementById('insaPickupContent');
        loading?.classList.remove('d-none');
        content?.classList.add('d-none');

        // Fetch data via JSON RPC
        let data;
        try {
            data = await rpc(`/shop/pickup_point_info/${carrierId}`, {});
        } catch (e) {
            console.error('INSA Pickup: RPC error', e);
            loading.innerHTML = `
                <div class="text-center py-4 text-danger">
                    <i class="fa fa-exclamation-triangle fa-2x mb-2"></i>
                    <p>Error al cargar la información.</p>
                </div>`;
            return;
        }

        if (data.error) {
            loading.innerHTML = `
                <div class="text-center py-4 text-warning">
                    <i class="fa fa-info-circle fa-2x mb-2"></i>
                    <p>Este método de entrega no tiene punto de retiro configurado.</p>
                </div>`;
            return;
        }

        // Populate modal fields
        this._populateModal(data);

        // Show content, hide loading
        loading?.classList.add('d-none');
        content?.classList.remove('d-none');

        // Load Leaflet & render map
        await this._renderMap(data);
    },

    _populateModal(data) {
        // Header carrier name
        const carrierNameEl = document.getElementById('insaPickupCarrierName');
        if (carrierNameEl) carrierNameEl.textContent = data.carrier_name;

        // Partner name
        const partnerNameEl = document.getElementById('insaPickupPartnerName');
        if (partnerNameEl) partnerNameEl.textContent = data.partner_name;

        // Address
        const addr1 = document.getElementById('insaPickupAddress1');
        const addr2 = document.getElementById('insaPickupAddress2');
        if (addr1) addr1.textContent = data.address_line1;
        if (addr2) addr2.textContent = data.address_line2;

        // Phone
        const phoneRow = document.getElementById('insaPickupPhoneRow');
        const phoneEl = document.getElementById('insaPickupPhone');
        if (data.phone) {
            phoneRow?.classList.remove('d-none');
            if (phoneEl) {
                phoneEl.textContent = data.phone;
                phoneEl.href = `tel:${data.phone}`;
            }
        } else {
            phoneRow?.classList.add('d-none');
        }

        // Email
        const emailRow = document.getElementById('insaPickupEmailRow');
        const emailEl = document.getElementById('insaPickupEmail');
        if (data.email) {
            emailRow?.classList.remove('d-none');
            if (emailEl) {
                emailEl.textContent = data.email;
                emailEl.href = `mailto:${data.email}`;
            }
        } else {
            emailRow?.classList.add('d-none');
        }

        // Hours
        const hoursCard = document.getElementById('insaPickupHoursCard');
        const noHoursCard = document.getElementById('insaPickupNoHoursCard');
        const hoursEl = document.getElementById('insaPickupHours');
        if (data.pickup_hours) {
            hoursCard?.classList.remove('d-none');
            noHoursCard?.classList.add('d-none');
            if (hoursEl) hoursEl.textContent = data.pickup_hours;
        } else {
            hoursCard?.classList.add('d-none');
            noHoursCard?.classList.remove('d-none');
        }

        // Google Maps external link
        const mapLink = document.getElementById('insaPickupMapLink');
        if (mapLink) {
            const q = encodeURIComponent(data.full_address);
            mapLink.href = `https://www.google.com/maps/search/?api=1&query=${q}`;
        }
    },

    async _renderMap(data) {
        try {
            await loadLeaflet();
        } catch (e) {
            console.warn('INSA Pickup: Could not load Leaflet', e);
            const mapEl = document.getElementById('insaPickupMap');
            if (mapEl) {
                mapEl.innerHTML = `
                    <div class="text-center py-4 text-muted">
                        <i class="fa fa-map fa-2x mb-2"></i>
                        <p>No se pudo cargar el mapa.</p>
                    </div>`;
            }
            return;
        }

        // Destroy existing map
        if (this._mapInstance) {
            this._mapInstance.remove();
            this._mapInstance = null;
        }

        const mapEl = document.getElementById('insaPickupMap');
        if (!mapEl) return;

        // Clear map container
        mapEl.innerHTML = '';

        // Get coordinates: use stored lat/lng or geocode
        let coords = null;
        if (data.latitude && data.longitude && data.latitude !== 0 && data.longitude !== 0) {
            coords = { lat: data.latitude, lng: data.longitude };
        } else if (data.full_address) {
            coords = await geocodeAddress(data.full_address);
        }

        if (!coords) {
            mapEl.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="fa fa-map-marker fa-2x mb-2"></i>
                    <p>No se pudo determinar la ubicación en el mapa.</p>
                    <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.full_address)}"
                       target="_blank" class="btn btn-sm btn-outline-primary">
                        <i class="fa fa-external-link me-1"></i>Buscar en Google Maps
                    </a>
                </div>`;
            return;
        }

        // Create Leaflet map
        const map = L.map(mapEl).setView([coords.lat, coords.lng], 16);
        this._mapInstance = map;

        // OpenStreetMap tiles (free)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
            maxZoom: 19,
        }).addTo(map);

        // Custom marker with INSA colors
        const markerIcon = L.divIcon({
            className: 'insa-map-marker-icon',
            html: `<div class="insa-map-marker">
                       <i class="fa fa-map-marker"></i>
                   </div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -42],
        });

        // Add marker with popup
        const marker = L.marker([coords.lat, coords.lng], { icon: markerIcon }).addTo(map);
        marker.bindPopup(`
            <div class="insa-map-popup">
                <strong>${data.partner_name}</strong><br/>
                <small>${data.address_line1}</small>
            </div>
        `).openPopup();

        // Fix map resize when modal is shown
        setTimeout(() => map.invalidateSize(), 300);
    },
});
