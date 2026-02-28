{
    'name': 'INSA - Puntos de Retiro',
    'version': '18.0.1.0.0',
    'summary': 'Portal para puntos de retiro: confirmar entregas desde website',
    'description': """
        Módulo para gestionar puntos de retiro de INSA.
        - Asocia un contacto (partner) a cada método de entrega (delivery.carrier).
        - Permite que el partner del punto de retiro acceda al portal web.
        - El punto de retiro puede ver las órdenes de entrega asignadas y confirmarlas.
    """,
    'author': 'INSA / Olpa Group',
    'website': 'https://www.aguainsa.com',
    'category': 'Website/Website',
    'license': 'LGPL-3',
    'depends': [
        'delivery',
        'stock',
        'portal',
        'website',
        'website_sale',
    ],
    'data': [
        'security/ir.model.access.csv',
        'security/security.xml',
        'views/delivery_carrier_views.xml',
        'views/stock_picking_views.xml',
        'views/portal_templates.xml',
    ],
    'assets': {
        'web.assets_frontend': [
            'insa_pickup_points/static/src/css/pickup_portal.css',
        ],
    },
    'installable': True,
    'application': False,
    'auto_install': False,
}
