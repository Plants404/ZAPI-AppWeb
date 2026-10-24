'use strict';
/* Equivalencia del CSS que carga cada pagina.
   Usage: node tools/verificar-css-equivalencia.js [rev]

   Para que sirve: esta refactorizacion mueve reglas de un archivo a
   otro, deduplica variables y cambia el orden de los <link>. Nada de
   eso puede cambiar como se ve el sitio, y a ojo no se nota. Este
   script arma, para cada pagina, la lista ordenada de reglas que el
   navegador termina aplicando -con las var() ya resueltas- y la
   compara contra la misma lista calculada en una revision anterior de
   git (por defecto HEAD). Si algo cambia, lo imprime y sale con 1.

   Tres decisiones que hacen util la comparacion:

   - Las reglas :root salen de la lista de reglas. Una variable no es
     una regla: es un valor de la tabla que se usa para resolver
     var(). Asi, deduplicar el :root de styles.css no cuenta como
     cambio mientras la tabla final quede igual.
   - Cada valor se guarda con su var() resuelto. Mover una variable de
     archivo, o reordenar los <link>, no cuenta como cambio si el
     valor que llega al navegador es el mismo.
   - La lista de hojas que carga cada pagina tampoco cuenta: partir
     styles.css en varios archivos la cambia sin cambiar el dibujo.
   - Se compara el orden de las reglas. Cuando la especificidad
     empata, gana la ultima, asi que dos reglas intercambiadas pueden
     cambiar el dibujo aunque el conjunto sea el mismo. */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const raiz = path.join(__dirname, '..');
const REV = process.argv[2] || 'HEAD';

/* --- paginas ---------------------------------------------------- */

/* Las mismas que revisa tools/verificar.js, mas las fichas. */
function paginas() {
    const sueltas = ['index.html', 'catalogo.html', 'carrito.html', 'pedidos.html',
        'login.html', '404.html'];
    const carpeta = path.join(raiz, 'productos');
    const fichas = fs.readdirSync(carpeta)
        .filter(f => f.endsWith('.html'))
        .sort()
        .map(f => 'productos/' + f);
    return sueltas.concat(fichas);
}

/* --- lectura ---------------------------------------------------- */

/* delRev en false lee el disco; si no, git. Devuelve null cuando el
   archivo no existe en esa revision (pagina o hoja nueva). */
