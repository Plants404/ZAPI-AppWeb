const g = require('globals');

/* Los scripts de public/js se cargan como scripts clásicos, uno detrás de
   otro, sin módulos. Todo lo que declaran con const, let o function al
   nivel superior comparte el ámbito global entre los archivos que una
   misma página carga. Esta lista es el contrato de esos nombres. */

const GLOBALES = {
    ADMIN: 'readonly',
    API: 'readonly',
    CONFIG: 'readonly',
    CONTENIDO: 'readonly',
    SESION: 'readonly',
    NEGOCIO: 'readonly',
    slug: 'readonly',

    PRODUCTOS: 'readonly',
    CATEGORIAS: 'readonly',
    obtenerProducto: 'readonly',
    unidadesDe: 'readonly',
    textoDeStock: 'readonly',
    claseDeStock: 'readonly',
    rutaImagen: 'readonly',
    rutaFicha: 'readonly',
    htmlTarjetaProducto: 'readonly',
    cuandoCatalogoListo: 'readonly',
    cargarCatalogo: 'readonly',

    cuandoConfigLista: 'readonly',
    aplicarTextosDeConfiguracion: 'readonly',
    cuandoSesionLista: 'readonly',
    pintarSesion: 'readonly',
    volverALogin: 'readonly',

    IMAGEN_FALLBACK: 'readonly',
    ETIQUETAS_ESTADO: 'readonly',
    ETIQUETAS_METODO_PAGO: 'readonly',
    raizDelSitio: 'readonly',
    rutaConRaiz: 'readonly',
    escaparHTML: 'readonly',
    formatearPrecio: 'readonly',
    formatearFecha: 'readonly',
    formatearFechaCorta: 'readonly',
    etiquetaEstado: 'readonly',
    claseEstado: 'readonly',
    etiquetaMetodoPago: 'readonly',
    normalizarTexto: 'readonly',
    limpiarValor: 'readonly',
    validarCorreo: 'readonly',
    validarTelefono: 'readonly',
    bloquearScroll: 'readonly',
    marcarErrorCampo: 'readonly',
    limpiarErrores: 'readonly',
    mostrarEstadoFormulario: 'readonly',
    mostrarAviso: 'readonly',
    cerrarAviso: 'readonly',
    abrirWhatsApp: 'readonly',

    obtenerCarrito: 'readonly',
    guardarCarrito: 'readonly',
    suscribirAlCarrito: 'readonly',
    calcularTotales: 'readonly',
    agregarProductoAlCarrito: 'readonly',
    cambiarCantidadCarrito: 'readonly',
    quitarDelCarrito: 'readonly',
    vaciarCarrito: 'readonly',
    actualizarContador: 'readonly',

    aplicarBusqueda: 'readonly',
    refrescarCampoBuscador: 'readonly',
    buscarEnElCatalogo: 'readonly',

    cuandoContenidoListo: 'readonly',
    obtenerContenido: 'readonly',
    aplicarContenido: 'readonly',

    mensajeDeError: 'readonly',
    apiPedir: 'readonly',

    adminPedir: 'readonly',
    cuandoAdminListo: 'readonly',
    adminEstado: 'readonly',
    adminPaginar: 'readonly',
    adminAbrirDialogo: 'readonly',
    adminCerrarDialogo: 'readonly',
    adminCerrarDialogoDesde: 'readonly',
    adminHtmlEstado: 'readonly',
    adminEtiquetaEstado: 'readonly',
    adminFecha: 'readonly',
    adminFechaCorta: 'readonly',
    adminFechaISO: 'readonly',
    adminUrlImagen: 'readonly',
    adminMoneda: 'readonly',
    adminNumero: 'readonly',
    adminPorcentaje: 'readonly',
    adminLeerFormulario: 'readonly',
    adminBloquearBoton: 'readonly',
    adminRellenarSelect: 'readonly'
};

/* Nombres que un archivo declara para que los use otro. No son código
   muerto: se declaran acá para que no-unused-vars no los marque en su
   archivo de origen. */
const EXPORTADOS = Object.keys(GLOBALES);

const API_COMPARTIDA = '^(' + EXPORTADOS.join('|') + ')$';

const REGLAS = {
    'no-undef': 'error',
    'no-unused-vars': ['error', { args: 'after-used', caughtErrors: 'none' }],
    'no-var': 'error',
    'no-unreachable': 'error',
    'no-dupe-keys': 'error',
    'no-dupe-args': 'error',
    'no-func-assign': 'error',
    'no-self-compare': 'error',
    'no-unsafe-negation': 'error',
    'no-constant-condition': ['error', { checkLoops: false }],
    eqeqeq: 'warn',
    'no-console': 'off'
};

module.exports = [
    {
        ignores: [
            'node_modules/**',
            'frontend/admin/**',
            'frontend/**/*.html',
            'frontend/public/img/**'
        ]
    },
    {
        files: ['frontend/public/js/**/*.js'],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'script',
            globals: { ...g.browser, ...GLOBALES }
        },
        rules: {
            ...REGLAS,
            'no-unused-vars': ['error', {
                args: 'after-used',
                caughtErrors: 'none',
                varsIgnorePattern: API_COMPARTIDA
            }]
        }
    },
    {
        files: ['frontend/public/js/negocio.js'],
        languageOptions: {
            globals: { module: 'readonly' }
        }
    },
    {
        files: [
            'frontend/tools/**/*.js',
            'frontend/datos/**/*.js',
            'frontend/fuentes/**/*.js',
            'backend/**/*.js',
            'scripts/**/*.js',
            'netlify/**/*.js',
            'e2e/**/*.js',
            'eslint.config.js'
        ],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'commonjs',
            globals: { ...g.node }
        },
        rules: {
            ...REGLAS,
            'no-implicit-globals': 'error'
        }
    }
];
