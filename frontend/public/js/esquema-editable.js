'use strict';

/* global module */

/* Qué se puede editar del sitio desde "Estilo del sitio".
   Lo comparten el panel (para armar el formulario), el sitio público (para
   aplicar el contenido publicado) y el servidor (para validar). Cada campo
   dice dónde está en la página (selector) y de qué tipo es:
     texto    una línea
     parrafo  varias líneas
     imagen   una imagen subida a la biblioteca, con su descripción (alt)
   Los textos originales se leen de la propia página; solo se guarda lo que
   la persona cambia. */
(function (raiz, fabrica) {
    const esquema = fabrica();
    if (typeof module === 'object' && module.exports) module.exports = esquema;
    else raiz.ESQUEMA_EDITABLE = esquema;
})(typeof self !== 'undefined' ? self : this, function () {
    const texto = (id, etiqueta, selector, max) => ({ id, tipo: 'texto', etiqueta, selector, max: max || 160 });
    const parrafo = (id, etiqueta, selector, max) => ({ id, tipo: 'parrafo', etiqueta, selector, max: max || 400 });
    const imagen = (id, etiqueta, selector, ayuda) => ({ id, tipo: 'imagen', etiqueta, selector, ayuda: ayuda || '' });

    const tarjetasServicios = [];
    for (let n = 1; n <= 8; n += 1) {
        tarjetasServicios.push(
            texto('titulo' + n, 'Servicio ' + n + ' · título', '.servicios-grid > :nth-child(' + n + ') h3', 80),
            parrafo('texto' + n, 'Servicio ' + n + ' · descripción', '.servicios-grid > :nth-child(' + n + ') p', 240)
        );
    }

    const paginas = [
        {
            id: 'inicio', archivo: 'index.html', titulo: 'Inicio', icono: 'home',
            secciones: [
                {
                    id: 'portada', titulo: 'Portada',
                    campos: [
                        texto('titulo', 'Título', '.hero-copy h1', 120),
                        parrafo('texto', 'Texto de apoyo', '.hero-lead', 300),
                        texto('boton', 'Botón principal', '.hero-ctas .boton-primario', 40),
                        texto('boton2', 'Botón secundario', '.hero-ctas .boton-secundario', 40),
                        imagen('imagen', 'Imagen de portada', '.hero-visual', 'Horizontal, 1600 × 1000 px. Se reduce sola al subirla.')
                    ]
                },
                {
                    id: 'destacados', titulo: 'Productos destacados',
                    campos: [texto('titulo', 'Título', '.destacados .carousel-header h2', 80)]
                },
                {
                    id: 'testimonios', titulo: 'Testimonios',
                    campos: [
                        texto('titulo', 'Título', '#testimonios .testimonios-cabecera h2', 100),
                        parrafo('texto', 'Bajada', '#testimonios .testimonios-cabecera p', 200)
                    ]
                }
            ]
        },
        {
            id: 'catalogo', archivo: 'catalogo.html', titulo: 'Catálogo', icono: 'eco',
            secciones: [
                {
                    id: 'encabezado', titulo: 'Encabezado',
                    campos: [
                        texto('etiqueta', 'Etiqueta', '.catalog-eyebrow', 40),
                        texto('titulo', 'Título', '.catalog-title', 60),
                        parrafo('texto', 'Texto de apoyo', '.catalog-lead', 240)
                    ]
                }
            ]
        },
        {
            id: 'servicios', archivo: 'servicios.html', titulo: 'Servicios', icono: 'auto_awesome',
            secciones: [
                {
                    id: 'banner', titulo: 'Banner',
                    campos: [
                        texto('titulo', 'Título', '.banner-pagina h1', 100),
                        parrafo('texto', 'Bajada', '.banner-pagina > div > p', 260)
                    ]
                },
                {
                    id: 'servicios', titulo: 'Servicios',
                    campos: [
                        texto('titulo', 'Título de la sección', '#tituloServicios', 100),
                        parrafo('texto', 'Bajada', '.servicios .seccion-cabecera p', 240)
                    ]
                },
                { id: 'tarjetas', titulo: 'Tarjetas de servicios', campos: tarjetasServicios },
                {
                    id: 'cierre', titulo: 'Cierre',
                    campos: [
                        texto('titulo', 'Título', '.servicios-cierre h2', 120),
                        parrafo('texto', 'Texto', '.servicios-cierre p', 240),
                        texto('boton', 'Botón', '.servicios-cierre .boton', 40)
                    ]
                }
            ]
        },
        {
            id: 'nosotros', archivo: 'nosotros.html', titulo: 'Nosotros', icono: 'group',
            secciones: [
                {
                    id: 'banner', titulo: 'Banner',
                    campos: [
                        texto('titulo', 'Título', '.banner-nosotros h1', 140),
                        parrafo('texto', 'Bajada', '.banner-nosotros > div > p', 260)
                    ]
                },
                {
                    id: 'problema', titulo: 'El problema',
                    campos: [
                        texto('titulo', 'Título', '.panel-problema h2', 120),
                        parrafo('texto', 'Texto', '.panel-problema > p', 400)
                    ]
                },
                {
                    id: 'solucion', titulo: 'La solución',
                    campos: [
                        texto('titulo', 'Título', '.panel-solucion h2', 120),
                        parrafo('texto', 'Texto', '.panel-solucion > p', 400)
                    ]
                },
                {
                    id: 'foto', titulo: 'Foto principal',
                    campos: [imagen('imagen', 'Foto', '.nosotros-foto img', 'Horizontal, 1200 × 800 px.')]
                },
                {
                    id: 'pilares', titulo: 'Pilares',
                    campos: [texto('titulo', 'Título', '#tituloPilares', 100)]
                },
                {
                    id: 'razones', titulo: 'Razones',
                    campos: [texto('titulo', 'Título', '#tituloRazones', 100)]
                },
                {
                    id: 'equipo', titulo: 'Equipo',
                    campos: [texto('titulo', 'Título', '#tituloEquipo', 100)]
                },
                {
                    id: 'ubicacion', titulo: 'Ubicación',
                    campos: [texto('titulo', 'Título', '#tituloUbicacion', 100)]
                }
            ]
        },
        {
            id: 'contacto', archivo: 'contacto.html', titulo: 'Contacto', icono: 'mail',
            secciones: [
                {
                    id: 'banner', titulo: 'Banner',
                    campos: [
                        texto('titulo', 'Título', '.banner-pagina h1', 100),
                        parrafo('texto', 'Bajada', '.banner-pagina > div > p', 260)
                    ]
                },
                {
                    id: 'info', titulo: 'Atención directa',
                    campos: [
                        texto('titulo', 'Título', '.contacto-info h2', 100),
                        parrafo('texto', 'Texto', '.contacto-info > p', 260)
                    ]
                },
                {
                    id: 'formulario', titulo: 'Formulario',
                    campos: [texto('titulo', 'Título', '.contacto-card-cabecera h2', 100)]
                }
            ]
        },
        {
            id: 'carrito', archivo: 'carrito.html', titulo: 'Carrito', icono: 'shopping_bag',
            secciones: [
                {
                    id: 'carrito', titulo: 'Carrito',
                    campos: [
                        texto('titulo', 'Título', '.cart-heading h1', 60),
                        texto('vacioTitulo', 'Mensaje de carrito vacío', '.empty-cart h2', 80),
                        parrafo('vacioTexto', 'Texto de carrito vacío', '.empty-cart p', 240)
                    ]
                },
                {
                    id: 'recomendaciones', titulo: 'Recomendaciones',
                    campos: [texto('titulo', 'Título', '#tituloRecomendaciones', 100)]
                }
            ]
        }
    ];

    function buscarPagina(id) {
        return paginas.find(pagina => pagina.id === id) || null;
    }

    function buscarPaginaPorArchivo(archivo) {
        const nombre = (archivo || '').split('/').pop() || 'index.html';
        return paginas.find(pagina => pagina.archivo === nombre) || null;
    }

    function buscarCampo(paginaId, seccionId, campoId) {
        const pagina = buscarPagina(paginaId);
        const seccion = pagina && pagina.secciones.find(s => s.id === seccionId);
        return (seccion && seccion.campos.find(c => c.id === campoId)) || null;
    }

    return { paginas, buscarPagina, buscarPaginaPorArchivo, buscarCampo };
});
