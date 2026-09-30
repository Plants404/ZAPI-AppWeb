'use strict';
/* Contraste WCAG de los pares de color que usa el sitio.
   Usage: node tools/contraste.js

   Lee las variables de color de styles.css, resuelve los pares que
   de verdad se usan en las hojas y calcula la razon de contraste.
   El objetivo es no depender de que el ojo ">ve bien el verde".

   Reglas de WCAG 2.1 que se aplican aca:
     - texto normal: 4.5:1
     - texto grande (>=24px, o >=18.66px en negrita): 3:1
     - bordes de formulario y foco: 3:1 contra el fondo */

const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');

/* --- resolucion de color --- */

function hexA_rgb(hex) {
    let h = hex.replace('#', '').trim();

    if (h.length === 3) h = h.split('').map(c => c + c).join('');

    return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
}

function luminancia(hex) {
    const [r, g, b] = hexA_rgb(hex).map(v => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a, b) {
    const la = luminancia(a);
    const lb = luminancia(b);

    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/* --- variables de las hojas --- */

const variables = {};

for (const f of ['styles.css', 'catalogo.css', 'stylecarrito.css', 'zapi-bot.css']) {
    const s = fs.readFileSync(path.join(raiz, f), 'utf8');

    for (const m of s.matchAll(/(--[a-z-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
        if (!(m[1] in variables)) variables[m[1]] = m[2];
    }
}

const rgb = (nombre, respaldo) => {
    if (nombre in variables) return variables[nombre];
    if (/^#[0-9a-fA-F]{3,8}$/.test(nombre)) return nombre;
    throw new Error('color desconocido: ' + nombre + (respaldo ? ' (' + respaldo + ')' : ''));
};

/* --- los pares que hay que mirar ---
   minimo: 4.5 para texto normal, 3 para texto grande, 3 para UI. */
const PARES = [
    ['texto normal', 4.5, '--ink', '--cream', 'parrafos sobre crema'],
    ['texto normal', 4.5, '--ink', '--white', 'parrafos sobre blanco'],
    ['texto normal', 4.5, '--muted-texto', '--cream', 'parrafos secundarios sobre crema'],
    ['texto normal', 4.5, '--muted-texto', '--white', 'parrafos secundarios sobre blanco'],
    ['texto normal', 4.5, '--muted-texto', '--sand', 'parrafos secundarios sobre arena'],
    ['texto normal', 4.5, '--leaf-texto', '--cream', 'links y.etiquetas sobre crema'],
    ['texto normal', 4.5, '--leaf-texto', '--white', 'links sobre blanco'],
    ['texto normal', 4.5, '--leaf-texto', '--sand', 'links sobre arena'],
    ['texto normal', 4.5, '--leaf-texto', '--sage', 'subtitulos sobre salvia'],
    ['texto grande', 3, '--forest', '--cream', 'titulos sobre crema'],
    ['texto grande', 3, '--forest', '--white', 'titulos sobre blanco'],
    ['texto grande', 3, '--moss', '--cream', 'titulos de seccion sobre crema'],
    ['texto normal', 4.5, '--earth', '--cream', 'texto de notas sobre crema'],
    ['texto normal', 4.5, '--earth', '--sand', 'texto de notas sobre arena'],
    ['UI / foco', 3, '--leaf', '--white', 'borde de tarjeta y foco sobre blanco'],
    ['UI / foco', 3, '--leaf', '--cream', 'borde de tarjeta y foco sobre crema'],
    ['UI / foco', 3, '--borde-input', '--white', 'borde del campo de busqueda'],
    ['UI / foco', 3, '--borde-input', '--cream', 'borde del campo sobre crema'],
    ['UI / foco', 3, '--forest', '--cream', 'boton oscuro sobre crema'],
    ['texto normal', 4.5, '#ffffff', '#0a7b6e', 'boton de WhatsApp (gradiente)'],
    ['texto normal', 4.5, '#ffffff', '#075e54', 'boton de WhatsApp, fin del gradiente'],
    ['texto normal', 4.5, '#ffffff', '#c23a3d', 'badge de error del chatbot'],
    ['texto normal', 4.5, '#ffffff', '#1f3a2e', 'texto sobre footer oscuro']
];

let fallos = 0;

console.log('Contraste WCAG\n');

for (const [tipo, minimo, fg, bg, nota] of PARES) {
    let razon;

    try {
        razon = contraste(rgb(fg), rgb(bg));
    } catch (e) {
        console.log('  ??  ' + fg + ' sobre ' + bg + ': ' + e.message);
        fallos++;
        continue;
    }

    const cumple = razon >= minimo;
    if (!cumple) fallos++;

    console.log('  ' + (cumple ? 'ok  ' : 'FALLA') +
        '  ' + razon.toFixed(2).padStart(5) + ':1  (min ' + minimo + ')' +
        '  ' + fg.padEnd(15) + ' sobre ' + fg ? '' : '');
    console.log('        ' + nota);
}

console.log('\n' + (fallos ? fallos + ' par(es) por debajo del minimo' : 'Todos los pares cumplen'));
