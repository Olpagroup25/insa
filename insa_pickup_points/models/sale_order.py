from odoo import api, fields, models


class SaleOrder(models.Model):
    _inherit = 'sale.order'

    @api.onchange('carrier_id')
    def _onchange_carrier_pickup_point(self):
        """Cuando se selecciona un carrier con punto de retiro,
        actualizar la dirección de entrega al partner del punto de retiro."""
        for order in self:
            if order.carrier_id and order.carrier_id.pickup_partner_id:
                order.partner_shipping_id = order.carrier_id.pickup_partner_id
