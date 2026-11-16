'use strict';

/* Modo "ver como cliente": quien administra recorre el sitio real y ve un aviso
   flotante con el botón para volver. La marca la deja el panel en sessionStorage
   (solo de esta pestaña). No cambia permisos: únicamente muestra el aviso y evita
   registrar analítica. */

(function () {
    /* Vista previa del panel (iframe): sin aviso y sin analítica. */
    if (window.name === 'zapi-vista-previa') {
        window.modoCliente = true;
        return;
    }
    let destino = null;
    try {
        if (sessionStorage.getItem('zapiModoCliente') === '1') {
            destino = sessionStorage.getItem('zapiVolverA');
        }
    } catch (error) {
        return;
    }
    if (!destino || document.body.classList.contains('admin-page')) return;

    window.modoCliente = true;

    function mostrarAviso() {
        const aviso = document.createElement('aside');
        aviso.className = 'modo-cliente-aviso';
        aviso.setAttribute('role', 'status');

        const titulo = document.createElement('strong');
        titulo.textContent = 'Estás viendo el sitio como cliente';
        const texto = document.createElement('span');
        texto.textContent = 'Modo prueba: tus clics no se registran en la analítica.';
        const volver = document.createElement('a');
        volver.href = destino;
        volver.textContent = 'Volver al administrador';
        volver.addEventListener('click', () => {
            try {
                sessionStorage.removeItem('zapiModoCliente');
            } catch (error) { /* sin almacenamiento */ }
        });

        aviso.append(titulo, texto, volver);
        document.body.appendChild(aviso);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mostrarAviso);
    } else {
        mostrarAviso();
    }
}());
