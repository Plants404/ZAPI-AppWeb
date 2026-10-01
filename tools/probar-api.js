'use strict';
/* Prueba de la API de punta a punta.
   Usage: node tools/probar-api.js

   Levanta el servidor de verdad (el mismo app de server.js) en un
   puerto libre, le habla con fetch y verifica que responda lo que
   tiene que responder. No hay mocking ni atajos: si el servidor no
   arranca, o el carrito no se guarda entre peticiones, o el stock no
   se descuenta, la prueba falla.

   Por que importa
   ---------------
   El carrito paso de estar en localStorage a estar en el servidor. Eso
   cambio de lugar el lugar donde viven los datos, y un cambio asi
   rompe cosas en silencio: el carrito se pierde al recargar, dos
   personas comparten el mismo carrito, o el precio se puede editar
   desde el navegador. Esta prueba mira justo eso.

   La base es de archivo y queda en data/prueba.db: se borra al
   empezar y al terminar, asi que no toca los pedidos reales. */

const fs = require('fs');
const path = require('path');

/* La base de prueba se declara ANTES de que se requiera db.js: ese
   modulo abre el archivo al cargarse. */
const BASE_PRUEBA = path.join(__dirname, '..', 'data', 'prueba.db');

function borrarBase() {
    for (const sufijo of ['', '-wal', '-shm']) {
        fs.rmSync(BASE_PRUEBA + sufijo, { force: true });
    }
}

borrarBase();

process.env.ZAPI_DB = BASE_PRUEBA;
process.env.ZAPI_ADMIN_TOKEN = 'token-de-prueba';
process.env.ZAPI_SESSION_SECRET = 'secreto-de-prueba';

/* La prueba hace unas 40 escrituras seguidas, todas desde la misma IP
   (127.0.0.1). Con el limite de 20 por 10 minutos del servidor, a la
   mitad leeria 429 y las pruebas de pedido no probarian nada. Se sube
   el limite por arriba; si el rate limit dejara de estar en el server,
   estas pruebas empiezan a fallar y avisan. */
process.env.ZAPI_LIMITE_ESCRITURA = '500';
process.env.ZAPI_LIMITE_LECTURA = '500';

const { app } = require('../server');

const TOKEN = 'token-de-prueba';

let server = null;
let base = '';

const pruebas = [];
let fallos = 0;

/* ------------------------------------------------------------------
   Ayudas
   ------------------------------------------------------------------ */

function comprobar(nombre, condicion, detalle) {
    pruebas.push({ nombre, ok: !!condicion, detalle: detalle || '' });

    if (!condicion) fallos++;
}

async function pedir(ruta, opciones) {
    const config = opciones || {};

    const respuesta = await fetch(base + ruta, {
        method: config.method || 'GET',
        headers: {
            ...(config.body ? { 'content-type': 'application/json' } : {}),
            ...(config.headers || {})
        },
        ...(config.body ? { body: config.body } : {})
    });

    let cuerpo = null;

    try {
        cuerpo = await respuesta.json();
    } catch (error) {
        cuerpo = null;
    }

    return { estado: respuesta.status, cuerpo, cabeceras: respuesta.headers };
}

/* Con una cookie por sesion, para que dos personas no se mezclen. */
function conCookie(cookie) {
    return { headers: { cookie } };
}

function sacarCookie(respuesta) {
    const cabeceras = respuesta.cabeceras.getSetCookie ? respuesta.cabeceras.getSetCookie() : [];

    const zapi = cabeceras.find(c => c.startsWith('zapi_sesion='));

    return zapi ? zapi.split(';')[0] : '';
}

function cuerpoJson(datos) {
    return JSON.stringify(datos);
}

/* ------------------------------------------------------------------
   Las pruebas
   ------------------------------------------------------------------ */

