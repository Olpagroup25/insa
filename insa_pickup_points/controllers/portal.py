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
