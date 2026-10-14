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
    const avisoTitulo = document.getElementById("avisoFlotanteTitulo");
    const avisoMensaje = document.getElementById("avisoFlotanteMensaje");
    const avisoCerrar = document.getElementById("avisoFlotanteCerrar");

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

    const EMAILJS = {
        publicKey: "svGiYtyfrTzCv-GhG",
        serviceId: "service_n6oyujo",
        templateId: "template_35zqdvg"
    };

    const emailjs = window.emailjs;

    if (emailjs && EMAILJS.publicKey && EMAILJS.serviceId && EMAILJS.templateId) {
        emailjs.init({ publicKey: EMAILJS.publicKey });
    }

    async function avisarPorCorreo(datos) {
        if (!emailjs || !EMAILJS.serviceId || !EMAILJS.templateId) {
            throw new Error("EmailJS no disponible");
        }

        await emailjs.send(EMAILJS.serviceId, EMAILJS.templateId, {
            nombre: datos.nombre,
            correo: datos.correo,
            asunto: datos.asunto,
            telefono: datos.telefono || "No dejó teléfono",
            mensaje: datos.consulta,
            reply_to: datos.correo
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
        if (campo.id === "contactoTelefono" && valor.replace(/\D/g, "").length < 6) {
            marcarError(campo, campo.corto);
            return campo.corto;
        }

        if (campo.id === "contactoConsulta" && valor.length < 10) {
            marcarError(campo, campo.corto);
            return campo.corto;
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

    function mostrarAviso(titulo, mensaje) {
        if (!avisoFlotante) return;

        if (avisoTitulo) avisoTitulo.textContent = titulo;
        if (avisoMensaje) avisoMensaje.textContent = mensaje;

        avisoFlotante.hidden = false;

        if (avisoReloj) clearTimeout(avisoReloj);
        avisoReloj = setTimeout(ocultarAviso, 9000);
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

        boton.disabled = true;

        if (textoBoton) textoBoton.textContent = "Enviando...";

        avisar("", "");

        const datos = {};

        for (const campo of CAMPOS) {
            const input = document.getElementById(campo.id);

            if (input) datos[campo.name] = input.value.trim();
        }

        /* El campo trampa (honeypot) viaja con el resto: si viene relleno, el servidor responde ok sin guardar nada. */
        datos.sitio_web = (document.getElementById("contactoSitio") || {}).value || "";

        /* Sin backend (Show Preview, hosting estatico) la consulta sale
           solo por correo (EmailJS); no se golpea /api/contacto. */
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
                    const fallido = CAMPOS.find(campo => campo.id.replace("contacto", "").toLowerCase() === cuerpo.campo);

                    if (fallido) {
                        marcarError(fallido, cuerpo.error || fallido.corto);
                        document.getElementById(fallido.id)?.focus();
                    }

                    avisar(cuerpo.error || "No pudimos enviar la consulta. Probá de nuevo en un momento.", "error");

                    return;
                }

                if (!datos.sitio_web) {
                    try {
                        await avisarPorCorreo(datos);
                    } catch {
                        mostrarAviso(
                            "El aviso por correo no salió",
                            "Tu mensaje quedó guardado igual y lo vamos a leer."
                        );
                    }
                }
            } else if (!datos.sitio_web) {
                await avisarPorCorreo(datos);
            }

            formulario.hidden = true;

            if (panelOk) {
                panelOk.hidden = false;
            }

            document.getElementById("contactoOkTitulo")?.focus();
        } catch (error) {
            avisar("No pudimos enviar la consulta. Revisá tu conexión y probá de nuevo.", "error");
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

        const limite = Number(consulta.getAttribute("maxlength")) || 0;
        const quedan = limite - consulta.value.length;

        contador.textContent = String(Math.max(0, quedan));
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