function leer(rel, delRev) {
    if (!delRev) return fs.readFileSync(path.join(raiz, rel), 'utf8');
    try {
        return execFileSync('git', ['show', REV + ':' + rel],
            { cwd: raiz, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    } catch {
        return null;
    }
}

/* Hojas CSS locales que carga una pagina, en orden de aparicion.
   Las de otro origen (Google Fonts) no se comparan: no son nuestras. */
function hojasDe(html, pagina) {
    const base = path.posix.dirname(pagina);
    const hojas = [];
    const re = /<link\b[^>]*>/gi;
    let m;

    while ((m = re.exec(html))) {
        const etiqueta = m[0];
        if (!/rel\s*=\s*"stylesheet"/i.test(etiqueta)) continue;

        const hr = /href\s*=\s*"([^"]+)"/i.exec(etiqueta);
        if (!hr) continue;

        const href = hr[1];
        if (/^(https?:)?\/\//.test(href) || href.startsWith('data:')) continue;

        hojas.push(path.posix.normalize(path.posix.join(base, href)));
    }

    return hojas;
}

/* --- parseo de CSS ---------------------------------------------- */

function limpiar(s) {
    return s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizarDecl(d) {
    const t = limpiar(d);
    const i = t.indexOf(':');
    if (i < 0) return t;
    return t.slice(0, i).trim() + ': ' + t.slice(i + 1).trim();
}

/* Un hex es lo mismo en mayusculas que en minusculas, y #abc es
   #aabbcc. Sin esto, cambiar #FFFFFF por var(--white) -que resuelve
   a #ffffff- daria un cambio falso. */
function normalizarHex(texto) {
    return texto.replace(/#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g,
        (todo, h) => '#' + (h.length <= 4
            ? h.split('').map(c => c + c).join('')
            : h).toLowerCase());
}

/* Recorre la hoja caracter a caracter y devuelve las reglas en orden
   de aparicion. Se saltean comentarios y cadenas, y el ; { } que
   aparece dentro de parentesis no cuenta: hay url() con data: que
   llevan punto y coma adentro. */
function analizar(css) {
    const reglas = [];
    const pila = [];
    let i = 0;
    let inicio = 0;
    let parentesis = 0;

    while (i < css.length) {
        const c = css[i];

        if (c === '/' && css[i + 1] === '*') {
            const fin = css.indexOf('*/', i + 2);
            i = fin < 0 ? css.length : fin + 2;
            continue;
        }

        if (c === '"' || c === "'") {
            i++;
            while (i < css.length && css[i] !== c) i += css[i] === '\\' ? 2 : 1;
            i++;
            continue;
        }

        if (parentesis) {
            if (c === '(') parentesis++;
            else if (c === ')') parentesis--;
            i++;
            continue;
        }

        if (c === '(') { parentesis++; i++; continue; }

        if (c === '{') {
            const preludio = limpiar(css.slice(inicio, i));
            pila.push({
                preludio,
                decls: [],
                esGrupo: /^@(media|supports|layer|container)\b/i.test(preludio)
            });
            inicio = i + 1;
            i++;
            continue;
        }

        if (c === ';') {
            const texto = limpiar(css.slice(inicio, i));
            const actual = pila[pila.length - 1];

            if (texto) {
                /* Sin pila es un @import o un @charset suelto: se
                   guarda como regla para que un cambio de orden se
                   note. */
                if (actual) actual.decls.push(texto);
                else reglas.push({ contexto: '', selector: texto, decls: [] });
            }

            inicio = i + 1;
            i++;
            continue;
        }

        if (c === '}') {
            const marco = pila.pop();
            const texto = limpiar(css.slice(inicio, i));
            if (texto && marco) marco.decls.push(texto);

            if (marco && !marco.esGrupo) {
                const contexto = pila.filter(f => f.esGrupo).map(f => f.preludio).join(' && ');
                reglas.push({ contexto, selector: marco.preludio, decls: marco.decls });
            }

            inicio = i + 1;
            i++;
            continue;
        }

        i++;
    }

    return reglas;
}

/* --- var() ------------------------------------------------------ */

/* Indice del separador al nivel de parentesis 0, para no partir un
   valor por una coma que esta dentro de calc() o de rgba(). */
function indiceTop(texto, buscado) {
    let nivel = 0;

    for (let i = 0; i < texto.length; i++) {
        if (texto[i] === '(') nivel++;
        else if (texto[i] === ')') nivel--;
        else if (texto[i] === buscado && nivel === 0) return i;
    }

    return -1;
}

/* Reemplaza var(--x) por su valor. Si la variable no existe y no hay
   respaldo, deja el var() como estaba: es lo que haria el navegador
   (declaracion invalida) y asi el cambio queda a la vista. */
function resolver(valor, vars, camino) {
    let salida = '';
    let i = 0;

    while (i < valor.length) {
        if (!valor.startsWith('var(', i)) {
            salida += valor[i];
            i++;
            continue;
        }

        let j = i + 4;
        let nivel = 1;
        while (j < valor.length && nivel) {
            if (valor[j] === '(') nivel++;
            else if (valor[j] === ')') nivel--;
            j++;
        }

        const dentro = valor.slice(i + 4, j - 1);
        const coma = indiceTop(dentro, ',');
        const nombre = (coma < 0 ? dentro : dentro.slice(0, coma)).trim();
        const respaldo = coma < 0 ? null : dentro.slice(coma + 1).trim();
        const propia = Object.prototype.hasOwnProperty.call(vars, nombre);

        if (propia && !camino.includes(nombre)) {
            salida += resolver(vars[nombre], vars, camino.concat(nombre));
        } else if (respaldo !== null) {
            salida += resolver(respaldo, vars, camino);
        } else {
            salida += 'var(' + dentro + ')';
        }

        i = j;
    }

    return salida;
}

const RE_VAR = /var\(\s*(--[\w-]+)/g;

function nombresDeVar(texto) {
    const nombres = new Set();
    let m;
    RE_VAR.lastIndex = 0;

    while ((m = RE_VAR.exec(texto))) nombres.add(m[1]);
    return nombres;
}

/* --- armado por pagina ------------------------------------------ */

/* Devuelve el estado de una pagina: las hojas que carga, la lista
   ordenada de reglas con los var() resueltos y la tabla de variables
   que esas reglas usan. */
function estadoDePagina(pagina, delRev) {
    const html = leer(pagina, delRev);
    if (html === null) return null;

    const hojas = hojasDe(html, pagina);
    const reglas = [];
    const vars = {};

    for (const hoja of hojas) {
        const css = leer(hoja, delRev);
        if (css === null) return { falta: hoja };

        for (const r of analizar(css)) {
            const esRaiz = !r.contexto && /^(:root|html)$/.test(r.selector);
            const decls = [];

            for (const d of r.decls) {
                const i = d.indexOf(':');
                const prop = i < 0 ? '' : d.slice(0, i).trim();
                const valor = i < 0 ? '' : d.slice(i + 1).trim();

                /* Las variables de :root no son reglas: van a la
                   tabla. El resto de la regla, si queda algo, se
                   conserva. */
                if (prop.startsWith('--') && esRaiz) {
                    if (valor) vars[prop] = valor;
                    continue;
                }

                decls.push(d);
            }

            if (decls.length) {
                reglas.push({ contexto: r.contexto, selector: r.selector, decls });
            }
        }
    }

    /* Los var() dentro de la tabla tambien se resuelven, para que
       --a: var(--b) valga lo mismo este definida donde este. */
    for (const nombre of Object.keys(vars)) {
        vars[nombre] = normalizarHex(resolver(vars[nombre], vars, [nombre]));
    }

    const usadas = {};
    const lineas = [];

    for (const r of reglas) {
        const decls = r.decls.map(d => {
            for (const n of nombresDeVar(d)) usadas[n] = vars[n] === undefined ? null : vars[n];
            return normalizarHex(normalizarDecl(resolver(d, vars, [])));
        });

        const contexto = r.contexto ? r.contexto + ' && ' : '';
        lineas.push(contexto + r.selector + ' { ' + decls.join('; ') + ' }');
    }

    return { hojas, lineas, usadas };
}

/* --- comparacion ------------------------------------------------ */

function comparar(nombre, viejo, nuevo, salida) {
    if (viejo === nuevo) return 0;

    if (Array.isArray(viejo)) {
        let cambios = 0;
        const largo = Math.max(viejo.length, nuevo.length);

        for (let i = 0; i < largo; i++) {
            if (viejo[i] === nuevo[i]) continue;
            cambios++;
            if (cambios > 10) continue;
            if (viejo[i] === undefined) salida.push('    + ' + nuevo[i]);
            else if (nuevo[i] === undefined) salida.push('    - ' + viejo[i]);
            else salida.push('    - ' + viejo[i] + '\n    + ' + nuevo[i]);
        }

        if (cambios) {
            salida.push('    (' + cambios + ' linea(s) distinta(s) en ' + nombre + ')');
        }

        return cambios;
    }

    salida.push('    ' + nombre + ': "' + viejo + '" -> "' + nuevo + '"');
    return 1;
}

/* --- main ------------------------------------------------------- */

const paginasARevisar = paginas();
let conCambios = 0;
let revisadas = 0;

console.log('CSS: equivalencia contra ' + REV);
console.log('Paginas: ' + paginasARevisar.length);

for (const pagina of paginasARevisar) {
    const linea = [];

    const viejo = estadoDePagina(pagina, true);
    const nuevo = estadoDePagina(pagina, false);

    if (nuevo === null) {
        linea.push('    falta la pagina en el disco');
        conCambios++;
        console.log('\n' + pagina + '\n' + linea.join('\n'));
        continue;
    }

    if (nuevo.falta) {
        linea.push('    no se pudo leer ' + nuevo.falta);
        conCambios++;
        console.log('\n' + pagina + '\n' + linea.join('\n'));
        continue;
    }

    if (viejo === null) {
        console.log('\n' + pagina + '\n    pagina nueva: no hay nada con que comparar');
        revisadas++;
        continue;
    }

    /* La lista de hojas no se compara: partir styles.css en varios
       archivos la cambia aunque el dibujo sea el mismo. Lo que importa
       es la lista ordenada de reglas con sus var() resueltos, que es
       lo que sigue. Si a una pagina le falta una hoja, le faltan sus
       reglas y la comparacion de reglas lo delata. */
    let cambios = comparar('reglas', viejo.lineas, nuevo.lineas, linea);

    /* Solo se comparan las variables que las dos versiones usan. Una
       variable que empieza a usarse, o que deja de usarse, no cambia
       el dibujo por si sola: lo que importa es el valor que termina
       en la regla, y eso ya se compara arriba. */
    for (const n of new Set([...Object.keys(viejo.usadas), ...Object.keys(nuevo.usadas)])) {
        if (viejo.usadas[n] === undefined || nuevo.usadas[n] === undefined) continue;
        cambios += comparar('var ' + n, viejo.usadas[n], nuevo.usadas[n], linea);
    }

    if (cambios) {
        conCambios++;
        console.log('\n' + pagina);
        console.log(linea.join('\n'));
        console.log('    hojas viejas: ' + viejo.hojas.join(', '));
        console.log('    hojas nuevas: ' + nuevo.hojas.join(', '));
        console.log('    reglas: ' + viejo.lineas.length + ' -> ' + nuevo.lineas.length);
    } else {
        revisadas++;
    }
}

console.log('');

if (conCambios) {
    console.error('FALLA  ' + conCambios + ' pagina(s) con el CSS cambiado respecto de ' + REV);
    console.error('       Si el cambio es a proposito, hace falta una decision explicita.');
    process.exit(1);
}

console.log('ok     ' + revisadas + ' pagina(s) con el mismo CSS que ' + REV);
