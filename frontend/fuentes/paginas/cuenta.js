'use strict';

module.exports = {
    archivo: 'cuenta.html',
    seccion: 'cuenta',
    titulo: 'Mi cuenta | ZAPI Vivero Agroecológico',
    descripcion: 'Seguí tus pedidos, cancelalos mientras están pendientes y revisá tus opiniones enviadas.',
    robots: 'noindex, nofollow',
    contenido: `
<section class="cuenta-pagina">
    <header class="cuenta-cabecera">
        <div>
            <span class="etiqueta">Mi cuenta</span>
            <h1>Hola, <span id="cuentaNombre">vecino</span>.</h1>
            <p>Acá podés seguir tus pedidos y tus opiniones.</p>
        </div>
        <div class="cuenta-acciones">
            <a class="boton boton-primario" href="./catalogo.html">
                <span class="material-symbols-outlined" aria-hidden="true">eco</span>
                Hacer un pedido
            </a>
            <a class="boton boton-secundario" id="cuentaPanelAdmin" href="./admin/index.html" hidden>
                <span class="material-symbols-outlined" aria-hidden="true">admin_panel_settings</span>
                Panel de administración
            </a>
        </div>
    </header>

    <div class="cuenta-grid">
        <aside class="cuenta-perfil">
            <span class="etiqueta">Tus datos</span>
            <dl>
                <div><dt>Nombre</dt><dd id="cuentaNombrePerfil">—</dd></div>
                <div><dt>Correo</dt><dd id="cuentaEmail">—</dd></div>
                <div><dt>Teléfono</dt><dd id="cuentaTelefono">—</dd></div>
            </dl>
            <p class="cuenta-nota">Si necesitás cambiar tus datos, escribinos por WhatsApp y lo actualizamos.</p>
            <a class="enlace-flecha" href="./contacto.html">Contactar al equipo <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span></a>
        </aside>

        <div class="cuenta-contenido">
            <p class="formulario-estado" id="cuentaEstado" role="status" aria-live="polite" hidden></p>

            <section class="cuenta-seccion" aria-labelledby="tituloPedidos">
                <div class="seccion-cabecera seccion-cabecera-fila">
                    <div>
                        <span class="etiqueta">Historial</span>
                        <h2 id="tituloPedidos">Mis pedidos</h2>
                    </div>
                </div>
                <div class="cuenta-pedidos" id="cuentaPedidos"></div>
                <div class="cuenta-vacio" id="cuentaPedidosVacio" hidden>
                    <span class="material-symbols-outlined" aria-hidden="true">receipt_long</span>
                    <h3>Todavía no hiciste pedidos</h3>
                    <p>Cuando confirmes un pedido, va a aparecer acá con su estado.</p>
                    <a class="boton boton-secundario" href="./catalogo.html">Explorar catálogo</a>
                </div>
            </section>

            <section class="cuenta-seccion" aria-labelledby="tituloTestimonios">
                <div class="seccion-cabecera">
                    <span class="etiqueta">Opiniones</span>
                    <h2 id="tituloTestimonios">Mis testimonios</h2>
                    <p>Las opiniones se publican después de la revisión del equipo.</p>
                </div>
                <div class="cuenta-testimonios" id="cuentaTestimonios"></div>
                <div class="cuenta-vacio" id="cuentaTestimoniosVacio" hidden>
                    <span class="material-symbols-outlined" aria-hidden="true">rate_review</span>
                    <h3>Todavía no enviaste opiniones</h3>
                    <p>Contanos cómo fue tu experiencia desde cualquier página del sitio.</p>
                    <button class="boton boton-secundario" type="button" data-abrir-testimonio>Dejar mi opinión</button>
                </div>
            </section>
        </div>
    </div>
</section>`,
    scripts: ['cuenta.js', 'testimonios.js']
};
