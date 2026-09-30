'use strict';
/* Verificacion estatica del sitio. Usage: node tools/verificar.js
   No modifica nada: solo informa lo que encuentra. */

const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const HTML = ['index.html', 'catalogo.html', 'carrito.html'];
const CSS = ['styles.css', 'catalogo.css', 'catalogo-modal.css',
    'catalogo-catalogo.css', 'stylecarrito.css', 'zapi-bot.css'];
const JS = ['productos.js', 'modal.js', 'catalogo.js', 'carrito.js',
    'zapi-bot.js', 'navigation.js', 'buscador.js', 'menu.js'];

let problemas = 0;
const avisar = m => { problemas++; console.log('  FALLA  ' + m); };
const ok = m => console.log('  ok     ' + m);

/* --- 1. CSS: llaves balanceadas --- */
console.log('\nCSS');
for (const f of CSS) {
    const s = fs.readFileSync(path.join(raiz, f), 'utf8');
    let d = 0;
    for (const c of s) { if (c === '{') d++; if (c === '}') d--; }
    if (d === 0) ok(f); else avisar(f + ' llaves desbalanceadas: ' + d);
}

/* --- 2. ARIA apunta a algo que existe --- */
console.log('\nARIA');
for (const f of HTML) {
    const s = fs.readFileSync(path.join(raiz, f), 'utf8');
    const ids = new Set(Array.from(s.matchAll(/id="([^"]+)"/g), m => m[1]));
    let malos = 0;
    for (const m of s.matchAll(/aria-(?:controls|describedby|labelledby)="([^"]+)"/g)) {
        if (!ids.has(m[1])) { avisar(f + ' aria apunta a #' + m[1] + ' que no existe'); malos++; }
    }
    if (!malos) ok(f);
}

/* --- 3. IDs duplicados --- */
console.log('\nIDs duplicados');
for (const f of HTML) {
    const s = fs.readFileSync(path.join(raiz, f), 'utf8');
    const ids = Array.from(s.matchAll(/id="([^"]+)"/g), m => m[1]);
    const dup = ids.filter((v, i) => ids.indexOf(v) !== i);
    if (dup.length) avisar(f + ' duplicados: ' + [...new Set(dup)].join(', '));
    else ok(f);
}

/* --- 4. Referencias locales que existen --- */
console.log('\nReferencias locales');
for (const f of HTML) {
    const s = fs.readFileSync(path.join(raiz, f), 'utf8');
    let malas = 0;
    for (const m of s.matchAll(/(?:href|src)="(\.\/[^"#]+)"/g)) {
        if (!fs.existsSync(path.join(raiz, m[1].replace('./', '')))) {
            avisar(f + ' referencia rota: ' + m[1]); malas++;
        }
    }
    if (!malas) ok(f);
}

/* --- 5. XSS: nada interpolado entra crudo a un innerHTML ---
   Solo importan las interpolaciones ${algo.prop} que caen dentro
   de una plantilla con HTML. Para no marcar de mas se siguen las
   plantillas linea a linea: se entra en una cuando aparece un
   acento grave, y se sale en el acento grave que la cierra. Si
   el bloque tiene una etiqueta (<algo), se revisa; si es solo
   texto (un mensaje de WhatsApp, por ejemplo) no, porque ahi el
   escapado hasta estorbaria.

   Ademas no se revisan las asignaciones a propiedades que no son
   markup (alt, textContent, value, src): ahi el navegador
   escribe texto. */
console.log('\nXSS');
const INTERP = /\$\{([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)+)\}/g;
const NUMERICO = /\.(id|cantidad|precio|precioBase|indice|total|subtotal|length)$/;
const DATOS_FIJOS = /^(ZAPI_PROMOS|p|c)\./;
const ETIQUETA = /<[a-zA-Z/]/;
const ACENTO = /(?<!\\)`/g;

const hallazgos = escanearXSS(JS.map(f => [f, fs.readFileSync(path.join(raiz, f), 'utf8')]));
hallazgos.forEach(h => avisar(h));
if (!hallazgos.length) ok('toda interpolacion dentro de HTML pasa por escaparHTML');

/* Un chequeo que nunca falla no dice nada, asi que primero se le
   pasa un archivo con un XSS a proposito y se exige que lo pille.
   Si el detector se rompe, el self-test se entera antes que el
   sitio. */
console.log('\nSelf-test del detector de XSS');
const trampa = [
    'grid.innerHTML = lista.map(producto => {',
    '    return `',
    '        <span class="badge">${producto.categoria}</span>',
    '    `;',
    '});'
].join('\n');

if (escanearXSS([['trampa.js', trampa]]).length) ok('el detector encuentra un XSS de prueba');
else avisar('el detector NO encuentra un XSS de prueba: no sirve de nada');

const limpio = 'const t = `hola ${a.nombre}`;\nimg.alt = `x ${b.nombre}`;\n';
const falsos = escanearXSS([['limpio.js', limpio]]);

if (!falsos.length) ok('no marca texto plano ni propiedades sin markup');
else avisar('falsos positivos: ' + falsos.join(' | '));

