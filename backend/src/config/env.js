'use strict';
/* ==========================================================
   CONFIGURACION
   ------------------------------------------------------------
   Centraliza todo lo que sale del entorno, con valores por
   defecto para que el servidor arranque sin un .env en
   desarrollo. El .env lo carga el script npm (lleva
   --env-file-if-exists=.env); Node no lo lee solo.

   Se valida al iniciar y se falla con un mensaje claro si falta
   algo imprescindible. El unico requisito duro es MONGODB_URI en
   produccion: en cualquier otro lado hay un default local y
   avisar de mas solo molesta.
   ========================================================== */

const ENTORNOS = ['development', 'test', 'production'];
const MONGO_POR_DEFECTO = 'mongodb://127.0.0.1:27017/zapi';
const PUERTO_POR_DEFECTO = 5501;

/* Un entero de entorno, o el default si no esta / no es numero.
   No tira: una variable de ajuste mal escrita no deberia tumbar
   el arranque, y el default es razonable. */
function leerEntero(nombre, porDefecto) {
    const crudo = process.env[nombre];

    if (crudo === undefined || crudo === '') return porDefecto;

    const numero = Number(crudo);

    return Number.isInteger(numero) && numero >= 0 ? numero : porDefecto;
}

/* Lista separada por comas, sin espacios y sin vacios. Se usa para
   los origenes autorizados de CORS. */
function leerLista(nombre) {
    const crudo = (process.env[nombre] || '').trim();

    if (!crudo) return [];

    return crudo
        .split(',')
        .map(valor => valor.trim())
        .filter(Boolean);
}

function construir() {
    const entorno = (process.env.NODE_ENV || 'development').trim();

    if (!ENTORNOS.includes(entorno)) {
        throw new Error(
            `NODE_ENV="${entorno}" no es valido. Usa uno de: ${ENTORNOS.join(', ')}.`
        );
    }

    const esProduccion = entorno === 'production';
    const mongoUri = (process.env.MONGODB_URI || '').trim();

    /* En produccion la base es obligatoria: arrancar contra el
       Mongo local de una maquina que no lo tiene deja al servidor
       escuchando sin poder guardar nada, que es peor que no
       arrancar. */
    if (esProduccion && !mongoUri) {
        throw new Error(
            'Falta MONGODB_URI. En produccion hay que definir la cadena de ' +
            'conexion de MongoDB (ver .env.example).'
        );
    }

    const puerto = leerEntero('PORT', PUERTO_POR_DEFECTO);

    if (puerto < 1 || puerto > 65535) {
        throw new Error(`PORT="${puerto}" fuera de rango (1-65535).`);
    }

    return {
        entorno,
        esProduccion,
        esTest: entorno === 'test',
        puerto,
        mongoUri: mongoUri || MONGO_POR_DEFECTO,

        /* Origenes para CORS. Vacio = solo mismo origen, que es el
           caso normal: el propio Express sirve el sitio. */
        origenes: leerLista('CLIENT_URL'),

        /* Rate limiting por IP y ventana. Las pruebas los suben
           desde el entorno para no comerse un 429 a mitad de
           camino. */
        limiteLectura: leerEntero('ZAPI_LIMITE_LECTURA', 120),
        limiteEscritura: leerEntero('ZAPI_LIMITE_ESCRITURA', 20),

        /* Tiempos de Mongo, en ms. */
        mongoTimeout: leerEntero('ZAPI_MONGO_TIMEOUT', 30000),
    };
}

module.exports = construir();
