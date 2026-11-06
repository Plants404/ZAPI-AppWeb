'use strict';
/* Construye las páginas HTML públicas y del panel a partir de las fuentes.
   Uso:
       node frontend/tools/construir.js
       node frontend/tools/construir.js --revisar

   Con --revisar no escribe nada: compara lo que generaría con lo que hay
   en disco y termina con código 1 si alguna página quedó vieja. Así el
   verificador puede exigir que el HTML publicado sea reproducible. */

const fs = require('fs');
const path = require('path');

const { pagina: armarPagina, paginaAdmin: armarPaginaAdmin } = require('./lib/plantilla.js');

const raiz = path.join(__dirname, '..');
const revisar = process.argv.includes('--revisar');

const GRUPOS = [
    {
        nombre: 'Páginas públicas',
        carpeta: path.join(raiz, 'fuentes', 'paginas'),
        destino: raiz,
        armar: armarPagina,
    },
    {
        nombre: 'Panel de administración',
        carpeta: path.join(raiz, 'fuentes', 'admin'),
        destino: path.join(raiz, 'admin'),
        armar: armarPaginaAdmin,
    },
];

function escribirSiCambio(archivo, contenido) {
    let anterior = null;

    try {
        anterior = fs.readFileSync(archivo, 'utf8');
    } catch {
        /* La primera escritura no tiene anterior. */
    }

    if (anterior === contenido) return false;

    if (!revisar) {
        fs.mkdirSync(path.dirname(archivo), { recursive: true });
        fs.writeFileSync(archivo, contenido, 'utf8');
    }
    return true;
}

function cargarPaginas(grupo) {
    if (!fs.existsSync(grupo.carpeta)) {
        throw new Error('no existe ' + path.relative(raiz, grupo.carpeta));
    }

    const archivos = fs.readdirSync(grupo.carpeta)
        .filter(nombre => nombre.endsWith('.js'))
        .sort();

    return archivos.map(nombre => {
        const pagina = require(path.join(grupo.carpeta, nombre));

        if (!pagina || typeof pagina !== 'object') {
            throw new Error(nombre + ' no exporta una página');
        }

        if (!pagina.archivo || !pagina.contenido) {
            throw new Error(nombre + ' no tiene "archivo" o "contenido"');
        }

        return pagina;
    });
}

function construir() {
    const desactualizadas = [];
    const escritas = [];
    let total = 0;

    for (const grupo of GRUPOS) {
        const paginas = cargarPaginas(grupo);
        const nombres = new Set();

        for (const pagina of paginas) {
            if (nombres.has(pagina.archivo)) {
                throw new Error('dos fuentes generan ' + pagina.archivo);
            }
            nombres.add(pagina.archivo);

            const contenido = grupo.armar(pagina);
            const archivo = path.join(grupo.destino, pagina.archivo);
            const etiqueta = path.relative(raiz, archivo).replace(/\\/g, '/');

            total += 1;

            if (!escribirSiCambio(archivo, contenido)) continue;

            desactualizadas.push(etiqueta);
            if (!revisar) escritas.push(etiqueta);
        }
    }

    if (revisar) {
        if (desactualizadas.length) {
            console.error('Páginas desactualizadas: ' + desactualizadas.join(', '));
            console.error('Ejecutá "npm run generar" para reconstruirlas.');
            process.exitCode = 1;
        } else {
            console.log('Páginas HTML: todas al día (' + total + ').');
        }
        return;
    }

    console.log('Páginas HTML: ' + total + ' revisadas, ' + escritas.length + ' actualizadas.');

    if (escritas.length) console.log('Actualizadas: ' + escritas.join(', '));
}

try {
    construir();
} catch (error) {
    console.error('Error: ' + error.message);
    process.exitCode = 1;
}
