from odoo import http
from odoo.http import request
from odoo.addons.portal.controllers.portal import CustomerPortal


class PickupPointPortal(CustomerPortal):
    """Portal para que los puntos de retiro vean y confirmen entregas."""

    def _prepare_home_portal_values(self, counters):
        values = super()._prepare_home_portal_values(counters)
        if 'pickup_count' in counters:
            partner = request.env.user.partner_id
            pickup_count = request.env['stock.picking'].sudo().search_count([
                ('pickup_partner_id', '=', partner.id),
                ('state', 'in', ['assigned', 'done']),
            ])
            values['pickup_count'] = pickup_count
        return values

    # ------------------------------------------------------------------
    # JSON: pickup point info for checkout popup
    # ------------------------------------------------------------------
    @http.route(
        '/shop/pickup_point_info/<int:carrier_id>',
        type='json', auth='public', website=True,
    )
    def pickup_point_info(self, carrier_id, **kw):
        """Return pickup point info for a delivery carrier (used in checkout popup)."""
        carrier = request.env['delivery.carrier'].sudo().browse(carrier_id)
        if not carrier.exists() or not carrier.is_pickup_point:
            return {'error': True}

        partner = carrier.pickup_partner_id
        # Build address parts
        street = partner.street or ''
        street2 = partner.street2 or ''
        city = partner.city or ''
        state = partner.state_id.name if partner.state_id else ''
        zip_code = partner.zip or ''
        country = partner.country_id.name if partner.country_id else ''

        address_parts = [p for p in [street, street2] if p]
        locality_parts = [p for p in [zip_code, city] if p]
        region_parts = [p for p in [state, country] if p]

        address_line1 = ', '.join(address_parts)
        address_line2 = ' '.join(locality_parts)
        if region_parts:
            address_line2 += (', ' if address_line2 else '') + ', '.join(region_parts)

        # Full address for map query
        full_address = ', '.join([p for p in [street, city, state, country] if p])

        return {
            'error': False,
            'carrier_name': carrier.name,
            'partner_name': partner.name or '',
            'phone': partner.phone or partner.mobile or '',
            'email': partner.email or '',
            'address_line1': address_line1,
            'address_line2': address_line2,
            'full_address': full_address,
            'pickup_hours': carrier.pickup_hours or '',
            'partner_image_url': f'/web/image/res.partner/{partner.id}/avatar_128',
            'latitude': partner.partner_latitude or 0,
            'longitude': partner.partner_longitude or 0,
        }

    # ------------------------------------------------------------------
    # List: /my/pickup/orders
    # ------------------------------------------------------------------
    @http.route(
        ['/my/pickup/orders', '/my/pickup/orders/page/<int:page>'],
        type='http', auth='user', website=True,
    )
    def portal_pickup_orders(self, page=1, sortby=None, filterby=None, **kw):
        partner = request.env.user.partner_id
        StockPicking = request.env['stock.picking'].sudo()

        # Sorting
        searchbar_sortings = {
            'date': {'label': 'Fecha más reciente', 'order': 'scheduled_date desc'},
            'name': {'label': 'Referencia', 'order': 'name asc'},
            'state': {'label': 'Estado', 'order': 'state asc'},
        }
        if not sortby:
            sortby = 'date'
        order = searchbar_sortings[sortby]['order']

        # Filtering
        searchbar_filters = {
            'all': {'label': 'Todos', 'domain': []},
            'pending': {'label': 'Pendientes', 'domain': [('pickup_confirmed', '=', False)]},
            'confirmed': {'label': 'Confirmados', 'domain': [('pickup_confirmed', '=', True)]},
        }
        if not filterby:
            filterby = 'pending'
        domain = searchbar_filters[filterby]['domain']

        # Base domain
        base_domain = [
            ('pickup_partner_id', '=', partner.id),
            ('state', 'in', ['assigned', 'done']),
        ]
        domain = base_domain + domain

        # Count & pager
        total_count = StockPicking.search_count(domain)
        pager = request.website.pager(
            url='/my/pickup/orders',
            total=total_count,
            page=page,
            step=20,
            url_args={'sortby': sortby, 'filterby': filterby},
        )

        # Records
        pickings = StockPicking.search(
            domain, order=order, limit=20, offset=pager['offset'],
        )

        values = {
            'pickings': pickings,
            'page_name': 'pickup_orders',
            'pager': pager,
            'default_url': '/my/pickup/orders',
            'searchbar_sortings': searchbar_sortings,
            'sortby': sortby,
            'searchbar_filters': searchbar_filters,
            'filterby': filterby,
        }
        return request.render('insa_pickup_points.portal_pickup_orders', values)

    # ------------------------------------------------------------------
    # Detail: /my/pickup/orders/<int:picking_id>
    # ------------------------------------------------------------------
    @http.route(
        ['/my/pickup/orders/<int:picking_id>'],
        type='http', auth='user', website=True,
    )
    def portal_pickup_order_detail(self, picking_id, **kw):
        partner = request.env.user.partner_id
        picking = request.env['stock.picking'].sudo().browse(picking_id)

        # Security: only allow access to own pickings
        if not picking.exists() or picking.pickup_partner_id.id != partner.id:
            return request.redirect('/my/pickup/orders')

        values = {
            'picking': picking,
            'page_name': 'pickup_order_detail',
        }
        return request.render('insa_pickup_points.portal_pickup_order_detail', values)

    # ------------------------------------------------------------------
    # Confirm delivery: POST /my/pickup/orders/<int:picking_id>/confirm
    # ------------------------------------------------------------------
    @http.route(
        ['/my/pickup/orders/<int:picking_id>/confirm'],
        type='http', auth='user', website=True, methods=['POST'],
    )
    def portal_pickup_order_confirm(self, picking_id, **post):
        partner = request.env.user.partner_id
        picking = request.env['stock.picking'].sudo().browse(picking_id)

        # Security: only allow access to own pickings
        if not picking.exists() or picking.pickup_partner_id.id != partner.id:
            return request.redirect('/my/pickup/orders')

        # Only confirm if not already confirmed
        if not picking.pickup_confirmed:
            picking.action_pickup_confirm()

        return request.redirect(f'/my/pickup/orders/{picking_id}?confirmed=1')
