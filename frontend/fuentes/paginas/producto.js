'use strict';

const { NEGOCIO, formatearPrecio, textoDeStock, claseDeStock, slug } = require('../../public/js/negocio.js');
const { PRODUCTOS } = require('../../datos/catalogo.js');

function escapar(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, caracter => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[caracter]));
}

function imagenesDe(producto) {
    return Array.isArray(producto.imagenes) && producto.imagenes.length
        ? producto.imagenes
        : [producto.imagen].filter(Boolean);
}

function unidadesDe(producto) {
    const stock = Number(producto.stock);
    return Number.isFinite(stock) && stock > 0 ? Math.floor(stock) : 0;
}

function infoHtml(producto) {
    return (producto.infoDeVenta || [])
        .map(item => `<li><span class="material-symbols-outlined" aria-hidden="true">check_circle</span><span>${escapar(item)}</span></li>`)
        .join('');
}

function miniaturasHtml(producto) {
    const imagenes = imagenesDe(producto);

    if (imagenes.length < 2) return '';

    return `<div class="producto-miniaturas" id="productoMiniaturas">
        ${imagenes.map((foto, indice) => `
            <button class="producto-miniatura${indice === 0 ? ' activa' : ''}" type="button" data-indice-foto="${indice}" aria-label="Ver foto ${indice + 1} de ${imagenes.length}" aria-current="${indice === 0 ? 'true' : 'false'}">
                <img src="${escapar(foto)}" alt="" loading="lazy">
            </button>`).join('')}
    </div>`;
}

function relacionadosHtml(producto) {
    const mismaCategoria = PRODUCTOS.filter(p => p.id !== producto.id && p.categoria === producto.categoria);
    const otros = PRODUCTOS.filter(p => p.id !== producto.id && p.categoria !== producto.categoria);
    const relacionados = mismaCategoria.concat(otros).slice(0, 3);

    if (!relacionados.length) return '';

    return `<section class="producto-relacionados relacionados" id="productoRelacionados">
        <h2>También te puede gustar</h2>
        <ul class="relacionados-grid" id="productoRelacionadosGrid">
            ${relacionados.map(p => {
                const unidades = unidadesDe(p);
                return `<li><a class="relacionado" href="producto-${slug(p.nombre)}.html">
                    <img src="${escapar(p.imagen)}" alt="${escapar(p.nombre)}" loading="lazy" width="798" height="1200">
                    <span class="relacionado-nombre">${escapar(p.nombre)}</span>
                    <span class="relacionado-precio">${formatearPrecio(p.precioBase)}</span>
                    <span class="stock ${claseDeStock(unidades)}">${textoDeStock(unidades)}</span>
                </a></li>`;
            }).join('')}
        </ul>
    </section>`;
}

function generarFicha(producto) {
    const unidades = unidadesDe(producto);
    const agotado = unidades === 0;
    const stockVisual = agotado ? 'agotado' : unidades <= 3 ? 'pocas' : '';
    const imagenes = imagenesDe(producto);
    const principal = imagenes[0] || '';
    const whatsappUrl = 'https://wa.me/' + NEGOCIO.whatsapp + '?text=' + encodeURIComponent(
        'Hola ZAPI, me interesa ' + producto.nombre + ' (' + formatearPrecio(producto.precioBase) + '). ¿Está disponible?'
    );

    return {
        seccion: 'producto',
        archivo: 'producto-' + producto.slug + '.html',
        titulo: producto.nombre + ' | ZAPI Vivero Agroecológico',
        descripcion: producto.descripcion,
        canonical: NEGOCIO.sitio + '/producto-' + producto.slug + '.html',
        robots: 'index, follow',
        productos: true,
        scripts: ['producto.js'],
        bodyAttrs: 'data-producto-id="' + producto.id + '"',
        contenido: `
<nav class="migas" aria-label="Ruta de navegacion">
    <ol>
        <li><a href="./index.html">Inicio</a></li>
        <li><a href="./catalogo.html">Catalogo</a></li>
        <li aria-current="page">${escapar(producto.nombre)}</li>
    </ol>
</nav>
<article class="producto">
    <div class="producto-galeria">
        <img class="producto-principal" id="productoImagen" src="${escapar(principal)}" alt="${escapar(producto.nombre)}" loading="lazy" width="798" height="1200">
        ${miniaturasHtml(producto)}
    </div>
    <div class="producto-datos">
        <span class="producto-categoria" id="productoCategoria">${escapar(producto.categoria)}</span>
        <h1 id="productoTitulo">${escapar(producto.nombre)}</h1>
        <p class="producto-descripcion" id="productoDescripcion">${escapar(producto.descripcion)}</p>
        <p class="producto-precio" id="productoPrecio">${formatearPrecio(producto.precioBase)}</p>
        <p class="producto-stock stock ${claseDeStock(unidades)} ${stockVisual}" id="productoStock">${textoDeStock(unidades)}</p>
        <ul class="producto-info" id="productoInfo">${infoHtml(producto)}</ul>
        <div class="producto-acciones">
            <button class="agregar" id="productoAgregar" data-agregar-producto="${producto.id}" type="button"${agotado ? ' disabled' : ''}>
                ${agotado
                    ? '<span class="material-symbols-outlined" aria-hidden="true">block</span> Sin stock'
                    : '<span class="material-symbols-outlined" aria-hidden="true">add_shopping_cart</span> Agregar al carrito'
                }
            </button>
            <a class="whatsapp boton boton-whatsapp boton-bloque" id="productoWhatsapp" href="${whatsappUrl}" target="_blank" rel="noopener">
                <span class="material-symbols-outlined" aria-hidden="true">chat</span> Consultar por WhatsApp
            </a>
        </div>
        <p class="producto-aviso"><span class="material-symbols-outlined" aria-hidden="true">info</span> El stock se publica manualmente; consultá disponibilidad antes de comprar.</p>
    </div>
</article>
${relacionadosHtml(producto)}`
    };
}

module.exports = { generarFicha };
