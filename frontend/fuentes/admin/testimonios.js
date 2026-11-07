'use strict';

module.exports = {
    archivo: 'testimonios.html',
    seccion: 'testimonios',
    titulo: 'Testimonios',
    descripcion: 'Moderación de opiniones de clientes de ZAPI.',
    contenido: `
<div class="admin-seccion-cabecera">
    <div>
        <span class="admin-etiqueta">Opiniones</span>
        <p>Aprobá, rechazá o editá los testimonios enviados por los clientes.</p>
    </div>
</div>

<form class="admin-filtros" id="testimoniosFiltros">
    <label class="visually-hidden" for="testimoniosBuscar">Buscar</label>
    <input class="campo-input" id="testimoniosBuscar" name="q" type="search" placeholder="Autor, texto o lugar">
    <select class="campo-input" name="estado" aria-label="Estado">
        <option value="">Todos los estados</option>
        <option value="pendiente">Pendientes</option>
        <option value="aprobado">Aprobados</option>
        <option value="rechazado">Rechazados</option>
    </select>
    <button class="boton boton-primario" type="submit">Filtrar</button>
    <button class="boton boton-secundario" type="reset">Limpiar</button>
</form>

<p class="formulario-estado" id="testimoniosEstado" role="status" aria-live="polite" hidden></p>

<div class="admin-card">
    <div class="admin-tabla-scroll">
        <table class="admin-tabla">
            <thead>
                <tr><th>Fecha</th><th>Autor</th><th>Opinión</th><th>Puntaje</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody id="testimoniosTabla"></tbody>
        </table>
    </div>
    <nav class="admin-paginacion" id="testimoniosPaginacion" aria-label="Paginación de testimonios"></nav>
</div>

<dialog class="admin-dialogo" id="testimonioDialogo" aria-labelledby="testimonioDialogoTitulo">
    <form class="admin-dialogo-caja" id="testimonioForm">
        <header class="admin-dialogo-cabecera">
            <div><span class="admin-etiqueta">Moderación</span><h2 id="testimonioDialogoTitulo">Editar testimonio</h2></div>
            <button class="icono-boton" type="button" data-cerrar-dialogo aria-label="Cerrar"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
        </header>
        <div class="admin-form-grid">
            <div><label class="campo-label" for="testimonioAutor">Autor</label><input class="campo-input" id="testimonioAutor" type="text" maxlength="120" required></div>
            <div><label class="campo-label" for="testimonioLugar">Lugar</label><input class="campo-input" id="testimonioLugar" type="text" maxlength="120"></div>
        </div>
        <label class="campo-label" for="testimonioTexto">Texto</label>
        <textarea class="campo-input" id="testimonioTexto" rows="5" maxlength="600" required></textarea>
        <div class="admin-form-grid">
            <div>
                <label class="campo-label" for="testimonioEstrellas">Puntaje</label>
                <select class="campo-input" id="testimonioEstrellas">
                    <option value="5">5 estrellas</option>
                    <option value="4">4 estrellas</option>
                    <option value="3">3 estrellas</option>
                    <option value="2">2 estrellas</option>
                    <option value="1">1 estrella</option>
                </select>
            </div>
            <div>
                <label class="campo-label" for="testimonioEstado">Estado</label>
                <select class="campo-input" id="testimonioEstado">
                    <option value="pendiente">Pendiente</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="rechazado">Rechazado</option>
                </select>
            </div>
        </div>
        <label class="campo-label" for="testimonioMotivo">Motivo de rechazo</label>
        <input class="campo-input" id="testimonioMotivo" type="text" maxlength="300">
        <p class="formulario-estado" id="testimonioFormEstado" role="status" aria-live="polite" hidden></p>
        <div class="admin-form-acciones">
            <button class="boton boton-primario" type="submit">Guardar cambios</button>
            <button class="boton boton-secundario" type="button" data-cerrar-dialogo>Cancelar</button>
        </div>
    </form>
</dialog>`,
    scripts: ['admin-testimonios.js']
};
