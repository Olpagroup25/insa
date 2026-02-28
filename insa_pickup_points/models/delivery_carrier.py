from odoo import api, fields, models


class DeliveryCarrier(models.Model):
    _inherit = 'delivery.carrier'

    pickup_partner_id = fields.Many2one(
        comodel_name='res.partner',
        string='Punto de Retiro',
        help='Contacto del negocio externo que actúa como punto de retiro. '
             'Este partner podrá acceder al portal para confirmar entregas.',
    )
    is_pickup_point = fields.Boolean(
        string='Es Punto de Retiro',
        compute='_compute_is_pickup_point',
        store=True,
    )

    @api.depends('pickup_partner_id')
    def _compute_is_pickup_point(self):
        for carrier in self:
            carrier.is_pickup_point = bool(carrier.pickup_partner_id)
