'use strict';
/* ==========================================================
   MONGO: CONEXION Y ESQUEMA BASE
   ------------------------------------------------------------
   Este archivo traduce el modelo de SQLite a MongoDB. Todavia
   no reemplaza nada: server/db.js sigue siendo la base en uso
   y sigue siendo el que se usa en las pruebas. Acá esta la
   conexion, el nombre de cada coleccion y los indices, para
   que despues se escriba la logica encima sin volver a
   decidir estas cosas.

   De donde sale el modelo
   ------------------------------------------------------------
   La base actual son 7 tablas en server/db.js:

     productos       stock        carritos      carrito_items
     pedidos         pedido_items mensajes

   Y en MongoDB son 5 colecciones, porque dos pares de tablas
   se juntan:

     - carrito_items se guarda DENTRO de carritos.items. Un
       item de carrito no existe sin su carrito, asi que en
       SQLite eso era una tabla aparte con ON DELETE CASCADE
       para poder borrar los huerfanos. En un documento el
       item viaja con el carrito y el problema desaparece.
     - pedido_items se guarda DENTRO de pedidos.items. Un
       pedido es historia: no se le toca despues de creado.
       Guardar los items adentro, con el nombre y el precio
       que tenia al momento, es justamente lo que hay que
       hacer para que un cambio de precio despues no
       altere un pedido viejo. SQLite los guardaba aparte y
       confiaba en que nadie los tocara.

   Las otras 5 tablas siguen siendo colecciones propias. El
   stock NO se embebe en productos a proposito: se cambia
   desde la administracion, seguido y sin leer el resto del
   documento, y el catalogo se cachea en el navegador. Joined
   para poder contar sobre stock sin bajar productos.

   Dos trampas del cambio de tipo
   ------------------------------------------------------------
   Los ids de producto son numeros (1, 2, 3...) aunque en
   SQLite la columna sea TEXT. SQLite es permisivo y convierte
   solo; MongoDB distingue number de string y "2" no matchea
   2. Por eso los ids de producto son number en las
   colecciones, y cualquier id que venga del exterior o del
   carrito se pasa por Number() antes de consultar, como ya
   hace server/rutas-api.js.

   Las fechas cambian de formato: SQLite guarda texto ISO
   porque SQLite no tiene tipo fecha, MongoDB usa BSON Date.
   Un SELECT que comparaba con new Date().toISOString() hay
   que revisarlo; con Date() se comparan los dos bien. Las
   funciones de fecha de MongoDB ($day, $month) son lo que
   hay que usar para agrupar por dia o por mes, porque sobre
   texto ISO no se puede.
   ========================================================== */

/* --------------------------------------------------------------
   Configuracion. Sale del .env, con valores por defecto para
   que el archivo se pueda cargar sin tocar nada.
   -------------------------------------------------------------- */

const URL_POR_DEFECTO = 'mongodb://127.0.0.1:27017';
const BASE_POR_DEFECTO = 'zapi';

function leerConfig() {
    return {
        url: process.env.ZAPI_MONGO_URL || URL_POR_DEFECTO,
        base: process.env.ZAPI_MONGO_DB || BASE_POR_DEFECTO,

        /* Cuanto tiempo se espera un socket antes de cortarlo.
           MongoDB tiene su propio heartbeat de 10 s: si un
           comando no se responde en 30 s algo ya esta mal, y
           seguir esperando solo suma conexiones abiertas. */
        tiempoFallo: Number(process.env.ZAPI_MONGO_TIMEOUT || 30000),

        /* Peticiones simultaneas por operacion. El catalogo se
           pide mucho y casi siempre en paralelo desde varias
           pestanas: un pool chico se nota de inmediato. */
        maxPool: Number(process.env.ZAPI_MONGO_MAX_POOL || 10),
        minPool: Number(process.env.ZAPI_MONGO_MIN_POOL || 1),

        /* Sin esto, un espera de escritura sin limite mantiene
           una transaccion abierta hasta que Mongo la corta a
           los 60 s, y la promesa sigue esperando en silencio. */
        tiempoEscritura: Number(process.env.ZAPI_MONGO_TIMEOUT_ESCRITURA || 5000),
    };
}

/* --------------------------------------------------------------
   Las colecciones. Cada una declara para que existe, que tabla
   reemplaza y que indices necesita. Los indices no son
   adorno: sin un indice unico sobre slug, /api/productos
   tiene que recorrer la coleccion entera cada vez que un
   visitante abre el catalogo.
   -------------------------------------------------------------- */

