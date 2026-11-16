'use strict';
/* Construye las páginas HTML públicas a partir de las fuentes.
   Uso:
       node frontend/tools/construir.js
       node frontend/tools/construir.js --revisar

   Con --revisar no escribe nada: compara lo que generaría con lo que hay
   en disco y termina con código 1 si alguna página quedó vieja. */

const fs = require('fs');
const path = require('path');

const { pagina: armarPagina } = require('./lib/plantilla.js');

const raiz = path.join(__dirname, '..');
const revisar = process.argv.includes('--revisar');

const GRUPOS = [
    {
        nombre: 'Paginas publicas',
        carpeta: path.join(raiz, 'fuentes', 'paginas'),
        destino: raiz,
        armar: armarPagina
    }
];

function escribir(archivo, contenido) {
    fs.writeFileSync(archivo, contenido, 'utf8');
}

function leer(archivo) {
    try {
        return fs.readFileSync(archivo, 'utf8');
    } catch {
        return null;
    }
}

function procesarGrupo(grupo) {
    let fallos = 0;

    const archivos = fs.readdirSync(grupo.carpeta).filter(nombre => nombre.endsWith('.js'));

    for (const nombre of archivos) {
        const fuente = require(path.join(grupo.carpeta, nombre));
        if (!fuente || !fuente.archivo) continue;

        const html = grupo.armar(fuente);
        const destino = path.join(grupo.destino, fuente.archivo);
        const actual = leer(destino);

        if (revisar) {
            if (actual !== html) {
                console.log('  FALLA ' + fuente.archivo + ' esta desactualizada');
                fallos += 1;
            } else {
                console.log('  ok   ' + fuente.archivo);
            }
        } else {
            escribir(destino, html);
            console.log('  ok   ' + fuente.archivo + ' generada');
        }
    }

    return fallos;
}

let totalFallos = 0;

for (const grupo of GRUPOS) {
    console.log(grupo.nombre);
    totalFallos += procesarGrupo(grupo);
}

if (revisar) {
    console.log('\n' + (totalFallos === 0 ? 'Todas las páginas están actualizadas.' : totalFallos + ' página(s) desactualizada(s).'));
    process.exit(totalFallos === 0 ? 0 : 1);
}

console.log('\nSitio generado en ' + raiz);
