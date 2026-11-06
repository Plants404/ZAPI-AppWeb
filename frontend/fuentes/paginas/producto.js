'use strict';

module.exports = {
    archivo: 'producto.html',
    seccion: 'producto',
    titulo: 'Producto | ZAPI Vivero Agroecológico',
    descripcion: 'Conocé las plantas y kits de ZAPI, con precios, stock y cuidados para tu espacio.',
    canonical: 'https://zapi.uy/producto.html',
    contenido: `
<section class="producto-pagina">
    <nav class="migas" aria-label="Ruta de navegación">
        <ol>
            <li><a href="./index.html">Inicio</a></li>
            <li><a href="./catalogo.html">Catálogo</a></li>
            <li id="productoCategoriaMiga">Producto</li>
        </ol>
    </nav>

    <div class="producto-error" id="productoError" role="alert" hidden>
        <span class="material-symbols-outlined" aria-hidden="true">potted_plant</span>
        <h1>No pudimos mostrar este producto</h1>
        <p>El producto que buscás no existe o ya no está disponible.</p>
        <a class="boton boton-primario" href="./catalogo.html">Volver al catálogo</a>
    </div>

    <div class="producto-detalle" id="productoDetalle">
        <div class="producto-galeria">
            <img class="producto-principal" id="productoImagen" src="./public/img/plants-hero.opt.jpg" alt="" width="798" height="1200">
            <div class="producto-miniaturas" id="productoMiniaturas" hidden></div>
        </div>

        <div class="producto-datos">
            <span class="etiqueta" id="productoCategoria">Producto</span>
            <h1 id="productoTitulo">Cargando producto…</h1>
            <p class="producto-precio" id="productoPrecio"></p>
            <p class="stock" id="productoStock"></p>
            <p class="producto-descripcion" id="productoDescripcion"></p>
            <ul class="lista-ventajas" id="productoInfo"></ul>

            <div class="producto-acciones">
                <button class="boton boton-primario" id="productoAgregar" type="button" disabled>
                    <span class="material-symbols-outlined" aria-hidden="true">add_shopping_cart</span>
                    Agregar al carrito
                </button>
                <a class="boton boton-secundario" id="productoWhatsapp" href="https://wa.me/" target="_blank" rel="noopener">
                    <span class="material-symbols-outlined" aria-hidden="true">chat</span>
                    Consultar por WhatsApp
                </a>
            </div>

            <button class="boton-texto" id="productoTestimonio" type="button" data-abrir-testimonio>
                <span class="material-symbols-outlined" aria-hidden="true">rate_review</span>
                Dejar una opinión sobre este producto
            </button>

            <p class="producto-aviso"><span class="material-symbols-outlined" aria-hidden="true">local_shipping</span> Envío gratis desde <span data-envio-gratis></span>. Coordinamos la entrega por WhatsApp.</p>
        </div>
    </div>

    <section class="relacionados" id="productoRelacionados" aria-labelledby="tituloRelacionados" hidden>
        <div class="seccion-cabecera">
            <span class="etiqueta">Seguí explorando</span>
            <h2 id="tituloRelacionados">También te puede interesar</h2>
        </div>
        <div class="relacionados-grid" id="productoRelacionadosGrid"></div>
    </section>
</section>`,
    scripts: ['producto.js', 'testimonios.js']
};
