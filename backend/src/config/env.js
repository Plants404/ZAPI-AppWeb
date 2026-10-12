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

/* Un decimal de entorno, o el default si no esta / no es numero.
   Se usa para el umbral de reutilizacion de FAQ y se recorta al
   rango [0, 1] porque fuera de ahi no significa nada. */
function leerDecimal(nombre, porDefecto) {
    const crudo = process.env[nombre];

    if (crudo === undefined || crudo === '') return porDefecto;

    const numero = Number(crudo);

    if (!Number.isFinite(numero)) return porDefecto;

    return Math.min(1, Math.max(0, numero));
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

    const sesionSecreto = (process.env.ZAPI_SESSION_SECRET || '').trim() || null;

    /* La cookie de sesion se firma con esto. En produccion no se
       arranca sin el: si fuera aleatorio por proceso, todas las
       sesiones de los clientes moririan en el proximo reinicio, que
       es tirar carritos a la basura. En desarrollo se puede llevar
       vacio y el middleware genera uno efimero (con aviso). */
    if (esProduccion && !sesionSecreto) {
        throw new Error(
            'Falta ZAPI_SESSION_SECRET. Define una cadena larga y aleatoria ' +
            '(ver .env.example).'
        );
    }

    const adminToken = (process.env.ZAPI_ADMIN_TOKEN || '').trim() || null;

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
        sesionSecreto,
        adminToken,

        /* Origenes para CORS. Vacio = solo mismo origen, que es el
           caso normal: el propio Express sirve el sitio. */
        origenes: leerLista('CLIENT_URL'),

        /* Rate limiting por IP y ventana. Las pruebas los suben
           desde el entorno para no comerse un 429 a mitad de
           camino. */
        limiteLectura: leerEntero('ZAPI_LIMITE_LECTURA', 120),
        limiteEscritura: leerEntero('ZAPI_LIMITE_ESCRITURA', 20),

        /* Limite del chat del asistente. Va aparte del de escritura
           porque el chat mueve mas y conviene cortar antes de que
           alguien lo use para llenar la base de eventos. */
        limiteChat: leerEntero('ZAPI_LIMITE_CHAT', 15),

        /* Limite de los endpoints de cuenta (login y registro), por
           IP y ventana. Va aparte y mas bajo que el de escritura:
           es la unica puerta donde alguien podria probar claves en
           serie, y conviene frenarlo antes. */
        limiteAutenticacion: leerEntero('ZAPI_LIMITE_AUTH', 10),

        /* Umbral (0-1) de parecido para reutilizar una FAQ ya
           guardada en vez de armar una respuesta nueva. */
        faqUmbral: leerDecimal('ZAPI_FAQ_UMBRAL', 0.55),

        /* Tiempos de Mongo, en ms. */
        mongoTimeout: leerEntero('ZAPI_MONGO_TIMEOUT', 30000),
    };
}

module.exports = construir();
