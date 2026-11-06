'use strict';

/* Portada: destacados desde la API y opiniones aprobadas. Las tarjetas se
   dibujan con el mismo constructor que el catálogo. */

function estrellasDeOpinion(valor) {
    const nota = Math.min(5, Math.max(0, Math.round(Number(valor) || 0)));
    let salida = '';

    for (let i = 0; i < 5; i++) salida += i < nota ? '★' : '☆';

    return `<span class="estrellas" role="img" aria-label="${nota} de 5 estrellas">${salida}</span>`;
}

function inicialesDe(nombre) {
    return String(nombre || '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(parte => Array.from(parte)[0] || '')
        .join('')
        .toUpperCase();
}

function fechaDeOpinion(iso) {
    const fecha = new Date(iso);

    if (Number.isNaN(fecha.getTime())) return '';

    return new Intl.DateTimeFormat('es-UY', {
        month: 'long',
        year: 'numeric'
    }).format(fecha);
}

function renderDestacados() {
    const grilla = document.getElementById('productosDestacados');

    if (!grilla) return;

    const destacados = PRODUCTOS.filter(producto => producto.destacado).slice(0, 4);
    const lista = destacados.length ? destacados : PRODUCTOS.slice(0, 4);

    if (!lista.length) {
        grilla.innerHTML = '<p class="catalogo-vacio">Todavía no hay productos publicados.</p>';
        return;
    }

    grilla.innerHTML = lista.map(producto => htmlTarjetaProducto(producto)).join('');
}

function htmlOpinion(opinion) {
    const producto = opinion.productoId ? obtenerProducto(opinion.productoId) : null;
    const sobre = producto
        ? `<a class="opinion-producto" href="${escaparHTML(rutaFicha(producto))}">Sobre: ${escaparHTML(producto.nombre)}</a>`
        : '';

    return `
        <article class="opinion">
            ${estrellasDeOpinion(opinion.estrellas)}
            <blockquote><p>${escaparHTML(opinion.texto)}</p></blockquote>
            <footer class="opinion-firma">
                <span class="opinion-avatar" aria-hidden="true">${escaparHTML(inicialesDe(opinion.autor))}</span>
                <div>
                    <cite>${escaparHTML(opinion.autor)}</cite>
                    <span>${escaparHTML(opinion.lugar || 'Montevideo')} · ${escaparHTML(fechaDeOpinion(opinion.fecha))}</span>
                </div>
            </footer>
            ${sobre}
        </article>`;
}

async function renderTestimonios() {
    const contenedor = document.getElementById('testimoniosLista');

    if (!contenedor) return;

    try {
        const datos = await API.get('/api/testimonios');
        const testimonios = Array.isArray(datos.testimonios) ? datos.testimonios : [];

        contenedor.innerHTML = testimonios.length
            ? `<div class="testimonios-grid">${testimonios.map(htmlOpinion).join('')}</div>`
            : '<p class="testimonios-vacio">Todavía no publicamos opiniones. Si compraste con nosotros, nos encantará leer tu experiencia.</p>';
    } catch {
        contenedor.innerHTML = '<p class="testimonios-vacio">No pudimos cargar las opiniones en este momento.</p>';
    }
}

cuandoCatalogoListo(renderDestacados);
renderTestimonios();
