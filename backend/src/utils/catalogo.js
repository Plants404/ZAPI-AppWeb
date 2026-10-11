'use strict';
/* ==========================================================
   CATALOGO DESDE EL JSON
   ------------------------------------------------------------
   public/data/productos.json es la fuente unica de verdad del
   catalogo: de ahi salen las tarjetas del navegador y las fichas
   de productos/. El backend lo lee para sembrar su coleccion de
   productos. Una sola copia, imposible que discrepen.

   El archivo lo escribe tools/generar-productos.js con
   npm run generar y se versiona, asi que un deploy recien clonado
   tiene el catalogo sin acordarse de correr nada.

   El slug se calcula con EXACTAMENTE el mismo codigo que el
   generador, para que la URL de /api/productos sea la misma que
   la de la ficha estatica. Si divergieran, el boton "Ver la ficha
   completa" apuntaria a un 404.

   El orden importa: normalize('NFD') separa la tilde del caracter
   ("u" queda como "u" mas un acento combinante), despues se borran
   los acentos combinantes, y recien ahi se cambia todo lo que no
   sea letra o numero por un guion. Si se reemplazara la vocal
   acentuada antes del NFD, "Camion" con tilde saldria "cami-n".
   ========================================================== */

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..', '..');

/* Vive bajo public/ porque es lo mismo que baja el navegador. */
const ARCHIVO = path.join(RAIZ, 'public', 'data', 'productos.json');

function slug(texto) {
    return String(texto)
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/* Lee el JSON y tira con un mensaje util si falta o esta roto.
   Que tire en vez de devolver null es a proposito: el catalogo es
   lo unico que el servidor necesita para sembrar la base, y
   arrancar sin el daria un sitio vacio dificil de diagnosticar. */
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

/* Convierte un producto del JSON al documento que espera Mongo.
   El precio del catalogo se llama precioBase (es el de referencia,
   la pagina le aplica una tabla de precios aparte), pero en la
   base se guarda como "precio", que es el nombre que usa la API.
   El resto de los campos queda entero en "detalle", asi que
   agregar uno al catalogo no obliga a tocar el esquema. */
function aDocumento(producto) {
    const { id, nombre, precioBase, categoria, ...detalle } = producto;

    if (!id || !nombre || typeof precioBase !== 'number' || !categoria) {
        throw new Error(`Producto incompleto en el catalogo: ${JSON.stringify(producto).slice(0, 120)}`);
    }

    return {
        _id: id,
        nombre,
        slug: slug(nombre),
        categoria,
        precio: precioBase,
        detalle,
        activo: true,
    };
}

module.exports = { leerProductos, aDocumento, slug, ARCHIVO };