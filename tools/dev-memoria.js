'use strict';
/* ==========================================================
   SERVIDOR DE DESARROLLO CON MONGO EN MEMORIA
   ------------------------------------------------------------
   Levanta el backend completo (Express + Mongo) en un solo
   comando, sin instalar MongoDB en la maquina. El motor lo
   aporta mongodb-memory-server, que ya viene como dependencia de
   desarrollo y deja el binario cacheado en node_modules/.cache.

   Ademas crea una cuenta de desarrollo para poder entrar al
   carrito y ver los pedidos, porque sin backend el login no
   existe: una vista previa estatica (Live Preview/Live Server)
   no tiene /api/auth/login.

   Uso:
     npm run dev:memoria

   La cuenta se puede cambiar por entorno:
     ZAPI_ADMIN_EMAIL, ZAPI_ADMIN_NOMBRE, ZAPI_ADMIN_CLAVE

   La base vive en memoria: se borra al cerrar. Cada arranque
   vuelve a crear la cuenta, a cargar un stock de ejemplo y a
   sembrar el catalogo y los testimonios desde los JSON
   versionados. No es para produccion: es para que el sitio ande
   en local sin pelear con Mongo.
   ========================================================== */

const path = require('path');
const net = require('net');
const { spawn } = require('child_process');

const raiz = path.join(__dirname, '..');
const backend = (...partes) => path.join(raiz, 'backend', 'src', ...partes);
const servidor = path.join(raiz, 'backend', 'src', 'server.js');

/* Cuenta de desarrollo. Los defaults son los que se pidieron para
   entrar en local; en produccion no se usa este script. */
const CUENTA = {
    email: (process.env.ZAPI_ADMIN_EMAIL || 'admi@zapi.com').trim().toLowerCase(),
    nombre: (process.env.ZAPI_ADMIN_NOMBRE || 'Admin').trim(),
    clave: process.env.ZAPI_ADMIN_CLAVE || 'admi2026',
};

const PUERTO_PREFERIDO = Number(process.env.PORT || 5501);

/* Solo se respeta un puerto fijado a mano. Si no, y el 5501 lo
   tiene la vista previa de VS Code (lo mas comun), se busca el
   siguiente libre en vez de frenar todo: el que importa es el que
   sirve el backend, no la vista previa. */
const PUERTO_FIJO = Boolean(process.env.PORT);

/* Stock de ejemplo para desarrollo. La base arranca vacia por
   diseno: en produccion el stock se carga a mano (PUT
   /api/stock/:id). Aca se cargan numeros para que la pantalla tenga
   algo que mostrar; hay valores bajos a proposito para ver el aviso
   de "quedan pocas unidades". Los ids que no esten aca reciben 10. */
const STOCK_INICIAL = {
    1: 12,
    2: 8,
    3: 25,
    4: 3,
    5: 2,
    6: 6,
    7: 4,
};

/* Ocupado = alguien ya acepta conexiones en ese puerto. Se prueba
   conectando y no atando: la vista previa de VS Code escucha en
   0.0.0.0 y atar 127.0.0.1 no la detecta (Windows deja convivir
   0.0.0.0 y 127.0.0.1 en el mismo puerto). Conectar no tiene esa
   ambiguedad. */
function puertoLibre(puerto) {
    return new Promise(resolver => {
        const sonda = net.connect(puerto, '127.0.0.1');

        sonda.setTimeout(1000);

        sonda.once('connect', () => { sonda.destroy(); resolver(false); });
        sonda.once('timeout', () => { sonda.destroy(); resolver(true); });
        sonda.once('error', () => { sonda.destroy(); resolver(true); });
    });
}

/* Devuelve el primer puerto libre desde el preferido. */
async function elegirPuerto() {

    if (PUERTO_FIJO) {
        return (await puertoLibre(PUERTO_PREFERIDO)) ? PUERTO_PREFERIDO : null;
    }

    for (let puerto = PUERTO_PREFERIDO; puerto < PUERTO_PREFERIDO + 20; puerto++) {
        if (await puertoLibre(puerto)) return puerto;
    }

    return null;
}

