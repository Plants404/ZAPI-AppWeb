'use strict';
(function () {

    const ESTRELLAS = 5;
    const LARGO = { autor: 120, lugar: 120, texto: 600 };
    const MINIMOS = { autor: 2, texto: 10 };

    let raiz = null;
    let valor = 0;
    let ultimoFoco = null;

    function construir() {

        raiz = document.createElement("div");
        raiz.className = "testimonio-modal";
        raiz.hidden = true;

        const fondo = document.createElement("div");
        fondo.className = "testimonio-fondo";
        fondo.dataset.cerrar = "";

        const caja = document.createElement("div");
        caja.className = "testimonio-caja";
        caja.setAttribute("role", "dialog");
        caja.setAttribute("aria-modal", "true");
        caja.setAttribute("aria-labelledby", "testimonioTitulo");
        caja.tabIndex = -1;

        const cerrarX = document.createElement("button");
        cerrarX.type = "button";
        cerrarX.className = "testimonio-cerrar-x";
        cerrarX.dataset.cerrar = "";
        cerrarX.setAttribute("aria-label", "Cerrar");
        cerrarX.textContent = "×";

        const titulo = document.createElement("h2");
        titulo.className = "testimonio-titulo";
        titulo.id = "testimonioTitulo";
        titulo.textContent = "¿Nos dejás tu opinión?";

        const bajada = document.createElement("p");
        bajada.className = "testimonio-bajada";
        bajada.textContent = "Contanos cómo te fue con ZAPI. Tu opinión nos ayuda a mejorar.";

        const form = document.createElement("form");
        form.className = "testimonio-form";
        form.noValidate = true;

        form.appendChild(construirEstrellas());
        form.appendChild(construirCampoTexto("autor", "Nombre", LARGO.autor, "name"));
        form.appendChild(construirCampoLugar());
        form.appendChild(construirCampoOpinion());

        const general = document.createElement("p");
        general.className = "testimonio-error testimonio-general";
        general.dataset.error = "general";
        general.hidden = true;
        form.appendChild(general);

        const acciones = document.createElement("div");
        acciones.className = "testimonio-acciones";

        const cancelar = document.createElement("button");
        cancelar.type = "button";
        cancelar.className = "testimonio-btn-secundario";
        cancelar.dataset.cerrar = "";
        cancelar.textContent = "Ahora no";

        const enviar = document.createElement("button");
        enviar.type = "submit";
        enviar.className = "testimonio-btn-primario";
        enviar.textContent = "Enviar opinión";

        acciones.appendChild(cancelar);
        acciones.appendChild(enviar);
        form.appendChild(acciones);

        const gracias = document.createElement("div");
        gracias.className = "testimonio-gracias";
        gracias.hidden = true;
        gracias.textContent = "¡Gracias por tu opinión! La recibimos para su revisión.";

        caja.appendChild(cerrarX);
        caja.appendChild(titulo);
        caja.appendChild(bajada);
        caja.appendChild(form);
        caja.appendChild(gracias);

        raiz.appendChild(fondo);
        raiz.appendChild(caja);
        document.body.appendChild(raiz);

        form.addEventListener("submit", enviarOpinion);
        raiz.addEventListener("click", alClic);
        document.addEventListener("keydown", alTeclado);

        const texto = raiz.querySelector("#testimonioTexto");
        const contador = raiz.querySelector("[data-contador]");

        texto.addEventListener("input", function () {
            contador.textContent = String(texto.value.length);
        });
    }

    function construirEstrellas() {

        const campo = document.createElement("div");
        campo.className = "testimonio-campo";

        const etiqueta = document.createElement("span");
        etiqueta.className = "testimonio-etiqueta";
        etiqueta.id = "testimonioEtiquetaEstrellas";
        etiqueta.textContent = "Tu calificación";

        const grupo = document.createElement("div");
        grupo.className = "testimonio-estrellas";
        grupo.setAttribute("role", "group");
        grupo.setAttribute("aria-labelledby", "testimonioEtiquetaEstrellas");

        for (let numero = 1; numero <= ESTRELLAS; numero++) {

            const estrella = document.createElement("button");
            estrella.type = "button";
            estrella.className = "testimonio-estrella";
            estrella.dataset.estrella = String(numero);
            estrella.setAttribute("aria-label", numero + (numero === 1 ? " estrella" : " estrellas"));
            estrella.setAttribute("aria-pressed", "false");
            estrella.textContent = "★";
            estrella.addEventListener("click", elegirEstrellas);
            grupo.appendChild(estrella);

        }

        campo.appendChild(etiqueta);
        campo.appendChild(grupo);
        campo.appendChild(crearError("estrellas"));

        return campo;
    }

    function idCampo(nombre) {

        return "testimonio" + nombre.charAt(0).toUpperCase() + nombre.slice(1);

    }

    function construirCampoTexto(nombre, etiqueta, maximo, autocompletar) {

        const campo = document.createElement("div");
        campo.className = "testimonio-campo";

        const label = document.createElement("label");
        label.className = "testimonio-etiqueta";
        label.setAttribute("for", idCampo(nombre));
        label.textContent = etiqueta;

        const input = document.createElement("input");
        input.type = "text";
        input.className = "testimonio-input";
        input.id = idCampo(nombre);
        input.name = nombre;
        input.maxLength = maximo;
        input.autocomplete = autocompletar;
        input.required = true;

        campo.appendChild(label);
        campo.appendChild(input);
        campo.appendChild(crearError(nombre));

        return campo;
    }

    function construirCampoLugar() {

        const campo = document.createElement("div");
        campo.className = "testimonio-campo";

        const label = document.createElement("label");
        label.className = "testimonio-etiqueta";
        label.setAttribute("for", "testimonioLugar");
        label.textContent = "¿De dónde nos escribís? (opcional)";

        const input = document.createElement("input");
        input.type = "text";
        input.className = "testimonio-input";
        input.id = "testimonioLugar";
        input.name = "lugar";
        input.maxLength = LARGO.lugar;
        input.placeholder = "Montevideo, Uruguay";

        campo.appendChild(label);
        campo.appendChild(input);
        campo.appendChild(crearError("lugar"));

        return campo;
    }

    function construirCampoOpinion() {

        const campo = document.createElement("div");
        campo.className = "testimonio-campo";

        const label = document.createElement("label");
        label.className = "testimonio-etiqueta";
        label.setAttribute("for", "testimonioTexto");
        label.textContent = "Tu opinión";

        const texto = document.createElement("textarea");
        texto.className = "testimonio-texto";
        texto.id = "testimonioTexto";
        texto.name = "texto";
        texto.maxLength = LARGO.texto;
        texto.rows = 4;
        texto.required = true;

        const contador = document.createElement("div");
        contador.className = "testimonio-contador";

        const numero = document.createElement("span");
        numero.dataset.contador = "";
        numero.textContent = "0";

        contador.appendChild(numero);
        contador.appendChild(document.createTextNode("/" + LARGO.texto));

        campo.appendChild(label);
        campo.appendChild(texto);
        campo.appendChild(contador);
        campo.appendChild(crearError("texto"));

        return campo;
    }

    function crearError(nombre) {

        const error = document.createElement("p");
        error.className = "testimonio-error";
        error.dataset.error = nombre;
        error.hidden = true;

        return error;
    }

    function abrir() {

        if (!raiz) construir();

        ultimoFoco = document.activeElement;

        reiniciar();

        raiz.hidden = false;
        document.body.classList.add("con-testimonio-abierto");

        const enviar = raiz.querySelector(".testimonio-btn-primario");
        const general = raiz.querySelector('[data-error="general"]');
        const hayApi = typeof window.hayApiConfigurada === "function"
            && window.hayApiConfigurada();

        enviar.disabled = !hayApi;
        if (!hayApi) {
            general.textContent = "El envío de opiniones no está disponible: se requiere el backend.";
            general.hidden = false;
        }

        const nombre = raiz.querySelector("#testimonioAutor");
        if (nombre) nombre.focus();
    }

    function cerrar() {

        if (!raiz || raiz.hidden) return;

        raiz.hidden = true;
        document.body.classList.remove("con-testimonio-abierto");

        if (ultimoFoco && typeof ultimoFoco.focus === "function") ultimoFoco.focus();
    }

    function reiniciar() {

        const autor = raiz.querySelector("#testimonioAutor");
        const lugar = raiz.querySelector("#testimonioLugar");
        const texto = raiz.querySelector("#testimonioTexto");
        const contador = raiz.querySelector("[data-contador]");
        const form = raiz.querySelector(".testimonio-form");
        const gracias = raiz.querySelector(".testimonio-gracias");

        const cuenta = window.zapiAuth && window.zapiAuth.usuario;

        autor.value = cuenta && cuenta.nombre ? cuenta.nombre : "";
        lugar.value = "";
        texto.value = "";
        contador.textContent = "0";

        valor = 0;
        pintarEstrellas();

        limpiarErrores();

        form.hidden = false;
        gracias.hidden = true;
    }

    function alClic(evento) {

        if (evento.target.dataset && evento.target.dataset.cerrar !== undefined) {
            cerrar();
        }
    }

    function alTeclado(evento) {

        if (!raiz || raiz.hidden) return;

        if (evento.key === "Escape") {
            cerrar();
            return;
        }

        if (evento.key !== "Tab") return;

        const caja = raiz.querySelector(".testimonio-caja");
        const enfocados = Array.from(caja.querySelectorAll(
            'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )).filter(elemento => !elemento.hidden && elemento.getClientRects().length > 0);

        if (!enfocados.length) {
            evento.preventDefault();
            caja.focus();
            return;
        }

        const primero = enfocados[0];
        const ultimo = enfocados[enfocados.length - 1];

        if (evento.shiftKey && (document.activeElement === primero || !caja.contains(document.activeElement))) {
            evento.preventDefault();
            ultimo.focus();
        } else if (!evento.shiftKey && (document.activeElement === ultimo || !caja.contains(document.activeElement))) {
            evento.preventDefault();
            primero.focus();
        }
    }

    

    function elegirEstrellas(evento) {

        valor = Number(evento.currentTarget.dataset.estrella);
        pintarEstrellas();
        limpiarError("estrellas");

    }

    function pintarEstrellas() {

        const estrellas = raiz.querySelectorAll(".testimonio-estrella");

        estrellas.forEach(function (estrella) {

            const numero = Number(estrella.dataset.estrella);
            const activa = numero <= valor;

            estrella.classList.toggle("activa", activa);
            estrella.setAttribute("aria-pressed", activa ? "true" : "false");

        });
    }

    

    function limpiarErrores() {

        raiz.querySelectorAll(".testimonio-error").forEach(function (error) {
            error.hidden = true;
            error.textContent = "";
        });

        raiz.querySelectorAll(".testimonio-input, .testimonio-texto")
            .forEach(function (campo) {
                campo.classList.remove("con-error");
            });

        const grupo = raiz.querySelector(".testimonio-estrellas");
        if (grupo) grupo.classList.remove("con-error");
    }

    function limpiarError(nombre) {

        const error = raiz.querySelector('[data-error="' + nombre + '"]');
        if (error) {
            error.hidden = true;
            error.textContent = "";
        }
    }

    function marcarError(nombre, mensaje) {

        const error = raiz.querySelector('[data-error="' + nombre + '"]');

        if (error) {
            error.textContent = mensaje;
            error.hidden = false;
        }

        if (nombre === "estrellas") {
            const grupo = raiz.querySelector(".testimonio-estrellas");
            if (grupo) grupo.classList.add("con-error");
            return;
        }

        const campo = document.getElementById(idCampo(nombre));

        if (campo) {
            campo.classList.add("con-error");
            campo.focus();
        }
    }

    

    async function enviarOpinion(evento) {

        evento.preventDefault();

        limpiarErrores();

        const autor = raiz.querySelector("#testimonioAutor").value.trim();
        const lugar = raiz.querySelector("#testimonioLugar").value.trim();
        const texto = raiz.querySelector("#testimonioTexto").value.trim();

        if (valor < 1) {
            marcarError("estrellas", "Elegí una calificación de 1 a 5 estrellas");
            return;
        }

        if (autor.length < MINIMOS.autor) {
            marcarError("autor", "Escribí tu nombre");
            return;
        }

        if (texto.length < MINIMOS.texto) {
            marcarError("texto", "Contanos un poco más sobre tu experiencia");
            return;
        }

        /* Sin backend no hay donde guardar la opinion en el servidor. */
        const fnHayApi = window.hayApiConfigurada;
        if (typeof fnHayApi === "function" && !fnHayApi()) {
            marcarError("general", "Las opiniones necesitan el backend. Probá más tarde.");
            return;
        }

        const boton = raiz.querySelector(".testimonio-btn-primario");
        const textoBoton = boton.textContent;

        boton.disabled = true;
        boton.textContent = "Enviando...";

        try {

            const respuesta = await fetch(window.urlApi("/api/testimonios"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ autor, lugar, texto, estrellas: valor }),
            });

            const cuerpo = await respuesta.json().catch(function () { return {}; });

            if (respuesta.status === 201) {
                mostrarGracias();
                return;
            }

            if (respuesta.status === 400 && cuerpo.campo) {
                marcarError(cuerpo.campo, cuerpo.error || "Revisá este campo");
                return;
            }

            if (respuesta.status === 401) {
                marcarError("general", "Iniciá sesión para dejar tu opinión.");
                return;
            }

            marcarError(
                "general",
                cuerpo.error || "No se pudo enviar tu opinión. Intentá de nuevo."
            );

        } catch (error) {

            marcarError(
                "general",
                "No se pudo enviar tu opinión. Revisá tu conexión."
            );

        } finally {

            boton.disabled = false;
            boton.textContent = textoBoton;

        }
    }

    function mostrarGracias() {

        const form = raiz.querySelector(".testimonio-form");
        const gracias = raiz.querySelector(".testimonio-gracias");

        form.hidden = true;
        gracias.hidden = false;

        window.setTimeout(cerrar, 1800);
    }

    async function abrirTestimonio() {

        if (window.zapiAuth && window.zapiAuth.listo) {
            try {
                await window.zapiAuth.listo;
            } catch (error) {
            }
        }

        if (!window.zapiAuth || !window.zapiAuth.autenticado) {

            if (window.zapiAuth && typeof window.zapiAuth.exigirCuenta === "function") {
                window.zapiAuth.exigirCuenta();
            }

            return;
        }

        abrir();
    }

    window.abrirTestimonio = abrirTestimonio;

    function engancharBotones() {

        document.querySelectorAll("[data-abrir-testimonio]").forEach(function (boton) {

            boton.addEventListener("click", function (evento) {

                evento.preventDefault();

                abrirTestimonio();

            });

        });

    }

    document.addEventListener("DOMContentLoaded", engancharBotones);

})();
