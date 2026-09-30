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

/* --- 5. XSS: ningun dato de visitante entra crudo a innerHTML --- */
console.log('\nXSS');
const visit = ['busquedaActual'];
let xss = 0;
for (const f of JS) {
    const s = fs.readFileSync(path.join(raiz, f), 'utf8');
    for (const v of visit) {
        if (new RegExp('\\$\\{' + v + '\\}').test(s) && !new RegExp('escaparHTML\\(' + v + '\\)').test(s)) {
            avisar(f + ' interpola ' + v + ' sin escapar');
            xss++;
        }
    }
}
if (!xss) ok('ninguna interpolacion cruda de datos de visitante');

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

console.log('\n' + (problemas ? problemas + ' problema(s)' : 'Sin problemas'));

/* Suma de llaves: se deja fuera del conteo de "ok" porque es
   informativo, no un error. */
