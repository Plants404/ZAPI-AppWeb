'use strict';
/* Lee el catalogo de productos.js para cargarlo en la base.
   
   Por que no se copia a mano
   --------------------------
   productos.js ya es la fuente unica de verdad del catalogo: el
   navegador lo carga, generar-productos.js saca de ahi las fichas y
   el sitemap sale de los archivos generados. Si el servidor tambien
   leyera otra copia, cambiar un precio habria que acordarse de tres
   lugares, y el que se olvide se vende al precio viejo.

   Por que no se importa con require()
   ------------------------------------
   productos.js es un script de navegador: usa window, document y
   const a nivel de modulo. Si se hiciera require() reventaria al
   tocar el DOM. Se le saca el literal de PRODUCTOS con un contador
   de llaves y se evalua en un contexto vacio. Es codigo del propio
   repo, nunca entrada del visitante.

   Por que no se pasa el catalogo a JSON
   -------------------------------------
   Se podria, pero entonces el sitio dejaria de abrir con doble clic
   en el archivo: el catalogo pasaria a necesitar fetch y un servidor.
   Por ahora el sitio anda de las dos formas -abierto con doble clic
   o servido por Node- y productos.js queda igual. Si alguna vez hay
   que elegir una sola, la JSON es el camino. */

const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const ARCHIVO = path.join(raiz, 'productos.js');

/* El slug se calcula con EXACTAMENTE el mismo codigo que
   generar-productos.js, para que la URL de /api/productos sea la
   misma que la de la ficha estatica. Si divergieran, el boton "Ver la
   ficha completa" apuntaria a un 404.

   El orden importa: normalize('NFD') separa la tilde del caracter
   ("ú" queda como "u" mas un acento combinante), despues se borran
   los acentos combinantes, y recien ahi se cambia todo lo que no sea
   letra o numero por un guion. Si se reemplazara la vocal acentuada
   antes del NFD, "Rucula" saldria "ru-cula". */
function slug(texto) {
    return String(texto)
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/* Saca el array literal PRODUCTOS del archivo y lo evalua. Devuelve
   null si no lo encuentra o si el resultado no tiene la forma
   esperada: mejor arrancar sin catalogo que arrancar con cualquier
   cosa. */
function leerProductos() {

    const codigo = fs.readFileSync(ARCHIVO, 'utf8');

    const inicio = codigo.indexOf('const PRODUCTOS = [');

    if (inicio < 0) {
        throw new Error('No se encontro "const PRODUCTOS = [" en productos.js');
    }

    const corchete = codigo.indexOf('[', inicio);
    const cierre = emparejar(corchete, codigo);

    if (cierre < 0) {
        throw new Error('El array PRODUCTOS de productos.js no cierra bien');
    }

    const literal = codigo.slice(corchete, cierre + 1);

    /* El eval es sobre codigo del repo, no sobre entrada de nadie. Lo
       unico que hace es resolver el literal. */
    const productos = Function(`"use strict"; return (${literal});`)();

    if (!Array.isArray(productos) || productos.length === 0) {
        throw new Error('PRODUCTOS en productos.js no es una lista con contenido');
    }

    return productos;
}

/* Devuelve el indice del ] o } que cierra al del indice dado, saltando
   adentro de los strings y los comentarios. Sin esto, un corchete
   dentro de un nombre de producto parte el array al medio. */
function emparejar(indice, codigo) {
    let nivel = 0;
    let enString = null;
    let enComentario = false;

    for (let i = indice; i < codigo.length; i++) {
        const caracter = codigo[i];
        const siguiente = codigo[i + 1];

        if (enComentario) {
            if (caracter === '\n') enComentario = false;
            continue;
        }

        if (enString) {
            if (caracter === '\\') { i++; continue; }
            if (caracter === enString) enString = null;
            continue;
        }

        if (caracter === '/' && siguiente === '/') { enComentario = true; continue; }
        if (caracter === '/' && siguiente === '*') { i += 2; enComentario = true; continue; }

        if (caracter === '"' || caracter === "'" || caracter === '`') {
            enString = caracter;
            continue;
        }

        if (caracter === '[' || caracter === '{') nivel++;
        if (caracter === ']' || caracter === '}') {
            nivel--;
            if (nivel === 0) return i;
        }
    }

    return -1;
}

/* Convierte un producto de productos.js a la fila que espera la base.
   Se separa en columnas (lo que se busca o se ordena) y el resto
   queda en JSON, asi que agregar un campo al catalogo no obliga a
   tocar el esquema.

   El precio en productos.js se llama precioBase: la pagina genera el
   precio final con una tabla de precios aparte, asi que es el precio
   de referencia del catalogo, no el de venta. El servidor guarda ese
   mismo numero; cuando haya una regla de precios real, se ajusta en
   el checkout y no en el catalogo. */
function aFila(producto) {
    const { id, nombre, precioBase, categoria, ...resto } = producto;

    if (!id || !nombre || typeof precioBase !== 'number' || !categoria) {
        throw new Error(`Producto incompleto en productos.js: ${JSON.stringify(producto).slice(0, 120)}`);
    }

    return {
        id: String(id),
        nombre: String(nombre),
        slug: slug(nombre),
        categoria: String(categoria),
        precio: precioBase,
        resto
    };
}

module.exports = { leerProductos, slug, aFila };
