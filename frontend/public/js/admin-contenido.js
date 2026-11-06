'use strict';

/* Contenido: editor de campos fijos por sección. Nunca se guarda HTML
   libre: el formulario se arma desde este esquema y la vista previa usa
   nodos de texto, no innerHTML con datos del usuario. */

const ESQUEMA_CONTENIDO = {
    negocio: {
        etiqueta: 'Datos del negocio',
        campos: [
            { clave: 'nombre', etiqueta: 'Nombre', tipo: 'texto', max: 120 },
            { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'texto', max: 300 },
            { clave: 'whatsapp', etiqueta: 'WhatsApp (solo números)', tipo: 'texto', max: 120 },
            { clave: 'whatsappVisible', etiqueta: 'WhatsApp visible', tipo: 'texto', max: 120 },
            { clave: 'email', etiqueta: 'Correo', tipo: 'texto', max: 254 },
            { clave: 'direccion', etiqueta: 'Dirección', tipo: 'texto', max: 300 },
            { clave: 'horario', etiqueta: 'Horario', tipo: 'texto', max: 300 },
            { clave: 'sitio', etiqueta: 'Sitio web', tipo: 'texto', max: 254 }
        ]
    },
    portada: {
        etiqueta: 'Portada',
        campos: [
            { clave: 'etiqueta', etiqueta: 'Etiqueta', tipo: 'texto', max: 120 },
            { clave: 'titulo', etiqueta: 'Título', tipo: 'texto', max: 200 },
            { clave: 'subtitulo', etiqueta: 'Subtítulo', tipo: 'parrafo', max: 1200 },
            { clave: 'imagen', etiqueta: 'Imagen de portada', tipo: 'imagen', max: 500 },
            { clave: 'sello', etiqueta: 'Sello', tipo: 'texto', max: 120 },
            { clave: 'beneficios', etiqueta: 'Beneficios', tipo: 'lista', max: 300, exacto: 3 }
        ]
    },
    servicios: {
        etiqueta: 'Servicios',
        campos: [
            { clave: 'etiqueta', etiqueta: 'Etiqueta', tipo: 'texto', max: 120 },
            { clave: 'titulo', etiqueta: 'Título', tipo: 'texto', max: 200 },
            { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'parrafo', max: 1200 },
            {
                clave: 'items',
                etiqueta: 'Servicios',
                tipo: 'listaObjetos',
                minimo: 1,
                maximo: 12,
                campos: [
                    { clave: 'icono', etiqueta: 'Ícono', tipo: 'texto', max: 60 },
                    { clave: 'titulo', etiqueta: 'Título', tipo: 'texto', max: 120 },
                    { clave: 'texto', etiqueta: 'Texto', tipo: 'parrafo', max: 300 }
                ]
            }
        ]
    },
    nosotros: {
        etiqueta: 'Nosotros',
        campos: [
            { clave: 'etiqueta', etiqueta: 'Etiqueta', tipo: 'texto', max: 120 },
            { clave: 'titulo', etiqueta: 'Título', tipo: 'texto', max: 240 },
            { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'parrafo', max: 1200 },
            { clave: 'problemaTitulo', etiqueta: 'Título del problema', tipo: 'texto', max: 200 },
            { clave: 'problemaTexto', etiqueta: 'Texto del problema', tipo: 'parrafo', max: 2000 },
            { clave: 'solucionTitulo', etiqueta: 'Título de la solución', tipo: 'texto', max: 200 },
            { clave: 'solucionTexto', etiqueta: 'Texto de la solución', tipo: 'parrafo', max: 2000 },
            {
                clave: 'pilares',
                etiqueta: 'Pilares',
                tipo: 'listaObjetos',
                minimo: 1,
                maximo: 6,
                campos: [
                    { clave: 'titulo', etiqueta: 'Título', tipo: 'texto', max: 120 },
                    { clave: 'texto', etiqueta: 'Texto', tipo: 'parrafo', max: 300 }
                ]
            },
            {
                clave: 'razones',
                etiqueta: 'Razones',
                tipo: 'listaObjetos',
                minimo: 1,
                maximo: 6,
                campos: [
                    { clave: 'titulo', etiqueta: 'Título', tipo: 'texto', max: 120 },
                    { clave: 'texto', etiqueta: 'Texto', tipo: 'parrafo', max: 300 }
                ]
            },
            {
                clave: 'equipo',
                etiqueta: 'Equipo',
                tipo: 'listaObjetos',
                minimo: 1,
                maximo: 10,
                campos: [
                    { clave: 'nombre', etiqueta: 'Nombre', tipo: 'texto', max: 120 },
                    { clave: 'rol', etiqueta: 'Rol', tipo: 'texto', max: 120 },
                    { clave: 'texto', etiqueta: 'Texto', tipo: 'parrafo', max: 400 }
                ]
            }
        ]
    },
    contacto: {
        etiqueta: 'Contacto',
        campos: [
            { clave: 'etiqueta', etiqueta: 'Etiqueta', tipo: 'texto', max: 120 },
            { clave: 'titulo', etiqueta: 'Título', tipo: 'texto', max: 240 },
            { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'parrafo', max: 1200 },
            { clave: 'telefono', etiqueta: 'Teléfono', tipo: 'texto', max: 120 },
            { clave: 'email', etiqueta: 'Correo', tipo: 'texto', max: 254 },
            { clave: 'direccion', etiqueta: 'Dirección', tipo: 'texto', max: 300 },
            { clave: 'horario', etiqueta: 'Horario', tipo: 'texto', max: 300 }
        ]
    },
    promociones: {
        etiqueta: 'Promociones',
        campos: [
            { clave: 'activa', etiqueta: 'Mostrar la promoción en el sitio', tipo: 'booleano' },
            { clave: 'titulo', etiqueta: 'Título', tipo: 'texto', max: 200 },
            { clave: 'texto', etiqueta: 'Texto', tipo: 'parrafo', max: 1200 },
            { clave: 'enlace', etiqueta: 'Enlace', tipo: 'texto', max: 500 },
            { clave: 'textoEnlace', etiqueta: 'Texto del enlace', tipo: 'texto', max: 120 }
        ]
    }
};

