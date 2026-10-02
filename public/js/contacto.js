/* ==========================================================
   FORMULARIO DE CONTACTO
   ------------------------------------------------------------
   Valida en el navegador, manda a POST /api/contacto y muestra el
   resultado.

   Por que valida dos veces
   -----------------------
   El navegador valida para dar una respuesta rapida y en el mismo
   lugar donde se escribio el error. El servidor valida aparte
   porque es la unica validacion que no se puede esquivar: el
   formulario se puede mandar con curl. Los dos usan las mismas
   reglas a proposito; si se cambian, hay que cambiar los dos.

   Los errores del servidor traen el nombre del campo (campo:
   "correo"), asi que se marca ese input y se le lleva el foco en
   vez de pintar un error suelto.
   ========================================================== */

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

    /* Cada campo con su regla y su mensaje. El texto del error va
       tambien en el mensaje del servidor, asi que se comparte la
       redaccion. */
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
            id: "contactoTelefono",
            name: "telefono",
            error: "errorTelefono",
            vacio: "Escribí un teléfono",
            corto: "Revisá el teléfono de contacto"
        },
        {
            id: "contactoConsulta",
            name: "consulta",
            error: "errorConsulta",
            vacio: "Contanos sobre tu consulta",
            corto: "Contanos un poco más sobre tu consulta"
        }
    ];

    /* Correo: lo bastante estricto para agarrar el "@" que falta y
       el ".com" que no esta, sin rechazar direcciones raras que si
       funcionan. */
    const CORREO = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

    /* ------------------------------------------------------------
       Pintado de los errores
       ------------------------------------------------------------ */

    /* El mensaje va en el <span> que aria-describedby ya apunta, y
       el input se marca con aria-invalid. Con los dos, el lector de
       pantalla lee el error al llegar al campo en vez de tener que
       cazarlo en un aviso general. */
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

        /* El telefono se cuenta por digitos, no por largo: en
           Uruguay se escribe con +, con guiones y con espacios, y
           un "+598 9 123 4567" tiene menos caracteres que un
           "09 123 456" y es un numero mejor. Lo que importa es que
           haya suficientes numeros para llamar. */
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

    /* ------------------------------------------------------------
       Estado general
       ------------------------------------------------------------ */

    function avisar(mensaje, tipo) {
        if (!estado) return;

        estado.textContent = mensaje;
        estado.classList.toggle("estado-error", tipo === "error");
        estado.classList.toggle("estado-ok", tipo === "ok");
    }

    /* ------------------------------------------------------------
       Envio
       ------------------------------------------------------------ */

    async function enviar(evento) {
        evento.preventDefault();

        let primerFallo = null;

        for (const campo of CAMPOS) {
            const mensaje = revisarCampo(campo);

            if (mensaje && !primerFallo) {
                primerFallo = campo;
            }
        }

        /* Con algo mal se corta aca y el foco va al primer campo
           que falta. Mandar el formulario igual llenaria la bandeja
           de consultas a medias. */
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

        /* El campo trampa viaja con el resto: si viene relleno, el
           servidor responde ok sin guardar nada. */
        datos.sitio_web = (document.getElementById("contactoSitio") || {}).value || "";

        try {
            const respuesta = await fetch("/api/contacto", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(datos)
            });

            const cuerpo = await respuesta.json().catch(() => ({}));

            if (!respuesta.ok) {
                /* Si el servidor dijo que campo esta mal, se marca
                   ese. Si no, el error es de la pagina entera (se
                   cayo el servidor, no hay red) y se avisa sin
                   señalar ningun input. */
                const fallido = CAMPOS.find(campo => campo.id.replace("contacto", "").toLowerCase() === cuerpo.campo);

                if (fallido) {
                    marcarError(fallido, cuerpo.error || fallido.corto);
                    document.getElementById(fallido.id)?.focus();
                }

                avisar(cuerpo.error || "No pudimos enviar la consulta. Probá de nuevo en un momento.", "error");

                return;
            }

            formulario.hidden = true;

            if (panelOk) {
                panelOk.hidden = false;
            }

            /* El boton de envio desaparece con el formulario y el
               foco no puede quedarse en algo que ya no esta: se
               lleva al titulo del panel de exito, que es lo que
               hay que leer ahora. */
            document.getElementById("contactoOkTitulo")?.focus();
        } catch (error) {
            /* Un fetch que falla no lanza siempre con un mensaje
               util (a veces ni lanza, solo queda pending y lo corta
               el navegador), asi que el texto es fijo: lo que
               importa es que quede claro que hay que reintentar. */
            avisar("No pudimos enviar la consulta. Revisá tu conexión y probá de nuevo.", "error");
        } finally {
            boton.disabled = false;

            if (textoBoton) textoBoton.textContent = "Enviar consulta";
        }
    }

    /* ------------------------------------------------------------
       Enganches
       ------------------------------------------------------------ */

    formulario.addEventListener("submit", enviar);

    /* El error de un campo se borra en cuanto se empieza a corregir:
       dejarlo pegado mientras se escribe obliga a leer un texto que
       ya no es cierto. */
    for (const campo of CAMPOS) {
        const input = document.getElementById(campo.id);

        if (!input) continue;

        input.addEventListener("input", () => {
            if (input.getAttribute("aria-invalid") === "true") {
                marcarError(campo, "");
            }
        });

        /* Al salir del campo se revisa solo: asi el error aparece
           cuando la persona ya termino de escribir y no mientras
           esta en la mitad de la palabra. */
        input.addEventListener("blur", () => {
            if (input.value.trim()) revisarCampo(campo);
        });
    }

    /* El contador de caracteres de la consulta. Va del largo que
       queda, no del permitido: es lo que la persona quiere ver. */
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

    /* "Enviar otra consulta": el formulario vuelve a su estado
       inicial con todo limpio, y el foco vuelve al primer campo
       para que se pueda seguir escribiendo sin buscarlo con el
       mouse. */
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