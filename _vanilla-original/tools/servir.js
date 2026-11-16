'use strict';

/* Servidor estatico local para el sitio generado.
   Uso:
       npm run frontend        -> http://localhost:5500
       PORT=8080 npm run frontend

   Sirve los archivos de frontend/ con rutas relativas, sin proxy a API. */

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
    '.ttf': 'font/ttf'
};

function estaDentro(rutaBase, rutaObjetivo) {
    const relativo = path.relative(rutaBase, rutaObjetivo);
    return relativo === '' || (!relativo.startsWith('..') && !path.isAbsolute(relativo));
}

function responder(res, codigo, tipo, cuerpo) {
    res.writeHead(codigo, { 'Content-Type': tipo, 'Cache-Control': 'no-cache' });
    res.end(cuerpo);
}

function servirArchivo(res, rutaArchivo) {
    fs.readFile(rutaArchivo, (error, contenido) => {
        if (error) {
            responder(res, 404, 'text/plain; charset=utf-8', 'No encontrado');
            return;
        }

        const extension = path.extname(rutaArchivo).toLowerCase();
        responder(res, 200, TIPOS[extension] || 'application/octet-stream', contenido);
    });
}

const servidor = http.createServer((req, res) => {
    const rutaUrl = new URL(req.url, 'http://localhost');
    let rutaArchivo = path.join(raiz, rutaUrl.pathname.replace(/^\//, ''));

    if (!estaDentro(raiz, rutaArchivo)) {
        responder(res, 403, 'text/plain; charset=utf-8', 'Prohibido');
        return;
    }

    fs.stat(rutaArchivo, (error, stat) => {
        if (error || !stat.isFile()) {
            // Rutas limpias: intentar anexar .html
            const rutaHtml = rutaArchivo + '.html';
            fs.stat(rutaHtml, (err2, stat2) => {
                if (!err2 && stat2.isFile() && estaDentro(raiz, rutaHtml)) {
                    servirArchivo(res, rutaHtml);
                } else {
                    responder(res, 404, 'text/html; charset=utf-8', fs.readFileSync(path.join(raiz, '404.html'), 'utf8'));
                }
            });
            return;
        }

        servirArchivo(res, rutaArchivo);
    });
});

servidor.listen(puerto, () => {
    console.log('Sirviendo sitio estatico en http://localhost:' + puerto + ' (raiz: ' + raiz + ')');
});