let contenidoCache = null;
let contenidoBorrador = null;
let contenidoSeccion = 'negocio';

function copiar(valor) {
    return JSON.parse(JSON.stringify(valor || {}));
}

function crearEntrada(campo, valor, alCambiar) {
    const grupo = document.createElement('div');
    grupo.className = 'admin-editor-campo';

    const etiqueta = document.createElement('label');
    etiqueta.className = 'campo-label';
    etiqueta.textContent = campo.etiqueta;
    grupo.appendChild(etiqueta);

    let entrada;

    if (campo.tipo === 'booleano') {
        entrada = document.createElement('input');
        entrada.type = 'checkbox';
        entrada.checked = Boolean(valor);
        entrada.className = 'admin-check-caja';
    } else if (campo.tipo === 'parrafo') {
        entrada = document.createElement('textarea');
        entrada.className = 'campo-input';
        entrada.rows = 4;
        entrada.value = valor === undefined || valor === null ? '' : String(valor);
    } else {
        entrada = document.createElement('input');
        entrada.type = 'text';
        entrada.className = 'campo-input';
        entrada.value = valor === undefined || valor === null ? '' : String(valor);
    }

    if (campo.max) entrada.maxLength = campo.max;
    if (campo.tipo === 'imagen') entrada.placeholder = 'public/img/... o https://…';

    entrada.dataset.simple = campo.clave;
    entrada.addEventListener('input', alCambiar);
    entrada.addEventListener('change', alCambiar);

    grupo.appendChild(entrada);
    return grupo;
}

function crearItemLista(campo, valor, indice, alCambiar, alQuitar) {
    const item = document.createElement('div');
    item.className = 'admin-editor-item';
    item.dataset.item = '';

    const cabecera = document.createElement('div');
    cabecera.className = 'admin-editor-item-cabecera';

    const numero = document.createElement('span');
    numero.textContent = 'Elemento ' + (indice + 1);
    cabecera.appendChild(numero);

    const quitar = document.createElement('button');
    quitar.type = 'button';
    quitar.className = 'boton-texto';
    quitar.textContent = 'Quitar';
    quitar.addEventListener('click', () => alQuitar(indice));
    cabecera.appendChild(quitar);

    item.appendChild(cabecera);

    if (campo.tipo === 'lista') {
        const entrada = document.createElement('input');
        entrada.type = 'text';
        entrada.className = 'campo-input';
        entrada.value = String(valor || '');
        if (campo.max) entrada.maxLength = campo.max;
        entrada.dataset.itemLista = '';
        entrada.addEventListener('input', alCambiar);
        item.appendChild(entrada);
    } else {
        campo.campos.forEach(subcampo => {
            const grupo = crearEntrada(subcampo, valor ? valor[subcampo.clave] : '', alCambiar);
            const entrada = grupo.querySelector('input, textarea');

            if (entrada) {
                delete entrada.dataset.simple;
                entrada.dataset.sub = subcampo.clave;
            }

            item.appendChild(grupo);
        });
    }

    return item;
}

function sincronizarBorrador() {
    if (!contenidoBorrador) return;

    contenidoBorrador = leerSeccion(contenidoSeccion);
}

function agregarElemento(campo, maximo) {
    sincronizarBorrador();

    const lista = contenidoBorrador[campo.clave];

    if (!Array.isArray(lista) || lista.length >= maximo) return;

    if (campo.tipo === 'lista') {
        lista.push('');
    } else {
        const vacio = {};
        campo.campos.forEach(subcampo => { vacio[subcampo.clave] = ''; });
        lista.push(vacio);
    }

    renderEditor(contenidoSeccion);
}