async function correr() {
    /* --- Salud -------------------------------------------------- */
    {
        const r = await pedir('/api/salud');

        comprobar('GET /api/salud responde ok', r.estado === 200 && r.cuerpo.ok, 'estado ' + r.estado);
        comprobar('el catalogo esta sembrado', r.cuerpo && r.cuerpo.productos === 7, (r.cuerpo && r.cuerpo.productos) + ' productos');
    }

    /* --- Catalogo ------------------------------------------------ */
    {
        const r = await pedir('/api/productos');
        const lista = (r.cuerpo && r.cuerpo.productos) || [];

        comprobar('GET /api/productos devuelve la lista', r.estado === 200 && lista.length === 7, lista.length + ' productos');

        const albahaca = lista.find(p => p.slug === 'albahaca');

        comprobar('el slug coincide con la ficha estatica', albahaca && albahaca.slug === 'albahaca', albahaca && albahaca.slug);
        comprobar('el precio viene del catalogo', albahaca && albahaca.precio === 150, albahaca && albahaca.precio);
        comprobar('el producto trae sus fotos', albahaca && Array.isArray(albahaca.imagenes) && albahaca.imagenes.length > 0);
        comprobar('sin stock cargado, unidades es null', albahaca && albahaca.unidades === null, String(albahaca && albahaca.unidades));

        const inexistente = await pedir('/api/productos/99999');

        comprobar('un id que no existe da 404', inexistente.estado === 404, 'estado ' + inexistente.estado);
    }

    /* --- Stock: protegido por token ------------------------------ */
    {
        const sinToken = await pedir('/api/stock/1', {
            method: 'PUT',
            body: cuerpoJson({ unidades: 10 })
        });

        comprobar('cambiar stock sin token da 401', sinToken.estado === 401, 'estado ' + sinToken.estado);

        const tokenMalo = await pedir('/api/stock/1', {
            method: 'PUT',
            headers: { 'x-zapi-token': 'incorrecto' },
            body: cuerpoJson({ unidades: 10 })
        });

        comprobar('cambiar stock con token incorrecto da 401', tokenMalo.estado === 401, 'estado ' + tokenMalo.estado);

        const bueno = await pedir('/api/stock/1', {
            method: 'PUT',
            headers: { 'x-zapi-token': TOKEN },
            body: cuerpoJson({ unidades: 10 })
        });

        comprobar('cargar stock con token valido da 200', bueno.estado === 200, 'estado ' + bueno.estado);

        const stock = await pedir('/api/stock');

        comprobar('el stock se lee en /api/stock', stock.cuerpo && stock.cuerpo.stock && stock.cuerpo.stock['1'] === 10, String(stock.cuerpo && stock.cuerpo.stock && stock.cuerpo.stock['1']));

        const negativo = await pedir('/api/stock/1', {
            method: 'PUT',
            headers: { 'x-zapi-token': TOKEN },
            body: cuerpoJson({ unidades: -3 })
        });

        comprobar('el stock negativo se rechaza', negativo.estado === 400, 'estado ' + negativo.estado);

        const fraccion = await pedir('/api/stock/1', {
            method: 'PUT',
            headers: { 'x-zapi-token': TOKEN },
            body: cuerpoJson({ unidades: 2.5 })
        });

        comprobar('el stock fraccionario se rechaza', fraccion.estado === 400, 'estado ' + fraccion.estado);
    }

    /* --- Carrito: la sesion manda --------------------------------- */
    let cookieA = '';

    {
        const primera = await pedir('/api/carrito');
        cookieA = sacarCookie(primera);

        comprobar('el carrito nuevo viene vacio', primera.cuerpo && primera.cuerpo.items && primera.cuerpo.items.length === 0);
        comprobar('el carrito nuevo total 0', primera.cuerpo && primera.cuerpo.total === 0);
        comprobar('el servidor manda la cookie de sesion', cookieA.startsWith('zapi_sesion='), cookieA.slice(0, 24));

        /* Una cookie editada no puede entrar a un carrito ajeno. */
        const conFalsa = await pedir('/api/carrito', conCookie('zapi_sesion=inventado.firmado'));

        comprobar('una cookie con firma inventada no entra a nada', conFalsa.cuerpo && conFalsa.cuerpo.items && conFalsa.cuerpo.items.length === 0);

        const agregar = await pedir('/api/carrito', {
            method: 'POST',
            ...conCookie(cookieA),
            body: cuerpoJson({ id: '1', cantidad: 2 })
        });

        comprobar('agregar al carrito da 201', agregar.estado === 201, 'estado ' + agregar.estado);

        const ver = await pedir('/api/carrito', conCookie(cookieA));
        const linea = ver.cuerpo && ver.cuerpo.items && ver.cuerpo.items[0];

        comprobar('el carrito recuerda lo agregado', ver.cuerpo && ver.cuerpo.items && ver.cuerpo.items.length === 1);
        comprobar('la cantidad es la que se pidio', linea && linea.cantidad === 2, linea && linea.cantidad);
        comprobar('el total es precio por cantidad', ver.cuerpo && ver.cuerpo.total === 300, String(ver.cuerpo && ver.cuerpo.total));
        comprobar('el nombre sale del catalogo, no del cliente', linea && linea.nombre === 'Albahaca', linea && linea.nombre);

        /* Volver a pedir el mismo producto suma en vez de duplicar. */
        await pedir('/api/carrito', {
            method: 'POST',
            ...conCookie(cookieA),
            body: cuerpoJson({ id: '1', cantidad: 1 })
        });

        const otra = await pedir('/api/carrito', conCookie(cookieA));
        const otraLinea = otra.cuerpo && otra.cuerpo.items && otra.cuerpo.items[0];

        comprobar('agregar dos veces suma la cantidad', otraLinea && otraLinea.cantidad === 3, otraLinea && otraLinea.cantidad);
        comprobar('sigue siendo una sola linea', otra.cuerpo && otra.cuerpo.items && otra.cuerpo.items.length === 1);

        /* Dos sesiones son dos carritos. */
        const cookieB = sacarCookie(await pedir('/api/carrito'));
        const deB = await pedir('/api/carrito', conCookie(cookieB));

        comprobar('otra sesion tiene su propio carrito', deB.cuerpo && deB.cuerpo.items && deB.cuerpo.items.length === 0);

        /* Cantidades invalidas. */
        const malas = [0, -1, 'dos', 1.5, null];

        for (const mala of malas) {
            const r = await pedir('/api/carrito', {
                method: 'POST',
                ...conCookie(cookieA),
                body: cuerpoJson({ id: '1', cantidad: mala })
            });

            comprobar('cantidad invalida ' + JSON.stringify(mala) + ' se rechaza', r.estado === 400, 'estado ' + r.estado);
        }

        const productoInexistente = await pedir('/api/carrito', {
            method: 'POST',
            ...conCookie(cookieA),
            body: cuerpoJson({ id: '99999', cantidad: 1 })
        });

        comprobar('agregar un id inexistente da 404', productoInexistente.estado === 404);

        const fijar = await pedir('/api/carrito/1', {
            method: 'PATCH',
            ...conCookie(cookieA),
            body: cuerpoJson({ cantidad: 7 })
        });

        comprobar('PATCH cambia la cantidad', fijar.estado === 200, 'estado ' + fijar.estado);

        const trasFijar = await pedir('/api/carrito', conCookie(cookieA));
        const fijada = trasFijar.cuerpo && trasFijar.cuerpo.items && trasFijar.cuerpo.items[0];

        comprobar('la cantidad fijada se respeta', fijada && fijada.cantidad === 7, fijada && fijada.cantidad);
    }

    /* --- Pedido: descuenta stock y limpia el carrito ---------------- */
    {
        const sinDatos = await pedir('/api/pedidos', {
            method: 'POST',
            ...conCookie(cookieA),
            body: cuerpoJson({})
        });

        comprobar('un pedido sin datos da 400', sinDatos.estado === 400, 'estado ' + sinDatos.estado);
        comprobar('el error avisa que falta el nombre', sinDatos.cuerpo && /nombre/i.test(sinDatos.cuerpo.error || ''), sinDatos.cuerpo && sinDatos.cuerpo.error);

        const vacio = await pedir('/api/pedidos', {
            method: 'POST',
            ...conCookie('zapi_sesion=inventado.firmado'),
            body: cuerpoJson({ nombre: 'Ana', telefono: '098765432' })
        });

        comprobar('un pedido con carrito vacio da 400', vacio.estado === 400, 'estado ' + vacio.estado);

        /* El cliente manda un total inventado: el server lo ignora. */
        const pedido = await pedir('/api/pedidos', {
            method: 'POST',
            ...conCookie(cookieA),
            body: cuerpoJson({
                nombre: 'Ana Perez',
                telefono: '098 765 432',
                zona: 'Montevideo',
                total: 1,
                notas: 'Tocar el timbre del 4'
            })
        });

        comprobar('el pedido se crea con 201', pedido.estado === 201, 'estado ' + pedido.estado + ' ' + JSON.stringify(pedido.cuerpo));
        comprobar('el total sale del catalogo, no del cliente', pedido.cuerpo && pedido.cuerpo.total === 1050, String(pedido.cuerpo && pedido.cuerpo.total));
        comprobar('el id del pedido tiene el formato Z-AAAA-MM-DD-XXXX', /^Z-\d{8}-[0-9A-F]{6}$/.test((pedido.cuerpo && pedido.cuerpo.id) || ''), pedido.cuerpo && pedido.cuerpo.id);

        const stockTrasPedido = await pedir('/api/stock');

        comprobar('el stock se desconto (10 - 7 = 3)', stockTrasPedido.cuerpo && stockTrasPedido.cuerpo.stock && stockTrasPedido.cuerpo.stock['1'] === 3, String(stockTrasPedido.cuerpo && stockTrasPedido.cuerpo.stock && stockTrasPedido.cuerpo.stock['1']));

        const carritoTrasPedido = await pedir('/api/carrito', conCookie(cookieA));

        comprobar('el carrito quedo vacio tras el pedido', carritoTrasPedido.cuerpo && carritoTrasPedido.cuerpo.items && carritoTrasPedido.cuerpo.items.length === 0);
    }

    /* --- Pedido que se pasa del stock ------------------------------ */
    {
        await pedir('/api/carrito', {
            method: 'POST',
            ...conCookie(cookieA),
            body: cuerpoJson({ id: '1', cantidad: 10 })
        });

        const exagerado = await pedir('/api/pedidos', {
            method: 'POST',
            ...conCookie(cookieA),
            body: cuerpoJson({ nombre: 'Beto', telefono: '099111222' })
        });

        comprobar('pedir mas del stock da 409', exagerado.estado === 409, 'estado ' + exagerado.estado);
        comprobar('el 409 dice cuanto hay disponible', exagerado.cuerpo && exagerado.cuerpo.shortages && exagerado.cuerpo.shortages[0] && exagerado.cuerpo.shortages[0].disponibles === 3, JSON.stringify(exagerado.cuerpo && exagerado.cuerpo.shortages));

        const stockIntacto = await pedir('/api/stock');

        comprobar('la transaccion revirtio: el stock sigue en 3', stockIntacto.cuerpo && stockIntacto.cuerpo.stock && stockIntacto.cuerpo.stock['1'] === 3, String(stockIntacto.cuerpo && stockIntacto.cuerpo.stock && stockIntacto.cuerpo.stock['1']));

        const carritoIntacto = await pedir('/api/carrito', conCookie(cookieA));

        comprobar('el carrito se conservo tras el fallo', carritoIntacto.cuerpo && carritoIntacto.cuerpo.items && carritoIntacto.cuerpo.items.length === 1);
    }

    /* --- Rutas que no se pueden ver desde el navegador -------------- */
    {
        const rutas = [
            '/data/zapi.db', '/data/prueba.db', '/server.js', '/server/db.js',
            '/server/rutas-api.js', '/tools/generar-productos.js', '/package.json',
            '/.gitignore', '/.env', '/node_modules/express/package.json', '/.vscode/settings.json'
        ];

        for (const ruta of rutas) {
            const r = await fetch(base + ruta);

            comprobar('la ruta ' + ruta + ' no se sirve', r.status === 404, 'estado ' + r.status);
        }
    }

    /* --- Cabeceras de seguridad ------------------------------------- */
    {
        const r = await fetch(base + '/');
        const csp = r.headers.get('content-security-policy') || '';

        comprobar('se manda CSP sin unsafe-inline', csp.includes("script-src 'self'") && !csp.includes('unsafe-inline'), csp.slice(0, 60));
        comprobar('no se anuncia el motor', r.headers.get('x-powered-by') === null);
        comprobar('no se puede embeber en un iframe', r.headers.get('x-frame-options') === 'DENY');
        comprobar('nosniff esta activo', r.headers.get('x-content-type-options') === 'nosniff');
    }

    /* --- El sitio estatico sigue andando ---------------------------- */
    {
        const paginas = [
            '/', '/catalogo.html', '/carrito.html', '/productos/albahaca.html',
            '/styles.css', '/zapi-bot.js', '/asset/img/albahaca.opt.jpg', '/sitemap.xml'
        ];

        for (const pagina of paginas) {
            const r = await fetch(base + pagina);

            comprobar(pagina + ' se sirve', r.status === 200, 'estado ' + r.status);
        }
    }

    /* --- API inexistente --------------------------------------------- */
    {
        const r = await pedir('/api/no-existe');

        comprobar('una ruta de API inexistente responde JSON, no HTML', r.estado === 404 && !!(r.cuerpo && r.cuerpo.error), JSON.stringify(r.cuerpo).slice(0, 60));
    }
}

/* ------------------------------------------------------------------
   Arranque y resultado
   ------------------------------------------------------------------ */

(async () => {
    server = app.listen(0);

    await new Promise(resolve => server.once('listening', resolve));

    base = 'http://127.0.0.1:' + server.address().port;

    try {
        await correr();
    } catch (error) {
        console.error('\nLa prueba se rompio a mitad de camino:', error);
        fallos++;
    }

    server.close();

    /* Se cierra la base antes de borrar el archivo: db.js la abrio al
       cargarse y en Windows no se puede borrar un archivo que sigue
       abierto (EPERM). */
    const db = require('../server/db');

    try {
        db.db.close();
    } catch (error) {
        /* Si ya estaba cerrada no es un problema */
    }

    console.log('');

    for (const prueba of pruebas) {
        const marca = prueba.ok ? 'ok   ' : 'FALLA';
        const detalle = prueba.detalle ? '   (' + prueba.detalle + ')' : '';

        console.log('  ' + marca + '  ' + prueba.nombre + detalle);
    }

    console.log('');
    console.log('  ' + (pruebas.length - fallos) + '/' + pruebas.length + ' pruebas pasan');

    borrarBase();

    process.exit(fallos === 0 ? 0 : 1);
})();
