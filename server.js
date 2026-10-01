'use strict';
/* Servidor de ZAPI.
   
   Usage: npm start        (o: node server.js)

   Que hace y que NO hace
   ----------------------
   Hace: sirve el sitio estatico tal cual esta (las mismas paginas que
   se abren con doble clic) y agrega la API que falta para que el
   stock y el carrito sean de verdad.

   NO hace: cobrar. No hay pasarela de pagos conectada. Un pedido se
   guarda en la base con estado 'pendiente' y hay que cerrarlo a mano
   por WhatsApp, que es como se viene haciendo. Es a proposito:
   conectar Mercado Pago o Stripe pide una cuenta con datos fiscales
   reales, claves secretas y HTTPS, y eso se decide con el negocio.

   Las dos formas de abrir el sitio
   --------------------------------
   Con doble clic en index.html funciona todo menos el stock real: el
   catalogo sale de productos.js, que va incrustado en la pagina. Sin
   servidor no se puede consultar la base, asi que ahi se muestra lo
   que hay en el archivo. Sirve para revisar el diseno; para ver el
   stock real hay que correr este servidor.

   Por que hay que frenar ciertas rutas
   ------------------------------------
   El sitio se sirve desde la raiz del repo, porque las paginas se
   abren con rutas relativas y moverlas a public/ las romperia. El
   costo es que express.static dejaria exposes todo lo que hay en la
   carpeta: el codigo de este servidor, los scripts de tools/ y la
   base de datos SQLite con los pedidos y los telefonos de los
   clientes. El middleware de abajo lo bloquea antes de que lleguemos
   al estatico. Es la parte mas importante de este archivo. */

const path = require('path');
const crypto = require('crypto');
const express = require('express');

const db = require('./server/db');
const catalogo = require('./server/catalogo');
const sesion = require('./server/sesion');
const api = require('./server/rutas-api');

const raiz = __dirname;
const PUERTO = Number(process.env.PORT) || 5501;
const EN_PRODUCCION = process.env.NODE_ENV === 'production';

const app = express();

/* Detras de un proxy (Nginx, Render, Fly, Cloudflare) el protocolo
   real viene en X-Forwarded-Proto. Sin esto, Express cree que todo es
   http y la cookie Secure no se pondria nunca. Se limita a un proxy
   para que un cliente no pueda mandar cabeceras falsas. */
app.set('trust proxy', 1);
app.disable('x-powered-by');

/* ------------------------------------------------------------------
   Lo que no se sirve nunca
   ------------------------------------------------------------------ */

const RUTAS_BLOQUEADAS = [
    '/server.js',
    '/package.json',
    '/package-lock.json',
    '/sitemap.xml.bak',
    '/server',
    '/tools',
    '/data',
    '/node_modules',
    '/.git',
    '/.vscode',
    '/README.md',
    '/README.md.txt',
    '/.gitignore',
    '/.env'
];

app.use((req, res, next) => {
    /* Se compara en minusculas y sin la barra final, para que
       /data y /data/ y /DATA/x queden afuera igual. */
    const limpio = decodeURIComponent(req.path).replace(/\/+$/, '').toLowerCase();

    for (const bloqueada of RUTAS_BLOQUEADAS) {
        if (limpio === bloqueada || limpio.startsWith(bloqueada + '/')) {
            console.warn('[bloqueado]', req.method, req.originalUrl);

            return res.status(404).json({ error: 'No encontrado' });
        }
    }

    next();
});

/* ------------------------------------------------------------------
   Cookies
   ------------------------------------------------------------------
   Express 5 no trae lector de cookies. Se separa el encabezado a mano
   en vez de sumar cookie-parser: son pocas lineas y no hace falta una
   dependencia mas para leer una cookie. */

app.use((req, res, next) => {
    req.cookies = Object.create(null);

    const cabecera = req.headers.cookie;

    if (!cabecera) return next();

    for (const parte of cabecera.split(';')) {
        const corte = parte.indexOf('=');

        if (corte < 1) continue;

        const nombre = parte.slice(0, corte).trim();
        const valor = parte.slice(corte + 1).trim();

        try {
            req.cookies[nombre] = decodeURIComponent(valor);
        } catch (error) {
            /* Un % mal formado no es mio: se ignora esa cookie y se
               sigue, en vez de cortar el pedido entero. */
        }
    }

    next();
});

app.use((req, res, next) => {
    /* Express implementa res.cookie con un res.set que pisa lo
       anterior: dos llamadas, dos cookies y solo sobrevive la
       ultima. Este middleware acumula todas y las manda juntas. */
    const escribir = res.cookie.bind(res);

    res.cookie = function (nombre, valor, opciones = {}) {
        const previa = res.getHeader('Set-Cookie');

        escribir(nombre, valor, opciones);

        const actual = res.getHeader('Set-Cookie') || [];

        res.setHeader(
            'Set-Cookie',
            previa ? [].concat(previa, actual) : actual
        );
    };

    next();
});

