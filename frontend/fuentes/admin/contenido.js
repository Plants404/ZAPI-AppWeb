'use strict';

module.exports = {
    archivo: 'contenido.html',
    seccion: 'contenido',
    titulo: 'Contenido',
    descripcion: 'Edición de los textos e imágenes fijas del sitio de ZAPI.',
    contenido: `
<div class="admin-seccion-cabecera">
    <div>
        <span class="admin-etiqueta">Sitio público</span>
        <p>Editá textos, imágenes y enlaces. El panel nunca guarda HTML libre.</p>
    </div>
    <a class="boton boton-secundario" href="../index.html" target="_blank" rel="noopener">Ver el sitio</a>
</div>

<div class="admin-tabs" id="contenidoTabs" role="tablist" aria-label="Secciones de contenido">
    <button class="admin-tab activo" type="button" role="tab" aria-selected="true" data-contenido-seccion="negocio">Negocio</button>
    <button class="admin-tab" type="button" role="tab" aria-selected="false" data-contenido-seccion="portada">Portada</button>
    <button class="admin-tab" type="button" role="tab" aria-selected="false" data-contenido-seccion="servicios">Servicios</button>
    <button class="admin-tab" type="button" role="tab" aria-selected="false" data-contenido-seccion="nosotros">Nosotros</button>
    <button class="admin-tab" type="button" role="tab" aria-selected="false" data-contenido-seccion="contacto">Contacto</button>
    <button class="admin-tab" type="button" role="tab" aria-selected="false" data-contenido-seccion="promociones">Promociones</button>
</div>

<p class="formulario-estado" id="contenidoEstado" role="status" aria-live="polite" hidden></p>

<form class="admin-card admin-form" id="contenidoForm" novalidate>
    <div id="contenidoEditor" class="admin-editor"></div>
    <div class="admin-form-acciones">
        <button class="boton boton-primario" type="submit" id="contenidoGuardar">Guardar sección</button>
        <button class="boton boton-secundario" type="button" id="contenidoDescartar">Descartar cambios</button>
    </div>
</form>

<aside class="admin-card admin-preview">
    <header class="admin-card-cabecera"><div><span class="admin-etiqueta">Vista previa</span><h2>Así se va a ver</h2></div></header>
    <div id="contenidoPreview" class="admin-preview-caja"></div>
</aside>`,
    scripts: ['admin-contenido.js']
};
