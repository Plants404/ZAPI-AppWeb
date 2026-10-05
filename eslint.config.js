const g = require('globals');

/* Los scripts de public/js se cargan con <script> clasicos, uno detras
   de otro, sin modulos. Por eso todo lo que productos.js declara con
   "const" o "function" al nivel superior queda disponible en todos los
   que se cargan despues. ESLint, que analiza archivo por archivo, ve
   esos nombres como no definidos y los marca.

   La lista de abajo es el contrato entre los scripts: si se cambia,
   hay que cambiarla aca. No es una lista de globals de navegador, son
   los nombres que produce productos.js y consume el resto. */

/* Todo esto nace en productos.js. */
const DEL_CATALOGO = {
    PRODUCTOS: 'readonly',
    precios: 'readonly',
    formatearPrecio: 'readonly',
    escaparHTML: 'readonly',
    obtenerCarrito: 'readonly',
    guardarCarrito: 'readonly',
    actualizarContador: 'readonly',
    agregarProductoAlCarrito: 'readonly',
    suscribirAlCarrito: 'readonly',
    IMAGEN_FALLBACK: 'readonly',
    alCargarElCatalogo: 'readonly',
};

const COMUNES = {
    ...g.browser,
    ...DEL_CATALOGO,
};

/* Esos mismos nombres, como patron para no-unused-vars. productos.js
   los DECLARA pero no los USA: los usan los otros scripts. Sin esto el
   linter los daria por muertos ahi, que es un falso positivo. El
   patron se arma desde la lista de arriba para no mantenerla dos
   veces: si se agrega un nombre al contrato, queda covered solo. */
const API_DEL_CATALOGO = '^(' + Object.keys(DEL_CATALOGO).join('|') + ')$';

/* El mismo set para el sitio y para las herramientas. */
const REGLAS_SITIO = {
    /* El motivo de tener ESLint: un nombre mal escrito que nadie
       declara rompe la pagina en silencio, porque el error sale solo
       cuando se ejecuta ese camino. */
    'no-undef': 'error',
    'no-unused-vars': ['error', { args: 'after-used', caughtErrors: 'none' }],
    /* No hay var en todo el repo, asi que no cuesta nada. */
    'no-var': 'error',
    /* Codigo inalcanzable siempre es un error de tipeo: un return
       antes de un console.log, un break que no hace falta. */
    'no-unreachable': 'error',
    'no-dupe-keys': 'error',
    'no-dupe-args': 'error',
    'no-func-assign': 'error',
    'no-self-compare': 'error',
    'no-unsafe-negation': 'error',
    'no-constant-condition': ['error', { checkLoops: false }],
    /* Aviso, no error: hay 6 == por revisar y no vale la pena romper
       el build por eso todavia. */
    'eqeqeq': 'warn',
    /* Todo lo que escriben estas herramientas es para que lo lea una
       persona por consola. En el sitio tampoco hay console, asi que la
       regla no aporta nada aca. */
    'no-console': 'off',
};

module.exports = [
    /* Los que se sirven al navegador.

       Un solo bloque para todos, sin excepciones por archivo: los
       nombres de DEL_CATALOGO estan declarados como globales de solo
       lectura y productos.js los define. Eso antes lo reportaba
       no-implicit-globals como redeclaracion, pero esa regla esta
       apagada aca a proposito: que los scripts compartan el ambito
       global es justamente como funciona este sitio. */
    {
        files: ['public/js/**/*.js'],
        languageOptions: {
            ecmaVersion: 2024,
            /* 'script' y no 'module': son scripts clasicos, se comparte
               el ambito global entre ellos. */
            sourceType: 'script',
            globals: COMUNES,
        },
        rules: {
            ...REGLAS_SITIO,
            'no-unused-vars': ['error', {
                args: 'after-used',
                caughtErrors: 'none',
                varsIgnorePattern: API_DEL_CATALOGO,
            }],
        },
    },

    /* Las herramientas, el servidor y esta misma config: CommonJS. */
    {
        files: ['tools/**/*.js', 'server.js', 'server/**/*.js',
            'datos/**/*.js', 'modelo/**/*.js', 'eslint.config.js'],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'commonjs',
            globals: { ...g.node },
        },
        rules: {
            ...REGLAS_SITIO,
            /* Aca si aplica: nada de esto comparte ambito con nadie. */
            'no-implicit-globals': 'error',
        },
    },
];