const COLECCIONES = {
    /* Reemplaza productos. detalle es el objeto que en SQLite
       iba aplastado dentro de descripcion_json: alli habia
       que parsear un texto para poder leer una foto. Como
       subdocumento se consulta directo y, ademas, se puede
       indexar por categoria o por nombre de archivo. */
    productos: {
        tabla: 'productos',
        descripcion: 'Catalogo del vivero. La unica coleccion que el sitio lee sin sesion.',
        indices: [
            {
                nombre: 'unico_slug',
                clave: { slug: 1 },
                opciones: { unique: true },
                porque: 'El slug es la URL publica de la ficha y el id de /api/productos.',
            },
            {
                nombre: 'por_categoria',
                clave: { categoria: 1, activo: 1 },
                opciones: {},
                porque: 'El catalogo filtra por categoria, y las tarjetas inactive no se listan.',
            },
        ],
        validador: {
            $jsonSchema: {
                bsonType: 'object',
                required: ['nombre', 'slug', 'categoria', 'precio'],
                properties: {
                    _id: { bsonType: 'int', description: 'Id del catalogo, de datos/catalogo.js.' },
                    nombre: { bsonType: 'string', minLength: 1 },
                    slug: { bsonType: 'string', pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' },
                    categoria: { bsonType: 'string', minLength: 1 },
                    precio: { bsonType: ['int', 'double', 'decimal'], minimum: 0 },
                    activo: { bsonType: 'bool' },
                    detalle: { bsonType: 'object' },
                },
            },
        },
    },

    /* Reemplaza stock. Unidades en null significa "sin datos",
       no "agotado": la diferencia se ve en la API, donde null
       deja la disponibilidad sin completar en vez de marcar
       agotado un producto del que nadie cargo el stock. */
    stock: {
        tabla: 'stock',
        descripcion: 'Unidades disponibles por producto. Se escribe desde la administracion.',
        indices: [
            {
                nombre: 'unico_producto',
                clave: { producto_id: 1 },
                opciones: { unique: true },
                porque: 'Una sola fila de stock por producto; es la relacion 1 a 1.',
            },
        ],
        validador: {
            $jsonSchema: {
                bsonType: 'object',
                required: ['producto_id'],
                properties: {
                    producto_id: { bsonType: 'int' },
                    unidades: { bsonType: ['int', 'long', 'null'], minimum: 0 },
                    actualizado: { bsonType: 'date' },
                },
            },
        },
    },

    /* Reemplaza carritos Y carrito_items. Un carrito abierto es
       un documento con sus items adentro: se lee entero de una
       pasada, que es como lo necesita la pagina del carrito.

       sesion pasa a ser el _id. La cookie ya trae un id
       aleatorio de 32 bytes, asi que como clave funciona
       igual y no hace falta un indice aparte. */
    carritos: {
        tabla: 'carritos + carrito_items',
        descripcion: 'Carrito abierto de una sesion. Vive poco: expira solo.',
        indices: [
            {
                nombre: 'por_fecha',
                clave: { actualizado: 1 },
                opciones: { expireAfterSeconds: 60 * 60 * 24 * 30 },
                porque: 'Un carrito abandonado tiene que irse solo. En SQLite no habia quien lo hiciera.',
            },
        ],
        validador: {
            $jsonSchema: {
                bsonType: 'object',
                required: ['items'],
                properties: {
                    _id: { bsonType: 'string', description: 'La sesion de la cookie.' },
                    creado: { bsonType: 'date' },
                    actualizado: { bsonType: 'date' },
                    items: {
                        bsonType: 'array',
                        items: {
                            bsonType: 'object',
                            required: ['producto_id', 'cantidad'],
                            properties: {
                                producto_id: { bsonType: 'int' },
                                cantidad: { bsonType: ['int', 'long'], minimum: 1 },
                            },
                        },
                    },
                },
            },
        },
    },

    /* Reemplaza pedidos Y pedido_items. Los items viajan con el
       pedido y con el nombre y el precio del momento en que se
       hizo: eso es lo que hace que el historial sea fiable.

       estado lleva indice porque es por ahi por donde se
       busca todo el tiempo (el listado del panel). */
    pedidos: {
        tabla: 'pedidos + pedido_items',
        descripcion: 'Pedidos del cliente. Solo se escriben y se leen; no se editan.',
        indices: [
            {
                nombre: 'por_estado',
                clave: { estado: 1, creado: -1 },
                opciones: {},
                porque: 'El panel filtra por estado y ordena por fecha.',
            },
            {
                nombre: 'por_sesion',
                clave: { sesion: 1 },
                opciones: {},
                porque: 'El cliente entra a "mis pedidos" y mira los suyos.',
            },
        ],
        validador: {
            $jsonSchema: {
                bsonType: 'object',
                required: ['id', 'nombre', 'telefono', 'total', 'estado'],
                properties: {
                    id: { bsonType: 'string', description: 'Z-AAAAMMDD-XXXXXX, como en db.js.' },
                    sesion: { bsonType: ['string', 'null'] },
                    nombre: { bsonType: 'string', minLength: 1 },
                    telefono: { bsonType: 'string', minLength: 1 },
                    email: { bsonType: ['string', 'null'] },
                    zona: { bsonType: ['string', 'null'] },
                    notas: { bsonType: ['string', 'null'] },
                    total: { bsonType: ['int', 'double', 'decimal'], minimum: 0 },
                    estado: { enum: ['pendiente', 'pagado', 'entregado', 'cancelado'] },
                    creado: { bsonType: 'date' },
                    items: {
                        bsonType: 'array',
                        minItems: 1,
                        items: {
                            bsonType: 'object',
                            required: ['producto_id', 'nombre', 'precio', 'cantidad'],
                            properties: {
                                producto_id: { bsonType: 'int' },
                                nombre: { bsonType: 'string' },
                                precio: { bsonType: ['int', 'double', 'decimal'] },
                                cantidad: { bsonType: ['int', 'long'], minimum: 1 },
                            },
                        },
                    },
                },
            },
        },
    },

    /* Reemplaza mensajes. _id lo pone MongoDB (ObjectId), asi
       que ya no hace falta el autoincremental de SQLite. El
       indice conserva el par (estado, _id) que tenia la base
       actual: se listan los nuevos primero y el _id ya ordena
       por fecha. */
    mensajes: {
        tabla: 'mensajes',
        descripcion: 'Consultas del formulario de contacto.',
        indices: [
            {
                nombre: 'por_estado',
                clave: { estado: 1, _id: -1 },
                opciones: {},
                porque: 'El panel muestra los nuevos primero, igual que en SQLite.',
            },
        ],
        validador: {
            $jsonSchema: {
                bsonType: 'object',
                required: ['nombre', 'correo', 'telefono', 'consulta', 'estado'],
                properties: {
                    nombre: { bsonType: 'string', minLength: 1 },
                    correo: { bsonType: 'string', minLength: 3 },
                    telefono: { bsonType: 'string', minLength: 1 },
                    consulta: { bsonType: 'string', minLength: 1 },
                    estado: { enum: ['nuevo', 'leido', 'respondido', 'descartado'] },
                    creado: { bsonType: 'date' },
                },
            },
        },
    },
};

/* --------------------------------------------------------------
   Conexion
   -------------------------------------------------------------- */

/* El driver se pide recien cuando se conecta, y no al cargar el
   archivo. Motivo: mongodb es una dependencia que todavia no
   esta en package.json, y este archivo se quiere poder cargar y
   leer (por ejemplo desde un test o desde la consola) sin
   tenerla instalada. Si se pidiera arriba, el require solo
   tiraria por un modulo ausente. */
function pedirDriver() {
    try {
        return require('mongodb');
    } catch (e) {
        throw new Error(
            'Falta el driver de MongoDB. Instalalo con: npm install mongodb'
        );
    }
}

/* Conecta y devuelve el manejador. El cliente queda a mano para
   poder cerrarlo: sin eso el proceso no termina, porque el pool
   de sockets sigue abierto. */
async function conectar() {
    const config = leerConfig();
    const { MongoClient } = pedirDriver();

    const cliente = new MongoClient(config.url, {
        maxPoolSize: config.maxPool,
        minPoolSize: config.minPool,
        serverSelectionTimeoutMS: config.tiempoFallo,
        connectTimeoutMS: config.tiempoFallo,
        waitQueueTimeoutMS: config.tiempoFallo,
        /* Aparece en todas las escrituras. Si Mongo no puede
           escribir en el momento, preferimos que la peticion
           falle en 5 s a que el visitante espere en silencio. */
        writeConcern: { w: 1, wtimeout: config.tiempoEscritura },
    });

    await cliente.connect();
    await cliente.db(config.base).command({ ping: 1 });

    return cliente;
}

/* Crea las colecciones que falten, con su validador, y los
   indices. Es idempotente: se puede correr en cada arranque.

   createCollection tira Documented dupliqueado si la coleccion ya
   esta, asi que el existence check va antes. Con el validador
   ya puesto, los indices que se crean despues se validan solos:
   si un documento viejo no cumple, el createIndex falla y
   avisa en vez de dejar el indice a medias. */
async function asegurarIndices(db) {
    const aplicadas = [];

    for (const [nombre, spec] of Object.entries(COLECCIONES)) {
        const existe = await db.listCollections({ name: nombre }, { nameOnly: true }).hasNext();

        if (existe) {
            /* Si la coleccion ya esta pero sin validador (la creo
               alguien a mano), se lo pone ahora. */
            await db.command({ collMod: nombre, validator: spec.validador });
        } else {
            await db.createCollection(nombre, { validator: spec.validador });
        }

        for (const indice of spec.indices) {
            await db.collection(nombre).createIndex(indice.clave, indice.opciones || {});
            aplicadas.push(nombre + '.' + indice.nombre);
        }
    }

    return aplicadas;
}

/* Atajo para el uso del dia a dia: conectar y devolver ya las
   colecciones por nombre. Devolver db alcanza, pero tenerlas
   escritas evita el string equivocado en cada llamada. */
async function abrir() {
    const config = leerConfig();
    const cliente = await conectar();
    const db = cliente.db(config.base);
    const colecciones = {};

    for (const nombre of Object.keys(COLECCIONES)) {
        colecciones[nombre] = db.collection(nombre);
    }

    return { cliente, db, colecciones, config };
}

module.exports = {
    COLECCIONES,
    abrir,
    asegurarIndices,
    conectar,
    leerConfig,
};