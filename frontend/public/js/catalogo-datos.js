'use strict';

/* Catálogo público. La API es la fuente de verdad: este archivo mantiene
   los productos y las categorías en memoria para que las páginas dibujen
   las tarjetas, el modal y el carrito con los mismos datos. */

let PRODUCTOS = [];
let CATEGORIAS = [];

let promesaCatalogo = null;
let catalogoCargado = false;
const esperasCatalogo = [];

function cuandoCatalogoListo(escucha) {
    const estado = { productos: PRODUCTOS, categorias: CATEGORIAS };

    if (catalogoCargado) {
        if (typeof escucha === 'function') escucha(estado);
        return;
    }

    if (typeof escucha === 'function') esperasCatalogo.push(escucha);
}

function obtenerProducto(id) {
    if (id && typeof id === 'object') return id;

    const buscado = Number(id);

    if (!Number.isFinite(buscado)) return null;

    return PRODUCTOS.find(producto => Number(producto.id) === buscado) || null;
}

function unidadesDe(id) {
    const producto = obtenerProducto(id);

    if (!producto) return 0;

    const stock = Number(producto.stock);

    return Number.isFinite(stock) && stock > 0 ? Math.floor(stock) : 0;
}

function textoDeStock(unidades) {
    const total = Math.max(0, Number(unidades) || 0);

    if (total === 0) return 'Sin stock';
    if (total === 1) return 'Última unidad';
    if (total <= 3) return 'Últimas ' + total + ' unidades';

    return total + ' disponibles';
}

function claseDeStock(unidades) {
    const total = Math.max(0, Number(unidades) || 0);

    if (total === 0) return 'stock-agotado';
    if (total <= 3) return 'stock-bajo';

    return 'stock-ok';
}

function rutaImagen(ruta) {
    return rutaConRaiz(ruta);
}

function rutaFicha(producto, raiz) {
    if (!producto || !producto.slug) return rutaConRaiz('catalogo.html');

    const base = raiz === undefined ? raizDelSitio() : raiz;

    return base + '/producto.html?slug=' + encodeURIComponent(producto.slug);
}

function htmlTarjetaProducto(producto, raiz) {
    const unidades = unidadesDe(producto);
    const agotado = unidades === 0;
    const imagenes = Array.isArray(producto.imagenes) && producto.imagenes.length
        ? producto.imagenes
        : [producto.imagen].filter(Boolean);
    const ficha = rutaFicha(producto, raiz);
    const boton = agotado
        ? '<span class="material-symbols-outlined" aria-hidden="true">block</span> <span>Sin stock</span>'
        : '<span class="material-symbols-outlined" aria-hidden="true">add_shopping_cart</span> <span>Agregar</span>';

    return `
        <article class="tarjeta-producto${agotado ? ' tarjeta-agotada' : ''}">
            <a class="tarjeta-imagen" href="${escaparHTML(ficha)}" data-abrir-producto="${escaparHTML(producto.id)}" aria-label="Ver ${escaparHTML(producto.nombre)}">
                <img src="${rutaImagen(escaparHTML(imagenes[0] || ''))}" alt="${escaparHTML(producto.nombre)}" loading="lazy" width="798" height="1200">
                <span class="stock ${claseDeStock(unidades)}">${escaparHTML(textoDeStock(unidades))}</span>
            </a>
            <div class="tarjeta-cuerpo">
                <span class="etiqueta">${escaparHTML(producto.categoria)}</span>
                <h3><a href="${escaparHTML(ficha)}" data-abrir-producto="${escaparHTML(producto.id)}">${escaparHTML(producto.nombre)}</a></h3>
                <p>${escaparHTML(producto.descripcion)}</p>
                <div class="tarjeta-pie">
                    <strong>${formatearPrecio(producto.precioBase)}</strong>
                    <button class="boton-agregar" type="button" data-agregar-producto="${escaparHTML(producto.id)}"${agotado ? ' disabled' : ''}>
                        ${boton}
                    </button>
                </div>
            </div>
        </article>`;
}

async function cargarCatalogo() {
    if (promesaCatalogo) return promesaCatalogo;

    promesaCatalogo = (async () => {
        let error = null;

        try {
            const datos = await API.get('/api/catalogo');

            PRODUCTOS = Array.isArray(datos.productos) ? datos.productos : [];
            CATEGORIAS = Array.isArray(datos.categorias) ? datos.categorias : [];
            catalogoCargado = true;
        } catch (fallo) {
            error = fallo;
            catalogoCargado = false;
        }

        const estado = { productos: PRODUCTOS, categorias: CATEGORIAS, error };

        esperasCatalogo.splice(0).forEach(escucha => escucha(estado));
        document.dispatchEvent(new CustomEvent('catalogo-listo', { detail: estado }));

        return estado;
    })();

    return promesaCatalogo;
}

cargarCatalogo();
