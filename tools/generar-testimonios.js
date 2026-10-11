'use strict';
/* Genera public/data/testimonios.json desde datos/testimonios.js.
   Usage: node tools/generar-testimonios.js

   El JSON es lo que baja el carrusel de la home cuando la API NO
   esta (sitio estatico) o se cae, y tambien lo que siembra el
   backend en GET /api/testimonios. Todo sale de la misma fuente,
   asi que no pueden discrepar.

   De donde salen los datos
   ------------------------
   datos/testimonios.js es un modulo de Node: se importa con
   require() y ya esta. Si una opinion cambia alla, se corre esto y
   quedan al dia el JSON y la proxima siembra del backend. No hay
   build ni bundler, solo Node >= 24.

   El JSON se versiona igual que productos.json: aunque es generado,
   el navegador lo pide por fetch y no sobra un paso de build antes
   de desplegar. Verificar comprueba que no quede viejo. */

const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');

const ARCHIVO = path.join(raiz, 'public', 'data', 'testimonios.json');

/* ------------------------------------------------------------------
   Lectura de los datos
   ------------------------------------------------------------------ */

function extraerTestimonios() {
    /* La fuente es un .js propio porque un .json no admite
       comentarios y los textos de abajo se explican con texto. */
    const { TESTIMONIOS } = require(path.join(raiz, 'datos', 'testimonios.js'));

    return validar(TESTIMONIOS);
}

/* ------------------------------------------------------------------
   Validacion
   ------------------------------------------------------------------ */

function validar(lista) {
    if (!Array.isArray(lista) || !lista.length) {
        throw new Error('TESTIMONIOS no es una lista con elementos');
    }

    const vistos = new Set();

    for (const t of lista) {
        for (const campo of ['autor', 'texto', 'estrellas', 'fecha']) {
            if (t[campo] === undefined || t[campo] === '') {
                throw new Error('una opinion no tiene "' + campo + '": ' + JSON.stringify(t));
            }
        }

        if (typeof t.estrellas !== 'number' || !isFinite(t.estrellas) ||
            t.estrellas < 0 || t.estrellas > 5) {
            throw new Error('estrellas fuera de 0..5 en "' + t.autor + '": ' + t.estrellas);
        }

        /* La fecha va como YYYY-MM-DD en la fuente; aca se valida
           que sea real. El backend la convierte a Date al sembrar. */
        const fecha = new Date(t.fecha + 'T00:00:00Z');

        if (Number.isNaN(fecha.getTime())) {
            throw new Error('fecha invalida en "' + t.autor + '": ' + t.fecha);
        }

        const clave = t.autor + '|' + t.fecha;

        if (vistos.has(clave)) {
            throw new Error('dos opiniones comparten autor y fecha: ' + t.autor);
        }

        vistos.add(clave);
    }

    return lista;
}

/* ------------------------------------------------------------------
   El JSON que baja el navegador
   ------------------------------------------------------------------ */

function paraElNavegador(lista) {
    const documento = {
        generado: new Date().toISOString(),
        version: 1,
        testimonios: lista
    };

    /* Los < se escapan a \u003c igual que en productos.json: el
       archivo no puede cerrar una etiqueta ni parecer HTML para los
       que leen .json buscando datos. */
    return JSON.stringify(documento, null, 2).replace(/</g, '\\u003c') + '\n';
}

/* ------------------------------------------------------------------
   Escritura
   ------------------------------------------------------------------ */

const escritos = extraerTestimonios();
const contenido = paraElNavegador(escritos);
const antes = fs.existsSync(ARCHIVO) ? fs.readFileSync(ARCHIVO, 'utf8') : null;

fs.writeFileSync(ARCHIVO, contenido);

console.log(
    (antes === contenido ? 'public/data/testimonios.json al dia' :
        'public/data/testimonios.json regenerado') +
    ' (' + escritos.length + ' opiniones)'
);