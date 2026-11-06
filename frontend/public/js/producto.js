'use strict';

/* Ficha dinámica de producto. La página es una sola: el slug de la URL
   decide qué producto pide a la API y qué datos estructurados se inyectan
   para los buscadores. */

const slugProducto = new URLSearchParams(window.location.search).get('slug');

let productoActual = null;
let indiceFoto = 0;

function mostrarErrorProducto(mensaje) {
    const error = document.getElementById('productoError');
    const detalle = document.getElementById('productoDetalle');
    const relacionados = document.getElementById('productoRelacionados');

    if (detalle) detalle.hidden = true;
    if (relacionados) relacionados.hidden = true;

    if (error) {
        error.hidden = false;
        const texto = error.querySelector('p');

        if (texto) texto.textContent = mensaje;
    }
}

function mostrarFotoProducto(indice) {
    if (!productoActual) return;

    const fotos = productoActual.imagenes && productoActual.imagenes.length
        ? productoActual.imagenes
        : [productoActual.imagen].filter(Boolean);

    if (!fotos.length) return;

    indiceFoto = (indice + fotos.length) % fotos.length;

    const principal = document.getElementById('productoImagen');

    if (principal) {
        principal.src = rutaConRaiz(fotos[indiceFoto]);
        principal.alt = productoActual.nombre + ', foto ' + (indiceFoto + 1) + ' de ' + fotos.length;
    }

    document.querySelectorAll('#productoMiniaturas .producto-miniatura').forEach((boton, posicion) => {
        const activa = posicion === indiceFoto;

        boton.classList.toggle('activa', activa);
        boton.setAttribute('aria-current', activa ? 'true' : 'false');
    });
}

function pintarMiniaturas(producto) {
    const contenedor = document.getElementById('productoMiniaturas');
    const fotos = producto.imagenes && producto.imagenes.length
        ? producto.imagenes
        : [producto.imagen].filter(Boolean);

    if (!contenedor) return;

    if (fotos.length < 2) {
        contenedor.hidden = true;
        return;
    }

    contenedor.hidden = false;
    contenedor.innerHTML = fotos.map((foto, indice) => `
        <button class="producto-miniatura" type="button" data-indice-foto="${indice}" aria-label="Ver foto ${indice + 1} de ${fotos.length}">
            <img src="${rutaConRaiz(escaparHTML(foto))}" alt="" loading="lazy">
        </button>`).join('');
}

function inyectarJsonLd(producto) {
    const anterior = document.getElementById('jsonLdProducto');
    const imagenes = (producto.imagenes && producto.imagenes.length ? producto.imagenes : [producto.imagen])
        .filter(Boolean)
        .map(foto => NEGOCIO.sitio + '/' + String(foto).replace(/^\/+/, ''));
    const datos = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: producto.nombre,
        description: producto.descripcion,
        sku: String(producto.id),
        image: imagenes,
        brand: { '@type': 'Brand', name: NEGOCIO.nombre },
        offers: {
            '@type': 'Offer',
            priceCurrency: 'UYU',
            price: producto.precioBase,
            availability: producto.stock > 0
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            url: NEGOCIO.sitio + '/producto.html?slug=' + encodeURIComponent(producto.slug)
        }
    };

    if (anterior) anterior.remove();

    const script = document.createElement('script');

    script.type = 'application/ld+json';
    script.id = 'jsonLdProducto';
    script.textContent = JSON.stringify(datos);
    document.head.appendChild(script);
}

function actualizarMetadatos(producto) {
    const url = NEGOCIO.sitio + '/producto.html?slug=' + encodeURIComponent(producto.slug);
    const imagen = producto.imagen
        ? NEGOCIO.sitio + '/' + String(producto.imagen).replace(/^\/+/, '')
        : NEGOCIO.sitio + '/public/img/plants-hero.opt.jpg';

    document.title = producto.nombre + ' | ZAPI Vivero Agroecológico';

    const descripcion = document.querySelector('meta[name="description"]');
    const canonical = document.querySelector('link[rel="canonical"]');
    const ogTitulo = document.querySelector('meta[property="og:title"]');
    const ogDescripcion = document.querySelector('meta[property="og:description"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');
    const ogImagen = document.querySelector('meta[property="og:image"]');

    if (descripcion) descripcion.content = producto.descripcion;
    if (canonical) canonical.href = url;
    if (ogTitulo) ogTitulo.content = producto.nombre;
    if (ogDescripcion) ogDescripcion.content = producto.descripcion;
    if (ogUrl) ogUrl.content = url;
    if (ogImagen) ogImagen.content = imagen;
}

