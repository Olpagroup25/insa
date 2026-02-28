{
    'name': 'INSA - Portal de Puntos Mejorado',
    'version': '18.0.1.0.0',
    'category': 'Website',
    'summary': 'Mejora visual y traducción del sistema de puntos en el portal web',
    'description': """
        Mejora el popup de puntos de fidelidad y la página de historial
        con un diseño visual mejorado y textos en español.
    """,
    'author': 'INSA / Olpa Group',
    'website': 'https://insa.odoo.com',
    'license': 'LGPL-3',
    'depends': ['loyalty', 'portal', 'website'],
    'data': [
        'views/portal_templates.xml',
    ],
    'assets': {
        'web.assets_frontend': [
            'insa_loyalty_portal/static/src/css/loyalty_portal.css',
            'insa_loyalty_portal/static/src/js/portal/**/*',
        ],
    },
    'installable': True,
    'application': False,
    'auto_install': False,
}