function escanearXSS(archivos) {
    const out = [];

    for (const [f, contenido] of archivos) {
        const lineas = contenido.split('\n');
        let bloque = null;
        let dentro = false;

        for (let i = 0; i < lineas.length; i++) {
            const linea = lineas[i];
            const acentos = (linea.match(ACENTO) || []).length;

            /* Se sigue el balance de acentos graves, no la posicion
               del ultimo: un acento al final de la linea puede ser
               el que ABRE la plantilla (return `), no el que la
               cierra. Y una linea con dos acentos abre y cierra en
               el mismo lugar, que tambien hay que cubrir. */

            if (acentos && !dentro) bloque = [];

            if (bloque) bloque.push({ n: i + 1, texto: linea });

            dentro = dentro !== (acentos % 2 === 1);

            if (!dentro && bloque) {
                out.push(...revisarBloqueHTML(f, bloque));
                bloque = null;
            }
        }
    }

    return out;
}

function revisarBloqueHTML(archivo, bloque) {
    const fuera = [];
    const unido = bloque.map(l => l.texto).join('\n');

    if (!ETIQUETA.test(unido)) return fuera;

    for (const { n, texto } of bloque) {
        if (/^\s*[\w.]+\.(alt|textContent|value|src|title|placeholder)\s*=/.test(texto)) continue;

        for (const m of texto.matchAll(INTERP)) {
            const expr = m[1];
            if (NUMERICO.test(expr)) continue;
            if (DATOS_FIJOS.test(expr)) continue;
            if (texto.includes('escaparHTML(' + expr)) continue;
            if (texto.includes('formatearPrecio(' + expr)) continue;
            fuera.push(archivo + ':' + n + '  ${' + expr + '} sin escapar: ' + texto.trim());
        }
    }

    return fuera;
}

/* --- 6. Los archivos generados estan al dia --- */
console.log('\nArchivos generados');
const { execFileSync } = require('child_process');
try {
    execFileSync('node', [path.join(raiz, 'tools', 'extraer-modal-css.js')],
        { cwd: raiz, stdio: 'pipe' });
    ok('catalogo-modal.css y catalogo-catalogo.css regenerados');
} catch (e) {
    avisar('no se pudo regenerar el CSS del catalogo: ' + e.message);
}

/* --- 7. Scripts que faltan en cada pagina ---
   Los tres HTML comparten el mismo header, pero cada uno carga un
   subconjunto de los scripts. Ya paso dos veces que index.html
   tenia el menu y el buscador dibujados sin cargar menu.js ni
   buscador.js: nada fallaba en consola, solo que los controles no
   respondian.

   Se comprueba en los dos sentidos: que no falte un script cuyo
   markup esta presente, y que un script que expone algo en window
   este cargado en toda pagina que lo use. */
console.log('\nScripts por pagina');

const MARCADO_QUE_NECESITA_SCRIPT = [
    { marca: 'id="navToggle"', script: 'menu.js' },
    { marca: 'id="navBackdrop"', script: 'menu.js' },
    { marca: 'id="headerSearch"', script: 'buscador.js' }
];

/* Quien define cada window.algo y quien lo usa, para poder cruzar
   "esta pagina carga al que usa" contra "y carga al que define". */
const define = new Map();
const usa = new Map();
const globales = new Set();

for (const f of JS) {
    const s = fs.readFileSync(path.join(raiz, f), 'utf8');
    for (const m of s.matchAll(/window\.([a-zA-Z_$][\w$]*)\s*=/g)) {
        define.set(m[1], f);
        globales.add(m[1]);
    }
    for (const m of s.matchAll(/window\.([a-zA-Z_$][\w$]*)/g)) {
        usa.set(m[1], (usa.get(m[1]) || new Set()).add(f));
    }
}

for (const f of HTML) {
    const s = fs.readFileSync(path.join(raiz, f), 'utf8');
    const cargados = new Set(Array.from(s.matchAll(/<script src="\.?\/?([^"]+\.js)"/g), m => m[1]));
    let fallos = 0;

    for (const { marca, script } of MARCADO_QUE_NECESITA_SCRIPT) {
        if (s.includes(marca) && !cargados.has(script)) {
            avisar(f + ' tiene ' + marca + ' pero no carga ' + script);
            fallos++;
        }
    }

    for (const [nombre, quienes] of usa) {
        if (!define.has(nombre)) continue;
        for (const consumidor of quienes) {
            if (cargados.has(consumidor) && !cargados.has(define.get(nombre))) {
                avisar(f + ' carga ' + consumidor + ', que usa window.' + nombre +
                    ', pero no carga ' + define.get(nombre) + ' que lo define');
                fallos++;
            }
        }
    }

    if (!fallos) ok(f + ': ' + cargados.size + ' scripts, todos los que hacen falta');
}

console.log('\n' + (problemas ? problemas + ' problema(s)' : 'Sin problemas'));

/* Suma de llaves: se deja fuera del conteo de "ok" porque es
   informativo, no un error. */
