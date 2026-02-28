from odoo import fields, models


class StockPicking(models.Model):
    _inherit = 'stock.picking'

    pickup_partner_id = fields.Many2one(
        comodel_name='res.partner',
        string='Punto de Retiro',
        related='carrier_id.pickup_partner_id',
        store=True,
        readonly=True,
        help='Partner del punto de retiro asociado al método de entrega.',
    )
    pickup_confirmed = fields.Boolean(
        string='Confirmado por Punto de Retiro',
        default=False,
        copy=False,
        help='Indica que el punto de retiro confirmó la entrega al cliente.',
    )
    pickup_confirmed_date = fields.Datetime(
        string='Fecha de Confirmación',
        copy=False,
        readonly=True,
    )
    pickup_confirmed_by = fields.Many2one(
        comodel_name='res.users',
        string='Confirmado por',
        copy=False,
        readonly=True,
    )

    def action_pickup_confirm(self):
        """Confirma la entrega desde el portal del punto de retiro."""
        for picking in self:
            picking.write({
                'pickup_confirmed': True,
                'pickup_confirmed_date': fields.Datetime.now(),
                'pickup_confirmed_by': self.env.uid,
            })
        return True
