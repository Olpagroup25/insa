# -*- coding: utf-8 -*-
{
    'name': 'INSA Website',
    'version': '18.0.1.0.0',
    'category': 'Website',
    'summary': 'Sitio web institucional de INSA - Agua Pura y Segura',
    'description': """
INSA Website - Agua y Soda
==========================

Este módulo implementa el sitio web institucional de INSA, 
empresa líder en distribución de agua y soda con 40 años de trayectoria.

Características:
----------------
* Página de inicio con propuesta de valor
* Catálogo de productos retornables y descartables
* Listas de precios por unidad, promociones, mayorista y pallets
* Integración con WhatsApp para pedidos
* Información de contacto y redes sociales
* Diseño responsive y moderno
* Snippets arrastrables para el Website Builder
    """,
    'author': 'INSA / Olpa Group',
    'website': 'https://www.aguainsa.com',
    'depends': ['website'],
    'data': [
        'views/website_templates.xml',
        'views/snippets.xml',
        'data/website_data.xml',
    ],
    'assets': {
        'web.assets_frontend': [
            'insa_website/static/src/css/insa_style.css',
        ],
    },
    'images': ['static/description/banner.png'],
    'installable': True,
    'application': False,
    'auto_install': False,
    'license': 'LGPL-3',
}
