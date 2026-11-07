'use strict';

/* Base del panel: comprueba la sesión de superadministrador, comparte
   utilidades de tablas, diálogos y paginación, y conecta el menú lateral. */

const ADMIN = {
    usuario: null,
    lista: false
};

const esperasAdmin = [];

function cuandoAdminListo(escucha) {
    if (ADMIN.lista) {
        escucha(ADMIN.usuario);
        return;
    }

    if (typeof escucha === 'function') esperasAdmin.push(escucha);
}

function adminArchivoActual() {
    const partes = window.location.pathname.split('/').filter(Boolean);
    return partes[partes.length - 1] || 'index.html';
}

function adminIrALogin() {
    const volver = 'admin/' + adminArchivoActual();
    window.location.href = '../login.html?volver=' + encodeURIComponent(volver);
}

function adminPedir(ruta, opciones) {
    return API.pedir(ruta, opciones).catch(error => {
        if (error.estado === 401 || error.estado === 403) {
            adminIrALogin();
        }

        throw error;
    });
}

function adminEstado(elemento, mensaje, tipo) {
    mostrarEstadoFormulario(elemento, mensaje, tipo);
}

function adminFecha(iso) {
    return formatearFecha(iso);
}

function adminUrlImagen(ruta) {
    const valor = String(ruta || '').trim();

    if (!valor) return IMAGEN_FALLBACK;
    if (/^https?:\/\//i.test(valor)) return valor;

    return rutaImagen(valor);
}

function adminFechaCorta(iso) {
    return formatearFechaCorta(iso);
}

function adminMoneda(valor) {
    return formatearPrecio(valor, 'UYU');
}

function adminNumero(valor) {
    return new Intl.NumberFormat('es-UY').format(Number(valor) || 0);
}

function adminPorcentaje(valor) {
    const numero = Number(valor) || 0;
    const signo = numero > 0 ? '+' : '';
    return signo + new Intl.NumberFormat('es-UY', { maximumFractionDigits: 2 }).format(numero) + '%';
}

function adminFechaISO(fecha = new Date()) {
    const copia = new Date(fecha);
    const mes = String(copia.getMonth() + 1).padStart(2, '0');
    const dia = String(copia.getDate()).padStart(2, '0');
    return copia.getFullYear() + '-' + mes + '-' + dia;
}

function adminEtiquetaEstado(estado) {
    return etiquetaEstado(estado);
}

function adminHtmlEstado(estado) {
    return '<span class="admin-etiqueta-estado ' + claseEstado(estado) + '">'
        + escaparHTML(etiquetaEstado(estado)) + '</span>';
}

function adminLeerFormulario(formulario) {
    const parametros = new URLSearchParams();

    if (!formulario) return parametros;

    new FormData(formulario).forEach((valor, clave) => {
        const limpio = String(valor).trim();
        if (limpio) parametros.set(clave, limpio);
    });

    return parametros;
}

function adminBloquearBoton(boton, bloqueado, texto) {
    if (!boton) return;

    boton.disabled = bloqueado;

    if (texto) boton.textContent = texto;
}

function adminPaginar(contenedor, datos, alIr) {
    if (!contenedor) return;

    contenedor.textContent = '';

    const pagina = Number(datos.pagina) || 1;
    const paginas = Number(datos.paginas) || 1;
    const total = Number(datos.total) || 0;

    if (paginas <= 1) {
        const resumen = document.createElement('span');
        resumen.textContent = total + (total === 1 ? ' registro' : ' registros');
        contenedor.appendChild(resumen);
        return;
    }

    const crearBoton = (texto, destino, activo, deshabilitado) => {
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.textContent = texto;
        if (activo) boton.classList.add('activo');
        if (deshabilitado) boton.disabled = true;
        boton.addEventListener('click', () => alIr(destino));
        contenedor.appendChild(boton);
    };

    crearBoton('‹', pagina - 1, false, pagina <= 1);

    const desde = Math.max(1, pagina - 2);
    const hasta = Math.min(paginas, desde + 4);

    for (let numero = desde; numero <= hasta; numero += 1) {
        crearBoton(String(numero), numero, numero === pagina, false);
    }

    crearBoton('›', pagina + 1, false, pagina >= paginas);

    const resumen = document.createElement('span');
    resumen.textContent = total + ' registros';
    contenedor.appendChild(resumen);
}

function adminAbrirDialogo(id) {
    const dialogo = document.getElementById(id);

    if (!dialogo) return;

    if (typeof dialogo.showModal === 'function') dialogo.showModal();
    else dialogo.setAttribute('open', '');
}

function adminCerrarDialogo(dialogo) {
    if (!dialogo) return;

    if (typeof dialogo.close === 'function') dialogo.close();
    else dialogo.removeAttribute('open');
}

function adminCerrarDialogoDesde(elemento) {
    const dialogo = elemento.closest('dialog');
    adminCerrarDialogo(dialogo);
}

function adminRellenarSelect(select, valores, textoVacio) {
    if (!select) return;

    select.textContent = '';

    if (textoVacio) {
        const opcion = document.createElement('option');
        opcion.value = '';
        opcion.textContent = textoVacio;
        select.appendChild(opcion);
    }

    valores.forEach(valor => {
        const opcion = document.createElement('option');
        opcion.value = valor;
        opcion.textContent = valor;
        select.appendChild(opcion);
    });
}

document.addEventListener('click', evento => {
    const cerrar = evento.target.closest('[data-cerrar-dialogo]');

    if (cerrar) {
        adminCerrarDialogoDesde(cerrar);
        return;
    }

    const dialogo = evento.target;

    if (dialogo instanceof HTMLDialogElement && evento.target === dialogo) {
        adminCerrarDialogo(dialogo);
    }
});

function conectarMenuAdmin() {
    const boton = document.getElementById('adminMenuBoton');
    const barra = document.getElementById('adminSidebar');

    if (!boton || !barra) return;

    boton.addEventListener('click', () => {
        const abierto = barra.classList.toggle('esta-abierto');
        boton.setAttribute('aria-expanded', String(abierto));
    });

    barra.addEventListener('click', evento => {
        if (evento.target.closest('a')) {
            barra.classList.remove('esta-abierto');
            boton.setAttribute('aria-expanded', 'false');
        }
    });
}

function conectarSalidaAdmin() {
    const salir = document.querySelector('[data-admin-salir]');

    if (!salir) return;

    salir.addEventListener('click', async () => {
        try {
            await API.post('/api/auth/logout');
        } catch {
            /* La sesión local se cierra igual. */
        }

        window.location.href = '../index.html';
    });
}

async function iniciarAdmin() {
    let usuario = null;

    try {
        const datos = await API.get('/api/auth/yo');
        usuario = datos.usuario;
    } catch {
        adminIrALogin();
        return;
    }

    if (!usuario || usuario.role !== 'superadmin') {
        adminIrALogin();
        return;
    }

    ADMIN.usuario = usuario;
    ADMIN.lista = true;

    document.querySelectorAll('[data-admin-usuario]').forEach(elemento => {
        elemento.textContent = usuario.nombre + ' · ' + usuario.email;
    });

    conectarMenuAdmin();
    conectarSalidaAdmin();

    esperasAdmin.splice(0).forEach(escucha => escucha(usuario));
}

iniciarAdmin();
