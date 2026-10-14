'use strict';
/* ==========================================================
   SEGURIDAD: CABECERAS Y CORS
   ------------------------------------------------------------
   Helmet pone las cabeceras que no dependen del sitio. La CSP va
   aparte porque es la unica que hay que ajustar al proyecto: el
   HTML carga Google Fonts, asi que styles/fonts se permiten de
   esos dos dominios y nada mas. El formulario de contacto suma el
   SDK de EmailJS, que llega desde el CDN de jsdelivr, y el envio
   del aviso, que sale hacia api.emailjs.com.

   script-src y connect-src sin comodines: un script inyectado por
   un XSS no llega a ejecutarse ni a hablar con otro servidor. Esa
   es la defensa real detras de tanto innerHTML en el front.
   ========================================================== */

const helmet = require('helmet');
const config = require('../config/env');

const CSP = {
    /* useDefaults:false para no heredar upgrade-insecure-requests:
       en desarrollo el sitio se sirve por http y esa directiva
       forzaria a https las subpeticiones, dejando la pagina sin
       CSS ni JS. La lista de aca abajo es todo lo que se permite. */
    useDefaults: false,
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        /* connect-src cubre el frontend que sirve este Express y
           puede llamar a la API desde otro origen (CLIENT_URL,
           tambien CORS y cookies cross-site). */
        connectSrc: ["'self'", 'https://api.emailjs.com', ...config.origenes],
        /* El mapa de la seccion Nosotros se embebe desde Google Maps. */
        frameSrc: ["'self'", 'https://www.google.com'],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        objectSrc: ["'none'"],
    },
};

function cabeceras() {
    return helmet({
        contentSecurityPolicy: CSP,
        /* crossOriginEmbedderPolicy rompe Google Fonts sin dar
           nada a cambio aca; se apaga a proposito. */
        crossOriginEmbedderPolicy: false,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        /* frame-ancestors 'none' ya lo impide en la CSP; la cabecera
           se agrega igual porque navegadores viejos no miran la CSP. */
        frameguard: { action: 'deny' },
    });
}

/* CORS por lista blanca. El sitio lo sirve este mismo Express, asi
   que en el caso normal no hace falta ninguna cabecera CORS: la
   lista blanca es para un frontend en otro origen (por ejemplo un
   entorno de desarrollo aparte). Vacia = solo mismo origen.

   En desarrollo se acepta ademas cualquier origen local
   (localhost, 127.*, ::1, cualquier puerto): asi funciona sin tocar
   nada con Live Server (5500), Live Preview de VS Code (3000) u
   otro server local. En produccion sólo vale la lista blanca.

   Con cookies en la sesion del carrito hace falta
   Access-Control-Allow-Credentials y el front tiene que llamar
   con credentials: 'include'. El token de stock va en
   x-zapi-token, asi que tambien se permite. */
function esOrigenLocal(origen) {
    let host;

    try {
        host = new URL(origen).hostname;
    } catch (error) {
        return false;
    }

    return host === 'localhost'
        || host.endsWith('.localhost')
        || host === '::1'
        || host === '[::1]'
        || host === '0.0.0.0'
        || host.indexOf('127.') === 0;
}

function origenPermitido(origen) {
    if (config.origenes.includes(origen)) return true;

    return !config.esProduccion && esOrigenLocal(origen);
}

function cors(req, res, next) {
    const origen = req.headers.origin;

    if (origen && origenPermitido(origen)) {
        res.setHeader('Access-Control-Allow-Origin', origen);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-zapi-token');
        res.setHeader('Access-Control-Max-Age', '86400');

        if (req.method === 'OPTIONS') {
            return res.status(204).end();
        }
    }

    next();
}

module.exports = { cabeceras, cors };
