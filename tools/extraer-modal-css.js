/* Divide catalogo.css en las dos partes que cada pagina necesita.
   Usage: node tools/extraer-modal-css.js

   Por que: catalogo.html necesita la grilla del catalogo y la
   ventana de producto; carrito.html solo la ventana. Antes las dos
   paginas cargaban la hoja entera, y el carrito pagaba ~30KB de
   reglas de grilla que nunca se dibujan.

   La division es por un marcador de seccion, no por numero de
   linea, asi que agregar reglas no rompe nada. catalogo.css queda
   como fuente unica de la verdad y los dos archivos generados se
   regeneran con este script. */

'use strict';

const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const origen = path.join(raiz, 'catalogo.css');

/* El separador tiene que ser el comentario que abre la seccion de
   la ventana flotante. */
const lineas = fs.readFileSync(origen, 'utf8').split(/\r?\n/);

/* El boton .add-cart lo usan las tarjetas del catalogo y el modal,
   que tambien vive en carrito.html. Vive en la parte [CAT], asi que
   hay que copiarlo a mano a la parte del modal. Se copian las tres
   reglas -la base, :hover y .added- y no solo la base: si el modal
   se queda sin :hover ni sin .added, el boton de carrito.html no
   reacciona al pasar el mouse y no se pone verde al agregar. */
const COMPARTIDO = /^\s*\.add-cart(\s*:\s*(hover)|\s*\.added)?\s*\{/;

let corte = -1;

for (let i = 0; i < lineas.length; i++) {
    if (/VENTANA FLOTANTE DE PRODUCTO/.test(lineas[i + 1] || '')) {
        corte = i;
        break;
    }
}
/* Recorta cada bloque compartido hasta que se cierra, para no dejar
   la mitad de una regla. Como son tres followed de tres, se repite
   hasta que no quede ninguno. */
function recortarCompartido(bloque) {

    let actual = bloque;
    const compartidos = [];

    for (;;) {

        const inicio = actual.findIndex(linea => COMPARTIDO.test(linea));

        if (inicio < 0) break;

        let fin = inicio + 1;
        let nivel = 1;

        for (let i = inicio + 1; i < actual.length; i++) {
            for (const c of actual[i]) {
                if (c === '{') nivel++;
                if (c === '}') nivel--;
            }
            if (nivel === 0) { fin = i + 1; break; }
        }

        compartidos.push(actual.slice(inicio, fin).join('\n'));
        actual = actual.slice(0, inicio).concat(actual.slice(fin));

    }

    return { bloque: actual, compartido: compartidos.join('\n\n') };

}
if (corte < 0) {
    console.error('No se encontro el bloque "VENTANA FLOTANTE DE PRODUCTO" en catalogo.css.');
    console.error('Sin ese marcador no se puede partir la hoja. Revisa el comentario de seccion.');
    process.exit(1);
}

const AVISO = '/* Archivo generado. No editar a mano.\n' +
    '   Fuente: catalogo.css   Generar: node tools/extraer-modal-css.js */\n\n';

/* El archivo original esta indentado porque cada bloque va dentro
   de una convencion de sangria; al partirlo se quita esa sangria
   para que las dos mitades se puedan leer y editar. */
function sinSangria(bloque) {
    return bloque.join('\n').replace(/^[ \t]+/gm, '');
}

const { bloque: catalogo, compartido } = recortarCompartido(lineas.slice(0, corte));
const modal = lineas.slice(corte);

const CABECERA_COMPARTIDA =
    '/* Boton agregar: lo usan las tarjetas del catalogo y el modal,\n' +
    '   que tambien esta en carrito.html. Por eso viaja en las dos\n' +
    '   mitades de la hoja. */\n\n';

fs.writeFileSync(
    path.join(raiz, 'catalogo-modal.css'),
    AVISO + CABECERA_COMPARTIDA + compartido.replace(/^[ \t]+/gm, '') + '\n\n' + sinSangria(modal) + '\n'
);

fs.writeFileSync(
    path.join(raiz, 'catalogo-catalogo.css'),
    AVISO + sinSangria(catalogo) + '\n'
);

console.log('catalogo.css partido:');
console.log('  catalogo-catalogo.css  ' + catalogo.length + ' lineas (lo usa catalogo.html)');
console.log('  catalogo-modal.css     ' + modal.length + ' lineas (lo usan catalogo.html y carrito.html)');
if (compartido) {
    console.log('  .add-cart copiado a las dos partes (' + compartido.split('\n').length + ' lineas)');
} else {
    console.error('  AVISO: no se encontro .add-cart, el boton del modal puede quedar sin estilo en carrito.html');
}