function quitarElemento(campo, indice, minimo) {
    sincronizarBorrador();

    const lista = contenidoBorrador[campo.clave];

    if (!Array.isArray(lista) || lista.length <= minimo) return;

    lista.splice(indice, 1);
    renderEditor(contenidoSeccion);
}

function crearLista(campo, valores, alCambiar) {
    const grupo = document.createElement('div');
    grupo.className = 'admin-editor-grupo';
    grupo.dataset.lista = campo.clave;

    const cabecera = document.createElement('header');

    const titulo = document.createElement('strong');
    titulo.textContent = campo.etiqueta;
    cabecera.appendChild(titulo);

    const maximo = campo.exacto || campo.maximo || 12;
    const minimo = campo.exacto || campo.minimo || 1;
    const agregar = document.createElement('button');
    agregar.type = 'button';
    agregar.className = 'boton-texto';
    agregar.textContent = 'Agregar';
    agregar.disabled = valores.length >= maximo;
    agregar.addEventListener('click', () => agregarElemento(campo, maximo));
    cabecera.appendChild(agregar);

    grupo.appendChild(cabecera);

    valores.forEach((valor, indice) => {
        grupo.appendChild(crearItemLista(
            campo,
            valor,
            indice,
            alCambiar,
            posicion => quitarElemento(campo, posicion, minimo)
        ));
    });

    return grupo;
}

function renderEditor(clave) {
    const contenedor = document.getElementById('contenidoEditor');

    if (!contenedor) return;

    const seccion = ESQUEMA_CONTENIDO[clave];

    contenedor.textContent = '';

    if (!seccion || !contenidoBorrador) return;

    const alCambiar = () => actualizarPreview();

    seccion.campos.forEach(campo => {
        const valor = contenidoBorrador[campo.clave];

        if (campo.tipo === 'lista' || campo.tipo === 'listaObjetos') {
            const lista = Array.isArray(valor) ? valor : [];
            contenedor.appendChild(crearLista(campo, lista, alCambiar));
            return;
        }

        contenedor.appendChild(crearEntrada(campo, valor, alCambiar));
    });

    actualizarPreview();
}

function leerSeccion(clave) {
    const seccion = ESQUEMA_CONTENIDO[clave];
    const contenedor = document.getElementById('contenidoEditor');
    const salida = {};

    if (!seccion || !contenedor) return salida;

    seccion.campos.forEach(campo => {
        if (campo.tipo === 'lista') {
            const lista = contenedor.querySelector('[data-lista="' + campo.clave + '"]');
            salida[campo.clave] = lista
                ? Array.from(lista.querySelectorAll('[data-item-lista]')).map(input => input.value.trim())
                : [];
            return;
        }

        if (campo.tipo === 'listaObjetos') {
            const lista = contenedor.querySelector('[data-lista="' + campo.clave + '"]');
            salida[campo.clave] = lista
                ? Array.from(lista.querySelectorAll('[data-item]')).map(item => {
                    const objeto = {};
                    campo.campos.forEach(subcampo => {
                        const entrada = item.querySelector('[data-sub="' + subcampo.clave + '"]');
                        objeto[subcampo.clave] = entrada ? entrada.value.trim() : '';
                    });
                    return objeto;
                })
                : [];
            return;
        }

        const entrada = contenedor.querySelector('[data-simple="' + campo.clave + '"]');

        if (!entrada) {
            salida[campo.clave] = campo.tipo === 'booleano' ? false : '';
        } else if (campo.tipo === 'booleano') {
            salida[campo.clave] = Boolean(entrada.checked);
        } else {
            salida[campo.clave] = entrada.value.trim();
        }
    });

    return salida;
}

function textoPreview(valor, etiqueta) {
    const fila = document.createElement('div');
    fila.className = 'admin-preview-dato';

    const nombre = document.createElement('span');
    nombre.textContent = etiqueta;
    fila.appendChild(nombre);

    const contenido = document.createElement('strong');
    contenido.textContent = valor || '—';
    fila.appendChild(contenido);

    return fila;
}

