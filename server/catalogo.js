'use strict';
/* Lee el catalogo de public/data/productos.json para cargarlo en la
   base.

   Por que no se copia a mano
   --------------------------
   datos/catalogo.js es la fuente unica de verdad del catalogo: de
   ahi salen las tarjetas del navegador, las fichas de productos/
   y el sitemap. Si el servidor leyera otra copia, cambiar un precio
   habria que acordarse de tres lugares, y el que se olvide se vende
   al precio viejo.

   De donde sale el JSON
   ---------------------
   public/data/productos.json lo escribe tools/generar-productos.js
   con npm run generar. Se versiona, asi que un deploy recien clonado
   tiene el catalogo sin acordarse de correr nada.

   Por que JSON y no require()
   ---------------------------
   Este era el punto flojo de la version anterior. El catalogo vivia
   en public/js/productos.js, que es un script de navegador: usa
   window y document, asi que require() reventaba. Para leerlo igual
   habia que arrancarlo a mano: sacar el literal del array con un
   contador de llaves y pasarlo por Function(). Ese emparejar() era
   fragil ante cualquier cambio de formato -el espaciado del
   "const PRODUCTOS = [", unas comillas simples, un corchete dentro
   de un comentario- y el fallo aparecia al arrancar el servidor, en
   produccion, no en un test.

   Ahora es un JSON.parse. No hay nada que pueda romperse por
   reformatear el origen, y si el archivo esta malo el error lo dice
   el parser con el numero de linea y la columna.

   El archivo se versiona junto con las fichas y con las dos partes
   de catalogo.css, que son la misma clase de salida: generado, pero
   parte del repo. npm run verificar avisa si quedo desactualizado
   respecto de datos/catalogo.js. */

const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');

/* Vive bajo public/ porque es lo mismo que baja el navegador: una
   sola copia para los dos, imposible que discrepen. */
const ARCHIVO = path.join(raiz, 'public', 'data', 'productos.json');

/* El slug se calcula con EXACTAMENTE el mismo codigo que
   generar-productos.js, para que la URL de /api/productos sea la
   misma que la de la ficha estatica. Si divergieran, el boton "Ver la
   ficha completa" apuntaria a un 404.

   El orden importa: normalize('NFD') separa la tilde del caracter
   ("ú" queda como "u" mas un acento combinante), despues se borran
   los acentos combinantes, y recien ahi se cambia todo lo que no sea
   letra o numero por un guion. Si se reemplazara la vocal acentuada
   antes del NFD, "Camion" con tilde saldria "cami-n". */
function slug(texto) {
    return String(texto)
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/* Lee el JSON del catalogo. Tira con un mensaje util si el archivo no
   esta o esta roto.

   Que tire en vez de devolver null es a proposito: el catalogo es lo
   unico que el servidor necesita para sembrar la base y para que el
   sitio tenga algo que mostrar. Arrancar sin el daria una pagina en
   vacio y una base sin productos, que es mas dificil de diagnosticar
   que un mensaje al arrancar.

   Si el archivo no esta, casi siempre es que falta correr el
   generador. El mensaje lo dice, porque es el tres de cada cuatro. */
function leerProductos() {

    if (!fs.existsSync(ARCHIVO)) {
        throw new Error(
            'No existe public/data/productos.json. '
            + 'Se genera con: npm run generar'
        );
    }

    let documento;

    try {
        documento = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
    } catch (error) {
        throw new Error('public/data/productos.json esta roto: ' + error.message);
    }

    const productos = documento && documento.productos;

    if (!Array.isArray(productos) || productos.length === 0) {
        throw new Error('public/data/productos.json no trae una lista de productos con contenido');
    }

    return productos;
}

/* Convierte un producto del JSON a la fila que espera la base.
   Se separa en columnas (lo que se busca o se ordena) y el resto
   queda en JSON, asi que agregar un campo al catalogo no obliga a
   tocar el esquema.

   El precio en el catalogo se llama precioBase: la pagina genera el
   precio final con una tabla de precios aparte, asi que es el precio
   de referencia del catalogo, no el de venta. El servidor guarda ese
   mismo numero; cuando haya una regla de precios real, se ajusta en
   el checkout y no en el catalogo. */
function aFila(producto) {
    const { id, nombre, precioBase, categoria, ...resto } = producto;

    if (!id || !nombre || typeof precioBase !== 'number' || !categoria) {
        throw new Error(`Producto incompleto en el catalogo: ${JSON.stringify(producto).slice(0, 120)}`);
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