function avisarPuertoOcupado() {
    console.error('No hay puerto libre desde ' + PUERTO_PREFERIDO + '.');
    console.error('Cerrala y volve a correr el comando, o cambia PORT en el .env.');
}

/* Carga el stock de ejemplo para los productos del catalogo. Se
   recorre la lista real (no se asumen los ids) para que agregar o
   renombrar productos no deje el stock colgado de un id viejo. */
async function sembrarStock(servicio, productos) {

    for (const producto of productos) {
        const unidades = Object.prototype.hasOwnProperty.call(STOCK_INICIAL, producto.id)
            ? STOCK_INICIAL[producto.id]
            : 10;

        await servicio.poner(producto.id, unidades);
    }

    return productos.length;

}

async function principal() {

    const puerto = await elegirPuerto();

    if (puerto === null) {
        avisarPuertoOcupado();
        process.exitCode = 1;
        return;
    }

    const { MongoMemoryServer } = require('mongodb-memory-server');
    const database = require(backend('config', 'database'));
    const usuarios = require(backend('services', 'usuarios.service'));
    const stock = require(backend('services', 'stock.service'));
    const { leerProductos } = require(backend('utils', 'catalogo'));

    let contenedor = null;

    try {
        contenedor = await MongoMemoryServer.create();

        /* La cuenta y el stock se crean en la misma base que
           despues usa el servidor, asi que hay que conectar antes. */
        await database.conectar({ uri: contenedor.getUri(), reintentos: 1 });

        const resultado = await usuarios.crear(CUENTA);
        const productos = await sembrarStock(stock, leerProductos());

        await database.cerrar();

        if (resultado.tipo !== 'ok' && resultado.tipo !== 'duplicado') {
            throw new Error('no se pudo crear la cuenta de desarrollo');
        }

        console.log('');
        console.log('Mongo en memoria: ' + contenedor.getUri());
        console.log('Cuenta de desarrollo: ' + CUENTA.email + ' / ' + CUENTA.clave);
        console.log('Stock de ejemplo cargado en ' + productos + ' productos.');

        if (puerto !== PUERTO_PREFERIDO) {
            console.log('El puerto ' + PUERTO_PREFERIDO + ' estaba ocupado (vista previa de VS Code); uso el ' + puerto + '.');
        }

        console.log('Abri http://localhost:' + puerto + '/login.html (servido por el backend, no por la vista previa).');
        console.log('');

        arrancarServidor(contenedor, puerto);
    } catch (error) {
        if (contenedor) await contenedor.stop();

        console.error('No se pudo arrancar el entorno en memoria: ' + error.message);
        process.exitCode = 1;
    }
}

function arrancarServidor(contenedor, puerto) {

    /* El backend lee el .env, pero MONGODB_URI y PORT se le pasan
       por entorno: una variable del entorno tiene prioridad sobre
       el archivo, asi que la base es la de memoria y el puerto el
       que se eligio. */
    const hijo = spawn(
        process.execPath,
        ['--env-file-if-exists=.env', servidor],
        {
            cwd: raiz,
            stdio: 'inherit',
            env: { ...process.env, MONGODB_URI: contenedor.getUri(), PORT: String(puerto) },
        }
    );

    const cerrar = senal => { if (!hijo.killed) hijo.kill(senal); };

    process.on('SIGINT', () => cerrar('SIGINT'));
    process.on('SIGTERM', () => cerrar('SIGTERM'));

    hijo.on('exit', async (codigo, senal) => {
        await contenedor.stop();

        if (senal) process.exitCode = 1;
        else process.exitCode = codigo === null ? 1 : codigo;
    });

    hijo.on('error', async error => {
        await contenedor.stop();

        console.error('No se pudo iniciar el backend: ' + error.message);
        process.exitCode = 1;
    });
}

principal();
