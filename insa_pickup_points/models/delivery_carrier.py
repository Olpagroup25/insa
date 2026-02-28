from odoo import api, fields, models


class DeliveryCarrier(models.Model):
    _inherit = 'delivery.carrier'

    is_pickup_point = fields.Boolean(
        string='Punto de Retiro',
        default=False,
        help='Marcar si este método de entrega es un punto de retiro externo.',
    )
    pickup_partner_id = fields.Many2one(
        comodel_name='res.partner',
        string='Contacto del Punto de Retiro',
        help='Contacto del negocio externo que actúa como punto de retiro. '
             'Este partner podrá acceder al portal para confirmar entregas.',
    )
    pickup_hours = fields.Text(
        string='Horarios de Atención',
        help='Horarios de atención del punto de retiro. Ejemplo:\n'
             'Lunes a Viernes: 8:00 - 18:00\n'
             'Sábados: 9:00 - 13:00',
    )
