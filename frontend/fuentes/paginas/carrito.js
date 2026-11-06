'use strict';

module.exports = {
    archivo: 'carrito.html',
    seccion: 'carrito',
    titulo: 'Carrito | ZAPI Vivero Agroecológico',
    descripcion: 'Revisá tu pedido de ZAPI, completá tus datos y confirmá la entrega.',
    robots: 'noindex, follow',
    contenido: `
<section class="carrito-pagina">
    <div class="carrito-contenido">
        <div class="carrito-cabecera">
            <div>
                <span class="etiqueta">Tu selección</span>
                <h1>Tu carrito</h1>
            </div>
            <button class="boton-texto" id="clearCart" type="button">
                <span class="material-symbols-outlined" aria-hidden="true">delete_sweep</span>
                Vaciar carrito
            </button>
        </div>

        <div class="carrito-items" id="cartItems"></div>

        <div class="carrito-vacio" id="emptyCart" hidden>
            <span class="material-symbols-outlined" aria-hidden="true">shopping_basket</span>
            <h2>Tu carrito está vacío</h2>
            <p>Todavía no agregaste ningún producto. Explorá el catálogo y encontrá algo para tu jardín o huerta.</p>
            <a class="boton boton-primario" href="./catalogo.html">
                <span class="material-symbols-outlined" aria-hidden="true">eco</span>
                Explorar catálogo
            </a>
        </div>

        <a class="enlace-flecha" href="./catalogo.html">
            <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
            Seguir comprando
        </a>

        <section class="seccion recomendaciones" id="recommendations" aria-labelledby="tituloRecomendaciones" hidden>
            <div class="seccion-cabecera">
                <span class="etiqueta">Te puede interesar</span>
                <h2 id="tituloRecomendaciones">Recomendamos para tu compra</h2>
            </div>
            <div class="productos-grid" id="recommendationsList"></div>
        </section>
    </div>

    <aside class="carrito-resumen" aria-labelledby="tituloResumen">
        <div class="resumen-cabecera">
            <span class="etiqueta">Resumen</span>
            <h2 id="tituloResumen">Tu pedido</h2>
        </div>

        <div class="envio-progreso" id="shippingProgressSection">
            <p id="shippingProgressMessage" aria-live="polite"></p>
            <div class="envio-barra" id="shippingProgress" role="progressbar" aria-label="Progreso hacia el envío gratis" aria-valuemin="0" aria-valuemax="2500" aria-valuenow="0">
                <span id="shippingProgressFill"></span>
            </div>
            <p class="envio-nota">Envío gratis desde <span data-shipping-threshold></span></p>
        </div>

        <div class="resumen-lineas">
            <div><span>Productos</span><strong id="subtotal">$ 0</strong></div>
            <div><span>Envío</span><strong id="shipping">$ 0</strong></div>
        </div>
        <div class="resumen-total">
            <span>Total</span>
            <div><strong id="total">$ 0</strong><small id="shippingPendingNote" hidden>+ envío a coordinar</small></div>
        </div>

        <form class="checkout-form" id="checkoutForm" novalidate>
            <h2>Datos de contacto</h2>
            <label class="campo-label" for="pedNombre">Nombre <span aria-hidden="true">*</span></label>
            <input class="campo-input" id="pedNombre" name="nombre" type="text" autocomplete="name" maxlength="120" aria-describedby="pedErrorNombre">
            <span class="campo-error" id="pedErrorNombre"></span>

            <label class="campo-label" for="pedTelefono">Teléfono <span aria-hidden="true">*</span></label>
            <input class="campo-input" id="pedTelefono" name="telefono" type="tel" autocomplete="tel" inputmode="tel" maxlength="40" aria-describedby="pedErrorTelefono">
            <span class="campo-error" id="pedErrorTelefono"></span>

            <label class="campo-label" for="pedEmail">Correo electrónico (opcional)</label>
            <input class="campo-input" id="pedEmail" name="email" type="email" autocomplete="email" inputmode="email" maxlength="160">

            <label class="campo-label" for="pedZona">Zona (opcional)</label>
            <input class="campo-input" id="pedZona" name="zona" type="text" autocomplete="address-level2" maxlength="120">

            <label class="campo-label" for="pedNotas">Notas (opcional)</label>
            <textarea class="campo-input" id="pedNotas" name="notas" rows="3" maxlength="500"></textarea>

            <p class="formulario-estado" id="pedEstado" role="status" aria-live="polite" hidden></p>
            <button class="boton boton-primario boton-bloque" id="whatsappButton" type="submit">
                <span class="material-symbols-outlined" aria-hidden="true">check_circle</span>
                Confirmar pedido
            </button>
        </form>

        <p class="resumen-nota"><span class="material-symbols-outlined" aria-hidden="true">verified_user</span> El pedido queda guardado en tu cuenta y se coordina con ZAPI.</p>
        <button class="boton boton-secundario boton-bloque" type="button" data-abrir-testimonio>
            <span class="material-symbols-outlined" aria-hidden="true">rate_review</span>
            Dejar un testimonio
        </button>
    </aside>
</section>`,
    scripts: ['carrito.js', 'testimonios.js']
};