function actualizarPreview() {
    const contenedor = document.getElementById('contenidoPreview');
    const clave = contenidoSeccion;

    if (!contenedor) return;

    const seccion = ESQUEMA_CONTENIDO[clave];
    const valores = leerSeccion(clave);

    contenedor.textContent = '';

    if (!seccion) return;

    const titulo = document.createElement('h3');
    titulo.textContent = valores.titulo || seccion.etiqueta;
    contenedor.appendChild(titulo);

    const bajada = valores.subtitulo || valores.descripcion;

    if (bajada) {
        const parrafo = document.createElement('p');
        parrafo.textContent = bajada;
        contenedor.appendChild(parrafo);
    }

    if (valores.imagen) {
        const imagen = document.createElement('img');
        imagen.className = 'admin-preview-imagen';
        imagen.src = adminUrlImagen(valores.imagen);
        imagen.alt = '';
        contenedor.appendChild(imagen);
    }

    if (Array.isArray(valores.beneficios)) {
        const lista = document.createElement('ul');
        valores.beneficios.filter(Boolean).forEach(texto => {
            const item = document.createElement('li');
            item.textContent = texto;
            lista.appendChild(item);
        });
        contenedor.appendChild(lista);
    }

    seccion.campos.forEach(campo => {
        if (['titulo', 'subtitulo', 'descripcion', 'imagen', 'beneficios'].includes(campo.clave)) return;

        if (campo.tipo === 'lista' || campo.tipo === 'listaObjetos') {
            const valoresLista = valores[campo.clave];

            if (!Array.isArray(valoresLista) || !valoresLista.length) return;

            const lista = document.createElement('ul');

            valoresLista.forEach(elemento => {
                const item = document.createElement('li');
                item.textContent = typeof elemento === 'string'
                    ? elemento
                    : Object.values(elemento).filter(Boolean).join(' · ');
                lista.appendChild(item);
            });

            contenedor.appendChild(lista);
            return;
        }

        if (campo.tipo === 'booleano') {
            contenedor.appendChild(textoPreview(valores[campo.clave] ? 'Sí' : 'No', campo.etiqueta));
            return;
        }

        contenedor.appendChild(textoPreview(valores[campo.clave], campo.etiqueta));
    });
}

function activarSeccion(clave) {
    if (!ESQUEMA_CONTENIDO[clave]) return;

    contenidoSeccion = clave;
    contenidoBorrador = copiar(contenidoCache ? contenidoCache[clave] : {});

    document.querySelectorAll('[data-contenido-seccion]').forEach(boton => {
        const activo = boton.dataset.contenidoSeccion === clave;
        boton.classList.toggle('activo', activo);
        boton.setAttribute('aria-selected', String(activo));
    });

    renderEditor(clave);
}

async function cargarContenido() {
    const estado = document.getElementById('contenidoEstado');

    try {
        const datos = await adminPedir('/api/admin/contenido');
        contenidoCache = datos.contenido;
        activarSeccion(contenidoSeccion);
        adminEstado(estado, '', '');
    } catch (error) {
        adminEstado(estado, mensajeDeError(error), 'error');
    }
}

async function guardarSeccion(evento) {
    evento.preventDefault();

    const estado = document.getElementById('contenidoEstado');
    const boton = document.getElementById('contenidoGuardar');
    const clave = contenidoSeccion;
    const seccion = ESQUEMA_CONTENIDO[clave];
    const valores = leerSeccion(clave);

    const listaInvalida = seccion.campos.find(campo => {
        if (campo.tipo !== 'lista' && campo.tipo !== 'listaObjetos') return false;

        const minimo = campo.exacto || campo.minimo || 1;
        const maximo = campo.exacto || campo.maximo || 12;
        const lista = valores[campo.clave];

        return !Array.isArray(lista) || lista.length < minimo || lista.length > maximo;
    });

    if (listaInvalida) {
        adminEstado(estado, 'Revisá la cantidad de elementos de "' + listaInvalida.etiqueta + '".', 'error');
        return;
    }

    adminBloquearBoton(boton, true, 'Guardando…');
    adminEstado(estado, '', '');

    try {
        const datos = await adminPedir('/api/admin/contenido/' + encodeURIComponent(clave), {
            method: 'PUT',
            body: valores
        });

        contenidoCache[clave] = datos.valor;
        contenidoBorrador = copiar(datos.valor);
        adminEstado(estado, 'Sección "' + seccion.etiqueta + '" guardada.', 'ok');
        renderEditor(clave);
    } catch (error) {
        adminEstado(estado, mensajeDeError(error), 'error');
    } finally {
        adminBloquearBoton(boton, false, 'Guardar sección');
    }
}

cuandoAdminListo(() => {
    const formulario = document.getElementById('contenidoForm');
    const descartar = document.getElementById('contenidoDescartar');

    document.querySelectorAll('[data-contenido-seccion]').forEach(boton => {
        boton.addEventListener('click', () => activarSeccion(boton.dataset.contenidoSeccion));
    });

    if (formulario) formulario.addEventListener('submit', guardarSeccion);

    if (descartar) {
        descartar.addEventListener('click', () => {
            contenidoBorrador = copiar(contenidoCache ? contenidoCache[contenidoSeccion] : {});
            renderEditor(contenidoSeccion);
            adminEstado(document.getElementById('contenidoEstado'), 'Cambios descartados.', '');
        });
    }

    cargarContenido();
});