/* ------------------------------------------------------------------
   Cabeceras de seguridad
   ------------------------------------------------------------------
   Van a mano y no con helmet para no sumar otra dependencia: son pocas
   lineas y asi queda a la vista que se estan aplicando. Lo que hace
   cada una esta comentado donde esta. */

app.use((req, res, next) => {
    /* No se puede embeber la pagina en un iframe de otro sitio
       (clickjacking), ni que un atacante lea lo que hay escrito
       adentro. */
    res.setHeader('X-Frame-Options', 'DENY');

    /* Que no se adivine el tipo de archivo por la extension: sin esto
       un .txt puede llegar a ejecutarse como script en algunos
       navegadores. */
    res.setHeader('X-Content-Type-Options', 'nosniff');

    /* Al mandar enlaces a otros sitios, no se dice de que pagina se
       vino salvo el origen. */
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    /* Respetar lo que el visitante pida de no rastreo. El sitio no
       rastrea a nadie, pero el producto tiene datos de contacto de
       gente. */
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    /* HTTPS estricto. Solo tiene efecto cuando el sitio ya se sirve
       por https, asi que activarlo ahora no rompe nada. El hosting
       tiene que terminar el TLS: en la mayoria se hace con un
       certificado automatico. */
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    /* CSP: la lista blanca de todo lo que la pagina puede cargar.
       script-src sin 'unsafe-inline' y sin 'unsafe-eval' significa que
       ningun script inyectado por un XSS llega a ejecutarse, que es
       la defensa real contra los innerHTML. Google Fonts es lo unico
       externo permitido, asi que el sitio no carga nada de otro lado. */
    res.setHeader(
        'Content-Security-Policy',
        [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data:",
            "connect-src 'self'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'"
        ].join('; ')
    );

    next();
});

/* ------------------------------------------------------------------
   Cuerpo de las peticiones
   ------------------------------------------------------------------ */

app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));

/* ------------------------------------------------------------------
   Rate limit
   ------------------------------------------------------------------
   Un limite en memoria, sin dependencias. Dos reglas segun cuanta
   informacion mueve cada endpoint: leer el catalogo es lo normal y
   aguanta mucho mas, escribir un pedido se corta antes de que alguien
   llene la base con pedidos falsos. */

const registros = new Map();

function limite(ventanaMs, maximo) {
    return function (req, res, next) {
        const ahora = Date.now();
        const clave = req.ip || 'desconocido';
        const previo = registros.get(clave);

        if (!previo || ahora > previo.reinicio) {
            registros.set(clave, { cuenta: 1, reinicio: ahora + ventanaMs });
            return next();
        }

        if (previo.cuenta >= maximo) {
            return res.status(429).json({
                error: 'Demasiadas peticiones. Espera un momento e intenta de nuevo.'
            });
        }

        previo.cuenta++;

        next();
    };
}

/* Sin esto el mapa guardaria una entrada por cada IP que toco el
   servidor, para siempre. */
setInterval(() => {
    const ahora = Date.now();

    for (const [clave, dato] of registros) {
        if (ahora > dato.reinicio) registros.delete(clave);
    }
}, 5 * 60 * 1000).unref();

/* Los limites salen del entorno para que la prueba de la API pueda
   subirlos: tools/probar-api.js hace cuarenta escrituras seguidas desde
   127.0.0.1 y con el valor de ahi se comeria un 429 a mitad de camino,
   y las pruebas de pedido no probarian nada. Los valores por defecto
   son los que se usan en produccion. */
const limiteLectura = limite(60 * 1000, Number(process.env.ZAPI_LIMITE_LECTURA) || 120);
const limiteEscritura = limite(10 * 60 * 1000, Number(process.env.ZAPI_LIMITE_ESCRITURA) || 20);

/* ------------------------------------------------------------------
   API
   ------------------------------------------------------------------ */

app.get('/api/salud', api.salud);

app.get('/api/productos', limiteLectura, api.listarProductos);
app.get('/api/productos/:id', limiteLectura, api.verProducto);

app.get('/api/stock', limiteLectura, api.verStock);

/* Cambiar el stock pide un token. Sin esto, cualquiera que se sepa la
   URL podria vaciar el inventario desde la consola del navegador. Si
   ZAPI_ADMIN_TOKEN no esta definido la ruta queda cerrada, no
   abierta: es preferible que el stock no se pueda cargar a que se
   pueda cualquiera. */
const tokenAdmin = process.env.ZAPI_ADMIN_TOKEN || '';

function requiereAdmin(req, res, next) {
    if (!tokenAdmin) {
        return res.status(503).json({
            error: 'La carga de stock esta deshabilitada: falta definir ZAPI_ADMIN_TOKEN'
        });
    }

    const recibido = req.get('x-zapi-token') || '';

    const a = Buffer.from(recibido);
    const b = Buffer.from(tokenAdmin);

    /* timingSafeEqual y no ===: la comparacion normal devuelve
       apenas encuentra la primera diferencia y eso deja medir
       cuantos caracteres correctos tiene el token. */
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(401).json({ error: 'Token incorrecto' });
    }

    next();
}

