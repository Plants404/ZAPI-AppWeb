'use strict';

/* Aplica a cada página el contenido y los colores publicados desde
   "Estilo del sitio". El HTML ya trae los textos originales: si no hay nada
   publicado, o la API no responde, la página queda tal cual. */

(function () {
    const esquema = window.ESQUEMA_EDITABLE;
    if (!esquema) return;

    function urlDeImagen(id) {
        const ruta = '/api/imagenes/' + id;
        return typeof window.urlApi === 'function' ? window.urlApi(ruta) : ruta;
    }

    function aplicarColores(doc, colores) {
        if (!colores) return;
        const estilo = doc.documentElement.style;
        if (colores.primario) estilo.setProperty('--forest', colores.primario);
        if (colores.secundario) estilo.setProperty('--moss', colores.secundario);
        if (colores.acento) estilo.setProperty('--leaf', colores.acento);
    }

    function aplicarCampo(doc, campo, valor) {
        const elementos = doc.querySelectorAll(campo.selector);
        if (!elementos.length) return;

        if (campo.tipo === 'imagen') {
            if (!valor || !/^[a-f0-9]{24}$/.test(valor.id || '')) return;
            elementos.forEach(img => {
                if (img.tagName !== 'IMG') return;
                img.removeAttribute('srcset');
                img.removeAttribute('sizes');
                img.src = urlDeImagen(valor.id);
                if (typeof valor.alt === 'string') img.alt = valor.alt;
            });
            return;
        }

        if (typeof valor !== 'string' || !valor.trim()) return;
        elementos.forEach(elemento => { elemento.textContent = valor; });
    }

    /* contenido = { pagina: { seccion: { campo: valor } } } */
    function aplicarContenido(doc, paginaId, contenido) {
        const pagina = esquema.buscarPagina(paginaId);
        const deLaPagina = contenido && contenido[paginaId];
        if (!pagina || !deLaPagina) return;

        pagina.secciones.forEach(seccion => {
            const valores = deLaPagina[seccion.id];
            if (!valores) return;
            seccion.campos.forEach(campo => {
                if (valores[campo.id] !== undefined) aplicarCampo(doc, campo, valores[campo.id]);
            });
        });
    }

    /* Lo usa la vista previa del panel con el borrador sin publicar. */
    window.ZapiEditable = { aplicarContenido, aplicarColores };

    /* Dentro de la vista previa el panel aplica el borrador por su cuenta. */
    if (window.name === 'zapi-vista-previa') return;

    const pagina = esquema.buscarPaginaPorArchivo(window.location.pathname);
    if (!pagina || typeof window.urlApi !== 'function') return;

    fetch(window.urlApi('/api/publicado'))
        .then(respuesta => (respuesta.ok ? respuesta.json() : null))
        .then(datos => {
            if (!datos) return;
            aplicarColores(document, datos.estilo && datos.estilo.colores);
            aplicarContenido(document, pagina.id, datos.contenido);
        })
        .catch(() => { /* Sin servidor, queda la página original. */ });
})();
