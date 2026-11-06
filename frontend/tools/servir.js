'use strict';

/* Servidor estático local con proxy hacia la API.
   Uso:
       npm run frontend        -> http://localhost:5500
       PORT=8080 npm run frontend

   Todo pedido a /api se reenvía a la API Express (por defecto en
   http://localhost:5501), así el navegador siempre usa rutas relativas. */

const http = require('http');
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const puerto = Number(process.env.PORT) || 5500;
const apiUrl = new URL(process.env.API_URL || 'http://localhost:5501');
const apiPuerto = Number(apiUrl.port) || (apiUrl.protocol === 'https:' ? 443 : 80);

const TIPOS = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.pdf': 'application/pdf',
    '.map': 'application/json; charset=utf-8',
};

/* Nada que sea fuente, semilla o configuración del repo se sirve por HTTP. */
const BLOQUEADOS = new Set(['node_modules', 'tools', 'fuentes', 'datos', '.git', '.vscode']);

function buscar(rutaUrl) {
    const limpia = decodeURIComponent(rutaUrl.split('?')[0]);
    let objetivo = path.join(raiz, limpia);

    if (objetivo !== raiz && !objetivo.startsWith(raiz + path.sep)) return null;

    const relativo = path.relative(raiz, objetivo);
    const primerSegmento = relativo.split(path.sep)[0];

    if (BLOQUEADOS.has(primerSegmento)) return null;
    if (relativo.startsWith('.')
        || relativo === 'package.json'
        || relativo === 'package-lock.json') return null;

    if (fs.existsSync(objetivo) && fs.statSync(objetivo).isDirectory()) {
        objetivo = path.join(objetivo, 'index.html');
    }

    if (!fs.existsSync(objetivo) || !fs.statSync(objetivo).isFile()) return null;

    return objetivo;
}

function responder404(res) {
    const pag404 = path.join(raiz, '404.html');
    const cuerpo = fs.existsSync(pag404) ? fs.readFileSync(pag404) : 'No encontrado';

    res.writeHead(404, { 'Content-Type': TIPOS['.html'] });
    res.end(cuerpo);
}

function proxear(req, res) {
    const destino = {
        protocol: apiUrl.protocol,
        hostname: apiUrl.hostname,
        port: apiPuerto,
        method: req.method,
        path: req.url,
        headers: {
            ...req.headers,
            host: apiUrl.host,
        },
    };

    const peticion = http.request(destino, respuestaApi => {
        res.writeHead(respuestaApi.statusCode || 502, respuestaApi.headers);
        respuestaApi.pipe(res);
    });

    peticion.on('error', error => {
        res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            error: 'La API no está disponible. Iniciá el backend con "npm run api".',
            detalle: error.message,
        }));
    });

    req.pipe(peticion);
}

const servidor = http.createServer(function (req, res) {
    if (req.url === '/api' || req.url.startsWith('/api/') || req.url.startsWith('/api?')) {
        proxear(req, res);
        return;
    }

    let archivo = null;

    try {
        archivo = buscar(req.url);
    } catch {
        archivo = null;
    }

    if (!archivo) {
        responder404(res);
        return;
    }

    const tipo = TIPOS[path.extname(archivo).toLowerCase()] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': tipo });
    res.end(fs.readFileSync(archivo));
});

servidor.listen(puerto, function () {
    console.log(`ZAPI web en http://localhost:${puerto}`);
    console.log(`Proxy /api -> ${apiUrl.origin}`);
});
