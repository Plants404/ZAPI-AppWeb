'use strict';
/* ==========================================================
   APP EXPRESS
   ------------------------------------------------------------
   Arma la aplicacion pero NO abre el puerto: de eso se encarga
   server.js. Separarlos es lo que permite que las pruebas usen
   la app con Supertest sin levantar un servidor real ni pelear
   por un puerto.

   El sitio se sirve desde la raiz del repo, para que las URLs
   publicas sean /catalogo.html y /productos/albahaca.html. Los
   estilos, scripts e imagenes viven bajo public/. El resto
   -codigo del servidor, base, secretos, generadores- no se
   sirve nunca: el middleware de rutas bloqueadas lo frena antes
   de que llegue al estatico. Sin eso, se podrian leer los
   telefonos de los clientes o el .env por HTTP.
   ========================================================== */

const path = require('path');
const express = require('express');

const config = require('./config/env');
const log = require('./utils/log');
const api = require('./routes');
const { cabeceras, cors } = require('./middlewares/seguridad');
const { LIMITE_CUERPO } = require('./constants');
const { noEncontradoApi, manejadorErrores } = require('./middlewares/errores');

const RAIZ = path.resolve(__dirname, '..', '..');

/* Lo que no se sirve nunca. Se compara en minusculas y sin la
   barra final, para que /data, /data/ y /DATA/x queden afuera
   igual. */
const RUTAS_BLOQUEADAS = [
    '/backend',
    '/tools',
    '/datos',
    '/data',
    '/node_modules',
    '/.git',
    '/.vscode',
    '/.env',
    '/.env.local',
    '/.env.example',
    '/package.json',
    '/package-lock.json',
    '/eslint.config.js',
    '/README.md',
    '/.gitignore',
    '/.editorconfig',
    '/.gitattributes',
];

function crearApp() {
    const app = express();

    /* Detras de un proxy (Nginx, Render, Fly, Cloudflare) el
       protocolo real viene en X-Forwarded-Proto y la IP en
       X-Forwarded-For. Sin esto, req.ip es la del proxy y el rate
       limit terminaria contando a todos como uno. Un solo proxy
       para que un cliente no pueda mandar cabeceras falsas. */
    app.set('trust proxy', 1);
    app.disable('x-powered-by');

    app.use(cabeceras());
    app.use(cors);
    app.use(log.peticiones);

    app.use((req, res, next) => {
        const limpio = decodeURIComponent(req.path).replace(/\/+$/, '').toLowerCase();

        for (const bloqueada of RUTAS_BLOQUEADAS) {
            if (limpio === bloqueada || limpio.startsWith(bloqueada + '/')) {
                log.warn('ruta bloqueada', { metodo: req.method, ruta: req.originalUrl });

                return res.status(404).json({ error: 'No encontrado' });
            }
        }

        next();
    });

    app.use(express.json({ limit: LIMITE_CUERPO }));
    app.use(express.urlencoded({ extended: false, limit: LIMITE_CUERPO }));

    /* Un endpoint suelto para el monitor, fuera de /api para que
       no dependa de que el rate limit de la API este en pie. */
    app.use('/health', require('./routes/salud.routes'));

    app.use('/api', api);

    /* Una ruta /api que no existe contesta JSON, nunca HTML. */
    app.use('/api', noEncontradoApi);

    app.use(express.static(RAIZ, {
        etag: true,
        maxAge: config.esProduccion ? '1h' : 0,
        index: 'index.html',
        setHeaders(res, ruta) {
            /* El HTML no se cachea: un cambio de precio se ve al
               recargar. Los CSS, JS e imagenes si, con maxAge
               corto porque no llevan hash en el nombre. */
            if (ruta.endsWith('.html')) {
                res.setHeader('Cache-Control', 'no-cache');
            }
        },
    }));

    /* Lo que no existe: si es un recurso (.js, .css, una imagen)
       se devuelve 404 en texto plano, porque mandarle el HTML del
       index deja al navegador con un SyntaxError apuntando a un
       archivo que nadie pidio. Si es una ruta de pagina, se
       devuelve la home, que es de una sola pagina con secciones. */
    app.use((req, res) => {
        const ruta = req.path.toLowerCase();
        const esRecurso = ruta.startsWith('/public/')
            || (/\.[a-z0-9]+$/i.test(ruta) && !ruta.endsWith('.html'));

        if (esRecurso) {
            return res.status(404).type('text/plain').send('No encontrado');
        }

        res.status(404).sendFile(path.join(RAIZ, 'index.html'));
    });

    app.use(manejadorErrores);

    return app;
}

module.exports = { crearApp, RAIZ };
