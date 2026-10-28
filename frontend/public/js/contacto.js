document.addEventListener("DOMContentLoaded", () => {

    const formulario = document.getElementById("contactoForm");

    if (!formulario) return;

    const boton = document.getElementById("contactoEnviar");
    const textoBoton = document.getElementById("contactoEnviarTexto");
    const estado = document.getElementById("contactoEstado");
    const panelOk = document.getElementById("contactoOk");
    const reiniciar = document.getElementById("contactoReiniciar");
    const contador = document.getElementById("contactoContador");
    const consulta = document.getElementById("contactoConsulta");
    const avisoFlotante = document.getElementById("avisoFlotante");
    const avisoCerrar = document.getElementById("avisoFlotanteCerrar");

    /* ------------------------------------------------------------------
       Configuracion de EmailJS.
       Pegá aquí tus valores reales del dashboard de EmailJS.
       ------------------------------------------------------------------ */
    const EMAILJS_PUBLIC_KEY = "PEGAR_PUBLIC_KEY_AQUI";
    const EMAILJS_SERVICE_ID = "PEGAR_SERVICE_ID_AQUI";
    const EMAILJS_TEMPLATE_ID = "PEGAR_TEMPLATE_ID_AQUI";

    const CAMPOS = [
        {
            id: "contactoNombre",
            name: "nombre",
            error: "errorNombre",
            vacio: "Escribí tu nombre",
            corto: "Escribí tu nombre completo"
        },
        {
            id: "contactoCorreo",
            name: "correo",
            error: "errorCorreo",
            vacio: "Escribí tu correo electrónico",
            corto: "Revisá el correo electrónico"
        },
        {
            id: "contactoAsunto",
            name: "asunto",
            error: "errorAsunto",
            vacio: "Escribí el asunto",
            corto: "Escribí un asunto más descriptivo"
        },
        {
            id: "contactoTelefono",
            name: "telefono",
            error: "errorTelefono",
            vacio: "",
            corto: "Revisá el teléfono de contacto",
            opcional: true
        },
        {
            id: "contactoConsulta",
            name: "consulta",
            error: "errorConsulta",
            vacio: "Contanos sobre tu consulta",
            corto: "Contanos un poco más sobre tu consulta"
        }
    ];

    const CORREO = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    const LIMITE_MENSAJE = 2000;

    const emailjs = window.emailjs;

    if (emailjs && EMAILJS_PUBLIC_KEY && !EMAILJS_PUBLIC_KEY.startsWith("PEGAR_")) {
        emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
    }

    async function avisarPorCorreo(datos) {
        if (!emailjs || !EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID ||
            EMAILJS_SERVICE_ID.startsWith("PEGAR_") || EMAILJS_TEMPLATE_ID.startsWith("PEGAR_")) {
            throw new Error("EmailJS no configurado");
        }

        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
            name: datos.nombre,
            email: datos.correo,
            subject: datos.asunto,
            phone: datos.telefono || "No dejó teléfono",
            message: datos.consulta
        });
    }

    function marcarError(campo, mensaje) {
        const input = document.getElementById(campo.id);
        const destino = document.getElementById(campo.error);

        if (destino) destino.textContent = mensaje || "";

        if (input) {
            if (mensaje) {
                input.setAttribute("aria-invalid", "true");
                input.classList.add("campo-con-error");
            } else {
                input.removeAttribute("aria-invalid");
                input.classList.remove("campo-con-error");
            }
        }
    }

    function revisarCampo(campo) {
        const input = document.getElementById(campo.id);

        if (!input) return "";

        const valor = input.value.trim();

        if (!valor) {
            if (campo.opcional) {
                marcarError(campo, "");
                return "";
            }

            marcarError(campo, campo.vacio);
            return campo.vacio;
        }

        if (campo.id === "contactoNombre" && valor.length < 2) {
            marcarError(campo, campo.corto);
            return campo.corto;
        }

        if (campo.id === "contactoCorreo" && !CORREO.test(valor)) {
            marcarError(campo, campo.corto);
            return campo.corto;
        }

        if (campo.id === "contactoAsunto" && valor.length < 3) {
            marcarError(campo, campo.corto);
            return campo.corto;
        }

        /* El teléfono se cuenta por dígitos: en Uruguay se escribe con +, guiones y espacios. */
        if (campo.id === "contactoTelefono" && valor && valor.replace(/\D/g, "").length < 6) {
            marcarError(campo, campo.corto);
            return campo.corto;
        }

        if (campo.id === "contactoConsulta") {
            if (valor.length < 10) {
                marcarError(campo, campo.corto);
                return campo.corto;
            }
            if (valor.length > LIMITE_MENSAJE) {
                marcarError(campo, "El mensaje no puede superar los " + LIMITE_MENSAJE + " caracteres");
                return "El mensaje no puede superar los " + LIMITE_MENSAJE + " caracteres";
            }
        }

        marcarError(campo, "");
        return "";
    }

    function avisar(mensaje, tipo) {
        if (!estado) return;

        estado.textContent = mensaje;
        estado.classList.toggle("estado-error", tipo === "error");
        estado.classList.toggle("estado-ok", tipo === "ok");
    }

    let avisoReloj = null;

    function ocultarAviso() {
        if (avisoReloj) {
            clearTimeout(avisoReloj);
            avisoReloj = null;
        }

        if (avisoFlotante) avisoFlotante.hidden = true;
    }

    if (avisoCerrar) avisoCerrar.addEventListener("click", ocultarAviso);

    async function enviar(evento) {
        evento.preventDefault();

        let primerFallo = null;

        for (const campo of CAMPOS) {
            const mensaje = revisarCampo(campo);

            if (mensaje && !primerFallo) {
                primerFallo = campo;
            }
        }

        if (primerFallo) {
            avisar("Revisá los campos marcados.", "error");

            const input = document.getElementById(primerFallo.id);

            if (input) input.focus();

            return;
        }

        /* Honeypot: si viene relleno, no enviar. */
        const honeypot = document.getElementById("contactoSitio");
        if (honeypot && honeypot.value.trim() !== "") {
            return;
        }

        boton.disabled = true;

        if (textoBoton) textoBoton.textContent = "Enviando...";

        avisar("", "");

        const datos = {};

        for (const campo of CAMPOS) {
            const input = document.getElementById(campo.id);

            if (input) datos[campo.name] = input.value.trim();
        }

        const fnHayApi = window.hayApiConfigurada;
        const hayBackend = typeof fnHayApi !== "function" || fnHayApi();

        try {
            if (hayBackend) {
                const respuesta = await fetch(window.urlApi("/api/contacto"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(datos)
                });

                const cuerpo = await respuesta.json().catch(() => ({}));

                if (!respuesta.ok) {
                    const fallido = CAMPOS.find(campo => campo.id.replace("contacto", "").toLowerCase() === (cuerpo.campo || "").toLowerCase());

                    if (fallido) {
                        marcarError(fallido, cuerpo.error || fallido.corto);
                        document.getElementById(fallido.id)?.focus();
                    }

                    avisar(cuerpo.error || "No pudimos enviar la consulta. Probá de nuevo en un momento.", "error");

                    return;
                }
            }

            /* Envío por EmailJS (sin depender del backend). */
            try {
                await avisarPorCorreo({
                    nombre: datos.nombre,
                    correo: datos.correo,
                    asunto: datos.asunto,
                    telefono: datos.telefono,
                    consulta: datos.consulta
                });
            } catch (err) {
                console.error("EmailJS error:", err?.status, err?.text);

                if (!navigator.onLine || typeof err?.status === "undefined") {
                    avisar("Revisá tu conexión", "error");
                } else if (err.status === 400) {
                    avisar("Configuración inválida", "error");
                } else if (err.status === 403) {
                    avisar("Dominio no autorizado", "error");
                } else if (err.status === 412) {
                    avisar("Servicio de correo desconectado", "error");
                } else {
                    avisar("Tuvimos un problema, escribinos por WhatsApp al 098 268 560", "error");
                }

                return;
            }

            formulario.reset();

            for (const campo of CAMPOS) {
                marcarError(campo, "");
            }

            if (panelOk) {
                panelOk.hidden = false;
            }

            avisar("¡Mensaje enviado! Te respondemos a la brevedad.", "ok");

            actualizarContador();

            document.getElementById("contactoOkTitulo")?.focus();
        } catch (error) {
            console.error("Envío error:", error);
            avisar("Revisá tu conexión", "error");
        } finally {
            boton.disabled = false;

            if (textoBoton) textoBoton.textContent = "Enviar mensaje";
        }
    }

    formulario.addEventListener("submit", enviar);

    for (const campo of CAMPOS) {
        const input = document.getElementById(campo.id);

        if (!input) continue;

        input.addEventListener("input", () => {
            if (input.getAttribute("aria-invalid") === "true") {
                marcarError(campo, "");
            }
        });

        input.addEventListener("blur", () => {
            if (input.value.trim()) revisarCampo(campo);
        });
    }

    function actualizarContador() {
        if (!contador || !consulta) return;

        const limite = Number(consulta.getAttribute("maxlength")) || LIMITE_MENSAJE;
        const quedan = limite - consulta.value.length;

        contador.textContent = Math.max(0, quedan) + "/" + limite;
        contador.classList.toggle("contador-cerca", quedan <= 100);
    }

    if (consulta) {
        consulta.addEventListener("input", actualizarContador);
        actualizarContador();
    }

    if (reiniciar) {
        reiniciar.addEventListener("click", () => {
            formulario.reset();

            for (const campo of CAMPOS) {
                marcarError(campo, "");
            }

            if (panelOk) panelOk.hidden = true;

            formulario.hidden = false;
            avisar("", "");

            actualizarContador();

            document.getElementById("contactoNombre")?.focus();
        });
    }
});