const g = require('globals');

/* Los scripts de public/js se cargan como scripts clásicos, uno detrás de
   otro, sin módulos. Todo lo que declaran con const, let o function al
   nivel superior comparte el ámbito global entre los archivos que una
   misma página carga. Esta lista es el contrato de esos nombres. */

const GLOBALES = {
    NEGOCIO: 'readonly',
    slug: 'readonly',
    formatearPrecio: 'readonly',
    textoDeStock: 'readonly',
    claseDeStock: 'readonly',

    IMAGEN_FALLBACK: 'readonly',
    raizDelSitio: 'readonly',
    rutaConRaiz: 'readonly',
    escaparHTML: 'readonly',
    formatearFecha: 'readonly',
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
    URL_EMAILJS: 'readonly',
    enviarCorreoEmailJS: 'readonly',

    PRODUCTOS: 'readonly',
    CATEGORIAS: 'readonly',
    obtenerProducto: 'readonly',
    unidadesDe: 'readonly',
    fotosDeProducto: 'readonly',
    rutaFicha: 'readonly',
    htmlTarjetaProducto: 'readonly',

    CLAVE_CARRITO: 'readonly',
    obtenerCarrito: 'readonly',
    calcularTotales: 'readonly',
    agregarProductoAlCarrito: 'readonly',
    cambiarCantidadCarrito: 'readonly',
    quitarDelCarrito: 'readonly',
    vaciarCarrito: 'readonly',
    actualizarContador: 'readonly',
    suscribirAlCarrito: 'readonly',

    CLAVE_PEDIDOS: 'readonly',
    LIMITE_PEDIDOS: 'readonly',
    ESTADOS_PEDIDO: 'readonly',
    armarPedido: 'readonly',
    guardarPedido: 'readonly',
    obtenerPedidos: 'readonly',
    mensajeDePedido: 'readonly',
    textoEstadoPedido: 'readonly',
    eliminarPedido: 'readonly',
    vaciarPedidos: 'readonly',

    aplicarBusqueda: 'readonly',
    buscarEnElCatalogo: 'readonly',
    refrescarCampoBuscador: 'readonly'
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