function pintarProducto(producto) {
    productoActual = producto;

    const categoria = document.getElementById('productoCategoria');
    const categoriaMiga = document.getElementById('productoCategoriaMiga');
    const titulo = document.getElementById('productoTitulo');
    const precio = document.getElementById('productoPrecio');
    const stock = document.getElementById('productoStock');
    const descripcion = document.getElementById('productoDescripcion');
    const info = document.getElementById('productoInfo');
    const agregar = document.getElementById('productoAgregar');
    const whatsapp = document.getElementById('productoWhatsapp');
    const testimonio = document.getElementById('productoTestimonio');
    const unidades = unidadesDe(producto);

    if (categoria) categoria.textContent = producto.categoria;
    if (categoriaMiga) categoriaMiga.textContent = producto.categoria;
    if (titulo) titulo.textContent = producto.nombre;
    if (precio) precio.textContent = formatearPrecio(producto.precioBase);
    if (stock) {
        stock.textContent = textoDeStock(unidades);
        stock.className = 'stock ' + claseDeStock(unidades);
    }
    if (descripcion) descripcion.textContent = producto.descripcion;
    if (info) {
        info.innerHTML = (producto.infoDeVenta || [])
            .map(item => `<li><span class="material-symbols-outlined" aria-hidden="true">check_circle</span><span>${escaparHTML(item)}</span></li>`)
            .join('');
    }

    if (agregar) {
        agregar.disabled = unidades === 0;
        agregar.dataset.agregarProducto = String(producto.id);
        agregar.innerHTML = unidades === 0
            ? '<span class="material-symbols-outlined" aria-hidden="true">block</span> Sin stock'
            : '<span class="material-symbols-outlined" aria-hidden="true">add_shopping_cart</span> Agregar al carrito';
    }

    if (whatsapp) {
        whatsapp.href = 'https://wa.me/' + CONFIG.negocio.whatsapp + '?text=' + encodeURIComponent(
            'Hola ZAPI, me interesa ' + producto.nombre + ' (' + formatearPrecio(producto.precioBase) + '). ¿Está disponible?'
        );
    }

    if (testimonio) testimonio.dataset.productoId = String(producto.id);

    pintarMiniaturas(producto);
    mostrarFotoProducto(0);

    const detalle = document.getElementById('productoDetalle');
    if (detalle) detalle.hidden = false;

    actualizarMetadatos(producto);
    inyectarJsonLd(producto);
}

function pintarRelacionados() {
    if (!productoActual) return;

    const seccion = document.getElementById('productoRelacionados');
    const grilla = document.getElementById('productoRelacionadosGrid');

    if (!seccion || !grilla) return;

    const mismaCategoria = PRODUCTOS.filter(producto =>
        producto.id !== productoActual.id && producto.categoria === productoActual.categoria
    );
    const otros = PRODUCTOS.filter(producto =>
        producto.id !== productoActual.id && producto.categoria !== productoActual.categoria
    );
    const relacionados = mismaCategoria.concat(otros).slice(0, 3);

    if (!relacionados.length) {
        seccion.hidden = true;
        return;
    }

    grilla.innerHTML = relacionados.map(producto => `
        <a class="relacionado" href="${escaparHTML(rutaFicha(producto))}">
            <img src="${rutaConRaiz(escaparHTML(producto.imagen))}" alt="${escaparHTML(producto.nombre)}" loading="lazy" width="798" height="1200">
            <span>${escaparHTML(producto.nombre)}</span>
            <strong>${formatearPrecio(producto.precioBase)}</strong>
        </a>`).join('');

    seccion.hidden = false;
}

async function cargarProducto() {
    if (!slugProducto) {
        mostrarErrorProducto('No indicaste qué producto querés ver.');
        return;
    }

    try {
        const datos = await API.get('/api/catalogo/' + encodeURIComponent(slugProducto));

        pintarProducto(datos.producto);
        pintarRelacionados();
    } catch (error) {
        if (error.estado === 404) {
            mostrarErrorProducto('El producto que buscás no existe o ya no está disponible.');
            return;
        }

        mostrarErrorProducto('No pudimos cargar el producto. Revisá tu conexión e intentá de nuevo.');
    }
}

document.addEventListener('click', evento => {
    const miniatura = evento.target.closest('[data-indice-foto]');

    if (miniatura) {
        mostrarFotoProducto(Number(miniatura.dataset.indiceFoto));
        return;
    }

    const agregar = evento.target.closest('#productoAgregar');

    if (!agregar || !productoActual) return;

    if (!agregarProductoAlCarrito(productoActual.id)) {
        mostrarAviso('Sin stock', 'No quedan más unidades de ' + productoActual.nombre + '.');
        return;
    }

    agregar.classList.add('agregado');
    agregar.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">check</span> ¡Agregado!';

    window.setTimeout(() => {
        if (!productoActual) return;

        agregar.classList.remove('agregado');
        agregar.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">add_shopping_cart</span> Agregar al carrito';
    }, 1400);
});

cuandoCatalogoListo(pintarRelacionados);
cargarProducto();