app.put('/api/stock/:id', limiteEscritura, requiereAdmin, api.cambiarStock);

app.get('/api/carrito', api.verCarrito);
app.post('/api/carrito', limiteEscritura, api.agregar);
app.patch('/api/carrito/:id', limiteEscritura, api.fijar);
app.delete('/api/carrito/:id', api.quitar);

app.post('/api/pedidos', limiteEscritura, api.crearPedido);

/* Una ruta /api que no existe tiene que contestar JSON. Si cayera en
   el 404 de mas abajo devolveria el index.html, que es un HTML
   entero donde el fetch solo receive un error de sintaxis. */
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Ruta de API inexistente' });
});

/* ------------------------------------------------------------------
   Sitio estatico
   ------------------------------------------------------------------ */

app.use(express.static(raiz, {
    etag: true,
    maxAge: EN_PRODUCCION ? '1h' : 0,
    index: 'index.html',
    setHeaders(res, ruta) {
        if (ruta.endsWith('.html')) {
            /* El HTML no se cachea para que un cambio se vea al
               recargar. Los CSS, JS e imagenes si se cachean. Como
               los archivos no llevan hash en el nombre, el maxAge
               corto evita que un archivo regenerado siga servido por
               el cache del navegador. */
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

/* Si el visitante pidio algo que no existe, se le devuelve la home en
   vez de un error seco: el sitio es de una sola pagina con secciones,
   asi que casi todas las rutas validas son secciones. */
app.use((req, res) => {
    res.status(404).sendFile(path.join(raiz, 'index.html'));
});

/* ------------------------------------------------------------------
   Errores
   ------------------------------------------------------------------
   Cuando algo revienta, el visitante ve un mensaje y el servidor
   guarda la traza: en la consola del servidor es donde se lee. */

app.use((error, req, res, next) => {
    console.error('[error]', req.method, req.originalUrl, error);

    if (res.headersSent) return next(error);

    res.status(500).json({ error: 'Error interno del servidor' });
});

/* ------------------------------------------------------------------
   Arranque
   ------------------------------------------------------------------ */

function sembrar() {
    const productos = catalogo.leerProductos();

    for (const producto of productos) {
        db.upsertProducto(catalogo.aFila(producto));
    }

    return productos.length;
}

/* sembrar se corre siempre, aunque el archivo se importe: asi la base
   tiene catalogo apenas se levanta el servidor, y las pruebas de
   tools/probar-api.js encuentran lo mismo que la produccion. */
const cargados = sembrar();

function arrancar() {
    const server = app.listen(PUERTO, () => {
        console.log(`ZAPI escuchando en http://localhost:${PUERTO}`);
        console.log(`  ${cargados} productos cargados desde productos.js`);
        console.log(`  base: ${db.RUTA_DB}`);

        const sinStock = db.productosConStock().filter(p => p.unidades === null);

        if (sinStock.length > 0) {
            console.log('');
            console.log(`  FALTA STOCK de ${sinStock.length} producto(s):`);

            for (const p of sinStock) {
                console.log(`    - ${p.nombre} (id ${p.id})`);
            }

            console.log('');
            console.log('  Se carga con:');
            console.log(`    curl -X PUT http://localhost:${PUERTO}/api/stock/1 \\`);
            console.log('      -H "x-zapi-token: $ZAPI_ADMIN_TOKEN" \\');
            console.log('      -H "content-type: application/json" \\');
            console.log('      -d \'{"unidades":10}\'');
        }

        if (!tokenAdmin) {
            console.log('');
            console.log('  AVISO: ZAPI_ADMIN_TOKEN no esta definido. La carga de');
            console.log('  stock va a estar deshabilitada hasta que lo definas.');
        }

        if (!EN_PRODUCCION) {
            console.log('');
            console.log('  Modo desarrollo. Para produccion: NODE_ENV=production');
        }
    });

    /* Al apagar se cierra la base: si no, un reinicio rapido puede
       dejar el WAL a medias. */
    for (const senal of ['SIGINT', 'SIGTERM']) {
        process.on(senal, () => {
            console.log(`\n${senal} recibido, cerrando...`);

            server.close(() => {
                try {
                    db.db.close();
                } catch (error) {
                    /* Si ya estaba cerrada no es un problema */
                }

                process.exit(0);
            });
        });
    }

    return server;
}

/* Solo arranca si se ejecuta con "node server.js". Si el archivo se
   importa -como hace tools/probar-api.js- levanta el servidor sin
   llamar a listen, y el test elige el puerto que quiere. */
if (require.main === module) {
    arrancar();
}

module.exports = { app, arrancar };
