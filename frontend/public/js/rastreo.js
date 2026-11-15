'use strict';

/* Analítica anónima propia del sitio público.
   Envía eventos con sendBeacon al endpoint /api/eventos de los servidores
   de ZAPI. No guarda IP. No registra en modo cliente ni en el panel de admin.
   Si no hay API configurada, no hace nada. */

(function () {
    if (typeof window.hayApiConfigurada !== 'function' || !window.hayApiConfigurada()) return;
    if (window.modoCliente || document.body.classList.contains('admin-page')) return;

    const endpoint = window.urlApi('/api/eventos');
    const claveSesion = 'zapiSesion';
    let idSesion = sessionStorage.getItem(claveSesion);
    if (!idSesion) {
        idSesion = (typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID())
            || Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem(claveSesion, idSesion);
    }

    const dispositivo = /Mobi|Android/i.test(navigator.userAgent || '') ? 'movil' : 'computadora';
    const pagina = location.pathname;

    const ELEMENTOS_VALIDOS = Object.freeze([
        null, 'boton-primario', 'boton-secundario', 'add-cart',
        'boton-confirmar-pedido', 'whatsapp'
    ]);

    function esElementoValido(elemento) {
        return ELEMENTOS_VALIDOS.includes(elemento);
    }

    function enviar(tipo, elemento) {
        if (!esElementoValido(elemento)) return;
        const evento = { tipo, idSesion, pagina, elemento: elemento || null, dispositivo };
        fetch(endpoint, {
            method: 'POST',
            keepalive: true,
            credentials: 'omit',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(evento)
        }).catch(() => { /* No crítica: la analítica no debe romper la navegación. */ });
    }

    enviar('vista_de_pagina');

    document.addEventListener('click', evento => {
        const boton = evento.target.closest('button, a');
        if (!boton) return;
        const href = boton.getAttribute('href') || '';
        const texto = (boton.textContent || '').trim();
        if (href.startsWith('https://wa.me')) return enviar('clic_a_whatsapp', 'whatsapp');
        if (boton.id === 'whatsappButton' || /confirmar pedido/i.test(texto))
            return enviar('inicio_de_pedido', 'boton-confirmar-pedido');
        if (boton.classList.contains('add-cart')) return enviar('agregar_al_carrito', 'add-cart');
        if (boton.classList.contains('boton-primario') || boton.classList.contains('boton-secundario'))
            return enviar('clic_elemento_clave', boton.classList.contains('boton-primario') ? 'boton-primario' : 'boton-secundario');
    });
})();
