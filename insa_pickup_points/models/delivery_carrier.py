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
    pickup_hours = fields.Text(
        string='Horarios de Atención',
        help='Horarios de atención del punto de retiro. Ejemplo:\n'
             'Lunes a Viernes: 8:00 - 18:00\n'
             'Sábados: 9:00 - 13:00',
    )

    @api.depends('pickup_partner_id')
    def _compute_is_pickup_point(self):
        for carrier in self:
            carrier.is_pickup_point = bool(carrier.pickup_partner_id)
