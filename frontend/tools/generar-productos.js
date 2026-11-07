'use strict';
/* Genera las fichas de producto como paginas estaticas (producto-<slug>.html),
   rellena los bloques de datos de public/js/catalogo-datos.js y borra solo
   las paginas marcadas como generadas.
   Uso:
       node frontend/tools/generar-productos.js
       node frontend/tools/generar-productos.js --revisar */

const fs = require('fs');
const path = require('path');

const { pagina: armarPagina } = require('./lib/plantilla.js');
const { generarFicha } = require('../fuentes/paginas/producto.js');
const { PRODUCTOS } = require('../datos/catalogo.js');

const raiz = path.join(__dirname, '..');
const revisar = process.argv.includes('--revisar');
const GENERADO = 'ZAPI producto generado';

function leer(archivo) {
    try {
        return fs.readFileSync(archivo, 'utf8');
    } catch {
        return null;
    }
}

function escribir(archivo, contenido) {
    fs.writeFileSync(archivo, contenido, 'utf8');
}

function serializarBloque(nombre, datos) {
    return `// INICIO_${nombre}\nconst ${nombre} = ` + JSON.stringify(datos, null, 4) + ';\n// FIN_' + nombre + '\n';
}

function reemplazarBloque(contenido, nombre, bloque) {
    const inicio = '// INICIO_' + nombre;
    const fin = '// FIN_' + nombre;
    const pi = contenido.indexOf(inicio);
    const fi = contenido.indexOf(fin);

    if (pi === -1 || fi === -1 || fi < pi) {
        throw new Error('No se encontraron los marcadores de ' + nombre + ' en catalogo-datos.js');
    }

    const finLinea = contenido.indexOf('\n', fi);
    const finBloque = finLinea === -1 ? contenido.length : finLinea + 1;

    return contenido.slice(0, pi) + bloque + contenido.slice(finBloque);
}

let fallos = 0;

function generarFichaHtml(producto) {
    const opciones = generarFicha(producto);
    const html = armarPagina(opciones);
    return '<!-- ' + GENERADO + ': ' + opciones.archivo + ' -->\n' + html;
}

function fichasYaGeneradas() {
    const resultado = [];
    const carpeta = raiz;

    for (const archivo of fs.readdirSync(carpeta)) {
        if (!archivo.startsWith('producto-') || !archivo.endsWith('.html')) continue;
        const contenido = leer(path.join(carpeta, archivo));
        if (contenido && contenido.includes(GENERADO)) resultado.push(archivo);
    }

    return resultado;
}

function borrarFichasMarcadas() {
    for (const archivo of fichasYaGeneradas()) {
        try { fs.unlinkSync(path.join(raiz, archivo)); } catch { /* ya no existe */ }
    }
}

function generarTodas() {
    if (!revisar) borrarFichasMarcadas();

    for (const producto of PRODUCTOS) {
        const archivo = 'producto-' + producto.slug + '.html';
        const html = generarFichaHtml(producto);
        const destino = path.join(raiz, archivo);
        const actual = leer(destino);

        if (revisar) {
            if (actual !== html) {
                console.log('  FALLA ' + archivo + ' esta desactualizada');
                fallos += 1;
            } else {
                console.log('  ok   ' + archivo);
            }
        } else {
            escribir(destino, html);
            console.log('  ok   ' + archivo + ' generada');
        }
    }
}

function actualizarCatalogoDatos() {
    const archivo = path.join(raiz, 'public', 'js', 'catalogo-datos.js');
    const contenido = leer(archivo);
    if (!contenido) {
        throw new Error('No se encontro ' + archivo);
    }

    const categorias = [...new Set(PRODUCTOS.map(p => p.categoria))];
    const nuevo = reemplazarBloque(reemplazarBloque(contenido, 'PRODUCTOS', serializarBloque('PRODUCTOS', PRODUCTOS)), 'CATEGORIAS', serializarBloque('CATEGORIAS', categorias));

    if (revisar) {
        if (nuevo !== contenido) {
            console.log('  FALLA public/js/catalogo-datos.js esta desactualizado');
            fallos += 1;
        } else {
            console.log('  ok   public/js/catalogo-datos.js');
        }
    } else {
        if (nuevo !== contenido) {
            escribir(archivo, nuevo);
            console.log('  ok   public/js/catalogo-datos.js actualizado');
        } else {
            console.log('  ok   public/js/catalogo-datos.js');
        }
    }
}

console.log('Fichas de producto');
generarTodas();

console.log('Datos del catalogo');
actualizarCatalogoDatos();

if (revisar) {
    console.log('\n' + (fallos === 0 ? 'Todo esta actualizado.' : fallos + ' elemento(s) desactualizado(s).'));
    process.exit(fallos === 0 ? 0 : 1);
}

console.log('\nFichas y datos generados en ' + raiz);
