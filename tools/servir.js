'use strict';
/* Servidor estatico minimo, sin dependencias, para ver el sitio en
   local. El proyecto no tiene backend: esto solo reparte los archivos
   del repositorio (HTML, CSS, JS, imagenes).

   Usage:
       node tools/servir.js            -> http://localhost:5500
       PORT=8080 node tools/servir.js
       npm start

   El front detecta que no hay API (ver public/js/config.js) y funciona
   igual: catalogo, carrito, pedidos y cuentas se resuelven en el
   navegador. */

const http = require('http');
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const puerto = Number(process.env.PORT) || 5500;

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

/* Nada que sea fuente o configuracion del repo se sirve por HTTP. */
const BLOQUEADOS = ['node_modules', 'tools', '.git', '.vscode'];

/* Traduce una URL a un archivo dentro de la raiz, o null si no existe
   o si apunta a algo que no se debe servir. */
function buscar(rutaUrl) {
    const limpia = decodeURIComponent(rutaUrl.split('?')[0]);
    let objetivo = path.join(raiz, limpia);

    /* path.join ya normaliza los ".."; comprobar que no se escape. */
    if (objetivo !== raiz && !objetivo.startsWith(raiz + path.sep)) return null;

    const relativo = path.relative(raiz, objetivo);
    const primerSegmento = relativo.split(path.sep)[0];

    if (BLOQUEADOS.includes(primerSegmento)) return null;
    if (relativo.startsWith('.')
        || relativo === 'package.json'
        || relativo === 'package-lock.json') return null;

    if (fs.existsSync(objetivo) && fs.statSync(objetivo).isDirectory()) {
        objetivo = path.join(objetivo, 'index.html');
    }

    if (!fs.existsSync(objetivo) || !fs.statSync(objetivo).isFile()) return null;

    return objetivo;
}

const servidor = http.createServer(function (req, res) {
    let archivo = null;

    try {
        archivo = buscar(req.url);
    } catch {
        archivo = null;
    }

    if (!archivo) {
        const pag404 = path.join(raiz, '404.html');
        const cuerpo = fs.existsSync(pag404) ? fs.readFileSync(pag404) : 'No encontrado';

        res.writeHead(404, { 'Content-Type': TIPOS['.html'] });
        res.end(cuerpo);
        return;
    }

    const tipo = TIPOS[path.extname(archivo).toLowerCase()] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': tipo });
    res.end(fs.readFileSync(archivo));
});

servidor.listen(puerto, function () {
    console.log('ZAPI (sin backend) en http://localhost:' + puerto);
});
