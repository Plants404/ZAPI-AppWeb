'use strict';
/* Verificacion estatica del sitio. Usage: node tools/verificar.js
   No modifica nada: solo informa lo que encuentra. */

const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');

/* Los HTML siguen en la raiz para no cambiar las URLs publicas
   (/catalogo.html, /productos/albahaca.html). Los estilos, scripts e
   imagenes viven en public/. */
const HTML = ['index.html', 'catalogo.html', 'carrito.html'];
const CSS = ['styles.css', 'catalogo.css', 'catalogo-modal.css',
    'catalogo-catalogo.css', 'stylecarrito.css', 'zapi-bot.css'];
const JS = ['productos.js', 'modal.js', 'catalogo.js', 'carrito.js',
    'zapi-bot.js', 'navigation.js', 'buscador.js', 'menu.js',
    'testimonios.js', 'contacto.js'];

const rutaCss = nombre => path.join(raiz, 'public', 'css', nombre);
const rutaJs = nombre => path.join(raiz, 'public', 'js', nombre);

let problemas = 0;
const avisar = m => { problemas++; console.log('  FALLA  ' + m); };
const ok = m => console.log('  ok     ' + m);

/* Para lo que hay que ver pero no esta mal. Renombrar un producto
   borra su ficha vieja: eso es lo correcto, no un error, pero tiene
   que quedar a la vista porque se borro un archivo. */
const nota = m => console.log('  nota   ' + m);

/* --- 1. CSS: llaves balanceadas --- */
console.log('\nCSS');
for (const f of CSS) {
    const s = fs.readFileSync(rutaCss(f), 'utf8');
    let d = 0;
    for (const c of s) { if (c === '{') d++; if (c === '}') d--; }
    if (d === 0) ok(f); else avisar(f + ' llaves desbalanceadas: ' + d);
}

/* --- 2. ARIA apunta a algo que existe ---
   aria-describedby y aria-labelledby aceptan una lista de ids
   separados por espacio (el formulario de contacto describe el
   campo con el mensaje de error y con la ayuda a la vez), asi que
   la lista se parte antes de comparar. */
console.log('\nARIA');
for (const f of HTML) {
    const s = fs.readFileSync(path.join(raiz, f), 'utf8');
    const ids = new Set(Array.from(s.matchAll(/id="([^"]+)"/g), m => m[1]));
    let malos = 0;
    for (const m of s.matchAll(/aria-(?:controls|describedby|labelledby)="([^"]+)"/g)) {
        for (const destino of m[1].trim().split(/\s+/)) {
            if (!ids.has(destino)) { avisar(f + ' aria apunta a #' + destino + ' que no existe'); malos++; }
        }
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
const INTERP = /\$\{([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*)\}/g;
const NUMERICO = /\.(id|cantidad|precio|precioBase|indice|total|subtotal|length)$/;
const DATOS_FIJOS = /^(ZAPI_[A-Z_]+|p|c)(\.|$)/;

/* Nombres sueltos que solo pueden ser un numero: indices de un
   forEach o de un map, y cuentas que arma el bot. */
const NUMEROS = /^(i|j|idx|indice|indiceActual|n|pos|total|cantidad|unidades|totalCarrito)$/;

/* Variables que guardan HTML a proposito y se declaran o se
   reasignan con una plantilla que tiene una etiqueta adentro
   (sugerencia = `<button ...`). Es el caso de los botones que el
   sitio se dibuja a si mismo. No es lo mismo que un texto que se
   te escapo: se reconoce por como se arma la variable, no por una
   lista escrita a mano. El lookbehind saltea "grid.innerHTML =",
   que tambien es una asignacion pero no una variable. */
const htmlPropias = new Set();

for (const f of JS) {
    const s = fs.readFileSync(rutaJs(f), 'utf8');
    const re = /(?<![.\w$])([a-zA-Z_$][\w$]*)\s*=\s*`([\s\S]*?)`/g;

    for (const m of s.matchAll(re)) {
        if (/<[a-zA-Z/]/.test(m[2])) htmlPropias.add(m[1]);
    }
}
const ETIQUETA = /<[a-zA-Z/]/;
const ACENTO = /(?<!\\)`/g;

const hallazgos = escanearXSS(JS.map(f => [f, fs.readFileSync(rutaJs(f), 'utf8')]));
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
            if (NUMERICO.test(expr) || NUMEROS.test(expr)) continue;
            if (DATOS_FIJOS.test(expr) || htmlPropias.has(expr)) continue;
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
    ok('public/css/catalogo-modal.css y catalogo-catalogo.css regenerados');
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
    { marca: 'id="headerSearch"', script: 'buscador.js' },
    { marca: 'id="testimoniosCarrusel"', script: 'testimonios.js' },
    { marca: 'id="contactoForm"', script: 'contacto.js' }
];

/* Quien define cada window.algo y quien lo usa, para poder cruzar
   "esta pagina carga al que usa" contra "y carga al que define". */
const define = new Map();
const usa = new Map();
const globales = new Set();

for (const f of JS) {
    const s = fs.readFileSync(rutaJs(f), 'utf8');
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
    /* El src ahora trae carpeta (./public/js/menu.js), pero las listas
       de arriba nombran los scripts por archivo. Se queda solo con el
       nombre para poder comparar. */
    const cargados = new Set(Array.from(
        s.matchAll(/<script src="[^"]*\/([^"/]+\.js)"/g), m => m[1]
    ));
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

/* --- 8. Animaciones infinitas sin respeta de reduced motion ---
   Una animacion con "infinite" no se detiene nunca: es justo lo que
   una persona con prefers-reduced-motion pide que no pase. Se
   recorren los bloques de las hojas, se anotan las que repiten y se
   cruzan con los selectores que, dentro de un
   @media (prefers-reduced-motion: reduce), ponen animation: none. */
console.log('\nReduced motion');

const infinitas = [];
const apagadas = new Set();

/* Se recorre el CSS caracter a caracter apilando las llaves: hace
   falta saber la profundidad para no cortar un bloque de @media en
   su primer "}" y para separar el selector de las declaraciones
   que lo preceden. */
function recorrerBloques(css, archivo) {
    const pila = [];
    const reduced = [];
    let profundidad = 0;
    let desde = 0;
    let i = 0;

    while (i < css.length) {
        if (css[i] === '{') {
            const bruto = css.slice(desde, i);
            const selector = bruto.slice(bruto.lastIndexOf(';') + 1)
                .replace(/\s+/g, ' ').trim();
            const abre = selector.replace(/\s+/g, ' ');

            pila.push({ abre, cuerpo: desde + 1 });
            if (/prefers-reduced-motion/.test(abre)) reduced.push(profundidad);

            profundidad++;
            desde = i + 1;
            i++;
            continue;
        }

        if (css[i] === '}') {
            const bloque = pila.pop();
            profundidad--;

            if (bloque) {
                const cuerpo = css.slice(bloque.cuerpo, i);
                const esKeyframes = /^@(-webkit-)?keyframes/.test(bloque.abre);
                const dentroDeReduced = reduced.length > 0;

                if (!esKeyframes && /animation\s*:[^;]*\binfinite\b/.test(cuerpo)) {
                    infinitas.push({ archivo, selector: bloque.abre });
                }

                if (!esKeyframes && dentroDeReduced && /animation(-name)?\s*:\s*none/.test(cuerpo)) {
                    /* Un mismo bloque suele apagar varios selectores
                       a la vez, separados por comas. */
                    bloque.abre.split(',').forEach(sel => apagadas.add(sel.trim()));
                }
            }

            while (reduced.length && reduced[reduced.length - 1] >= profundidad) reduced.pop();

            desde = i + 1;
            i++;
            continue;
        }

        i++;
    }
}

for (const f of CSS) {
    recorrerBloques(fs.readFileSync(rutaCss(f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''), f);
}

/* Un selector apagado cubre tambien a los que lo extienden:
   ".nav-bar" apagado cubre ".nav-bar li .nav-link". */
const cubre = sel => {
    if (apagadas.has(sel) || apagadas.has('*')) return true;

    return [...apagadas].some(a =>
        a !== sel &&
        (sel.startsWith(a + ' ') || sel.startsWith(a + '>') || sel.startsWith(a + ':') || sel.startsWith(a + '.'))
    );
};

const sinCubrir = infinitas.filter(a => !cubre(a.selector));

if (sinCubrir.length === 0) {
    ok(infinitas.length + ' animacion(es) infinite, todas apagadas con reduced motion');
} else {
    for (const a of sinCubrir) {
        avisar(a.archivo + ': "' + a.selector + '" se repite para siempre y no se apaga con prefers-reduced-motion');
    }
}

/* --- 9. Paginas de producto generadas ---
   Se corre el generador primero, asi que ademas de validar lo
   que hay en disco esto deja las paginas al dia con productos.js.
   De cada pagina se mira que el JSON-LD parse, que el canonical
   apunte a la pagina misma, y que las imagenes y los enlaces que
   usa existan de verdad. */
console.log('\nPaginas de producto');

const gen = path.join(raiz, 'tools', 'generar-productos.js');

if (!fs.existsSync(gen)) {
    avisar('falta tools/generar-productos.js');
} else {
    try {
        const salida = execFileSync('node', [gen], { cwd: raiz, stdio: 'pipe' }).toString();

        /* El generador poda las fichas que ya no estan en el catalogo
           y lo dice en su salida. Como acá la salida se traga, se lee
           para que quien verifica se entere de que se borro algo. */
        const podadas = [];
        let dentro = false;

        for (const linea of salida.split('\n')) {
            const t = linea.trim();

            if (/^Fichas borradas/.test(t) || /^Poda suspendida/.test(t)) {
                dentro = true;
                continue;
            }
            if (dentro && /^Archivos \.html/.test(t)) { dentro = false; continue; }

            if (dentro && /^productos\//.test(t)) {
                podadas.push(t.replace(/\s+\(.*/, ''));
            }
        }

        for (const ficha of podadas) {
            nota(ficha + ' se borro: su producto ya no esta en el catalogo');
        }

        if (podadas.length) {
            nota('  esas fichas quedaban publicadas con el precio anterior y en el sitemap');
        }
    } catch (e) {
        avisar('el generador fallo: ' + String(e.stderr || e.message).trim().split('\n').pop());
    }

    const carpeta = path.join(raiz, 'productos');
    const paginas = fs.existsSync(carpeta)
        ? fs.readdirSync(carpeta).filter(f => f.endsWith('.html'))
        : [];

    if (!paginas.length) {
        avisar('no hay paginas en productos/');
    }

    let malas = 0;

    for (const f of paginas) {
        const s = fs.readFileSync(path.join(carpeta, f), 'utf8');
        const donde = 'productos/' + f;

        /* JSON-LD: tiene que parsear, y si no se puede leer, el
           buscador lo ignora en silencio. */
        const bloques = Array.from(s.matchAll(
            /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
        ), m => m[1]);

        if (!bloques.length) {
            avisar(donde + ': no tiene JSON-LD');
            malas++;
        }

        for (const b of bloques) {
            try {
                const datos = JSON.parse(b);

                if (datos['@context'] !== 'https://schema.org') {
                    avisar(donde + ': el @context no es schema.org');
                    malas++;
                }
            } catch (e) {
                avisar(donde + ': JSON-LD que no parsea: ' + e.message);
                malas++;
            }
        }

        /* El canonical tiene que ser esta pagina, no la home. */
        const canonical = s.match(/<link rel="canonical" href="([^"]+)"/);

        if (!canonical) {
            avisar(donde + ': sin canonical');
            malas++;
        } else if (!canonical[1].endsWith('/productos/' + f)) {
            avisar(donde + ': el canonical no apunta a si misma (' + canonical[1] + ')');
            malas++;
        }

        /* Imagenes y enlaces locales existen. La pagina vive en
           productos/, asi que "../asset/..." se resuelve desde
           esa carpeta y no desde la raiz del repo. */
        for (const m of s.matchAll(/(?:src|href)="(\.\.\/[^"#?]+)"/g)) {
            if (!fs.existsSync(path.resolve(carpeta, m[1]))) {
                avisar(donde + ': no existe ' + m[1]);
                malas++;
            }
        }

        for (const m of s.matchAll(/href="(\.\/[a-z0-9-]+\.html)"/g)) {
            if (!fs.existsSync(path.join(carpeta, m[1].replace('./', '')))) {
                avisar(donde + ': link a otra pagina que no existe: ' + m[1]);
                malas++;
            }
        }
    }

    /* El modal enlaza a productos/<slugDe(nombre)>.html con su propio
       slugDe (modal.js), el generador nombra los archivos con su
       slug (herramienta aparte) y el servidor arma la columna slug de
       la base con un tercero (server/catalogo.js). Si alguno se toca
       distinto, el enlace cae en una pagina que no existe o /api/
       productos devuelve una URL que no corresponde a la ficha: se
       prueban las TRES implementaciones contra los nombres reales. */
    function extraerFuncion(archivo, nombre) {
        /* Los scripts de navegador van en public/js/, los generadores de
           tools/ y la logica del servidor en server/. Se distinguen por
           la carpeta donde estan, no por el nombre, porque los tres son
           .js y los tres se leen desde aca.

           Un nombre con "/" se toma como ruta desde la raiz. Hace falta
           porque "catalogo.js" esta en dos carpetas a la vez: el del
           navegador (public/js/) no tiene slug(), el del servidor
           (server/) si. Sin esto se leeria el equivocado. */
        const donde = archivo.includes('/')
            ? path.join(raiz, archivo)
            : [
                path.join(raiz, 'tools', archivo),
                rutaJs(archivo),
                path.join(raiz, 'server', archivo)
            ].find(ruta => fs.existsSync(ruta));

        if (!donde || !fs.existsSync(donde)) return null;

        const s = fs.readFileSync(donde, 'utf8');
        const ini = s.indexOf('function ' + nombre + '(');
        if (ini < 0) return null;

        const abrio = s.indexOf('{', ini);
        let prof = 0;
        let entre = null; /* ', ", `, /, * o \n: saltar literales, regex y comentarios */
        let i = abrio;

        for (; i < s.length; i++) {
            const c = s[i];

            if (entre) {
                if (c === '\\') { i++; continue; }
                if (entre !== '*' && c === entre) entre = null;
                if (entre === '*' && c === '/' && s[i - 1] === '*') entre = null;
                if (entre === '\n') entre = null;
                continue;
            }
            if (c === '"' || c === "'" || c === '`') { entre = c; continue; }
            if (c === '/' && s[i + 1] === '/') { entre = '\n'; i++; continue; }
            if (c === '/' && s[i + 1] === '*') { entre = '*'; i++; continue; }
            if (c === '/' && s[i + 1] !== '=') { entre = '/'; continue; }
            if (c === '{') prof++;
            else if (c === '}') { prof--; if (prof === 0) return s.slice(abrio + 1, i); }
        }
        return null;
    }

    /* generar-productos.js vive en tools/, no en public/js/, asi que no
       pasa por rutaJs(): esa resuelve scripts de navegador.
       El servidor tiene un tercer slug() en server/catalogo.js, el que
       arma la columna slug de la base. */
    const cuerpoGen = extraerFuncion('generar-productos.js', 'slug');
    const cuerpoModal = extraerFuncion('modal.js', 'slugDe');
    const cuerpoServidor = extraerFuncion('server/catalogo.js', 'slug');

    if (!cuerpoGen || !cuerpoModal || !cuerpoServidor) {
        avisar('no se encontro slug() del generador, slugDe() de modal.js o slug() de server/catalogo.js');
        malas++;
    } else {
        const slugGen = new Function('texto', cuerpoGen);
        const slugModal = new Function('texto', cuerpoModal);
        const slugServidor = new Function('texto', cuerpoServidor);

        /* El catalogo es un literal JS (claves sin comillas), no
           JSON: se evalua tal cual. */
        const fuente = fs.readFileSync(rutaJs('productos.js'), 'utf8');
        const literal = fuente.match(/const PRODUCTOS = (\[[\s\S]*?\n\]);/);
        const nombres = literal ? new Function('return ' + literal[1])() : null;

        if (!nombres) {
            avisar('no se pudo leer PRODUCTOS de productos.js');
            malas++;
        } else {
            for (const p of nombres) {
                if (!p || !p.nombre) continue;

                const a = slugGen(p.nombre);
                const b = slugModal(p.nombre);
                const c = slugServidor(p.nombre);
                const existe = fs.existsSync(path.join(carpeta, a + '.html'));

                if (a !== b) {
                    avisar('slug desincronizado para "' + p.nombre + '": generador=' + a + ' modal=' + b);
                    malas++;
                }
                if (a !== c) {
                    avisar('slug desincronizado para "' + p.nombre + '": generador=' + a + ' servidor=' + c +
                        ' (/api/productos daria una URL distinta a la ficha estatica)');
                    malas++;
                }
                if (!existe) {
                    avisar('no existe productos/' + a + '.html (el modal enlazara ahi)');
                    malas++;
                }
            }
        }
    }

    if (!malas) ok(paginas.length + ' paginas generadas, con JSON-LD, canonical e imagenes');
}

/* --- 10. El servidor puede leer el catalogo ------------------------

   server/catalogo.js saca el literal PRODUCTOS de productos.js
   contando llaves y lo evalua con Function(). Se.documento que es
   fragil: si alguien reformatea el archivo (cambia el espaciado del
   "const PRODUCTOS = [", pasa las comillas a simples, agrega un
   comentario con un corchete), el arranque del servidor revienta.

   Aca se llama a leerProductos() de verdad, no a una copia: si el
   metodo deja de poder leer el archivo, esto falla antes de que
   alguien levante el servidor y lo descubra en produccion. La idea
   es que un cambio de formato en productos.js sea un error de
   verificar, no un incidente.

   Cuando el sitio se sirva siempre por Node, este bloque se puede
   borrar junto con el Function(): el catalogo pasara a leerse de un
   JSON y no habra nada que fragile que verificar. */
console.log('\nEl servidor lee el catalogo');

{
    let malas = 0;

    /* Se usa el modulo real, no una reimplementacion: si el metodo
       cambia, la prueba cambia con el. */
    const servidor = require(path.join(raiz, 'server', 'catalogo.js'));

    let leidos = null;
    try {
        leidos = servidor.leerProductos();
    } catch (error) {
        avisar('server/catalogo.js no puede leer productos.js: ' + String(error.message).split('\n')[0]);
        avisar('  si reformateaste productos.js, revisa que "const PRODUCTOS = [" siga igual');
        malas++;
    }

    if (leidos) {
        if (!Array.isArray(leidos) || leidos.length === 0) {
            avisar('leerProductos() no devolvio una lista con contenido');
            malas++;
        } else {
            /* No alcanza con que no tire: lo que el servidor lee tiene
               que ser lo mismo que el navegador dibuja y que el
               generador usa para nombrar los archivos. */
            const fuente = fs.readFileSync(rutaJs('productos.js'), 'utf8');
            const literal = fuente.match(/const PRODUCTOS = (\[[\s\S]*?\n\]);/);
            const delNavegador = literal ? new Function('return ' + literal[1])() : null;

            if (!delNavegador) {
                avisar('no se pudo leer PRODUCTOS de productos.js para comparar');
                malas++;
            } else if (delNavegador.length !== leidos.length) {
                avisar('el servidor lee ' + leidos.length + ' productos y el navegador ' +
                    delNavegador.length + ': el recorte del literal esta partiendo el array');
                malas++;
            } else {
                for (let i = 0; i < delNavegador.length; i++) {
                    const delServer = leidos[i];
                    const delFront = delNavegador[i];

                    if (String(delServer.id) !== String(delFront.id)) {
                        avisar('producto ' + i + ': el id del servidor es ' + delServer.id +
                            ' y el del navegador ' + delFront.id);
                        malas++;
                    }
                    if (servidor.slug(delServer.nombre) !== servidor.slug(delFront.nombre)) {
                        avisar('producto ' + i + ' (' + delFront.nombre + '): el nombre leido por el ' +
                            'servidor no es el que usa el navegador');
                        malas++;
                    }
                }
            }

            /* El id es la clave con la que se inserts en la base: si
               faltara, sembrar() tiraria al arrancar. */
            const sinId = leidos.filter(p => !p || !p.id);
            if (sinId.length) {
                avisar(sinId.length + ' producto(s) sin id: sembrar() fallaria al arrancar');
                malas++;
            }
        }
    }

    if (!malas) {
        ok('server/catalogo.js lee ' + leidos.length + ' productos y coinciden con productos.js');
    }
}

/* --- 11. El .env se carga de verdad ------------------------------

   Node no lee .env por su cuenta: hay que pasararselo con un flag. El
   script start de package.json lo hace, pero si alguien lo saca del
   script el sintoma es silencioso: el servidor arranca igual, asi que
   parece que todo funciona, pero cada reinicio regenera
   ZAPI_SESSION_SECRET y borra todos los carritos abiertos.

   Es un fallo de configuracion, no de codigo, asi que ningun otro
   chequeo lo pilla. */

try {
    const pkg = JSON.parse(fs.readFileSync(path.join(raiz, 'package.json'), 'utf8'));
    const start = (pkg.scripts && pkg.scripts.start) || '';

    /* -if-exists y no solo -env-file: el archivo es opcional porque
       todo tiene valor por defecto, y arrancar sin el tiene que
       funcionar. Con --env-file pelado, un .env ausente tumba el
       servidor y parece un error de instalacion. */
    const conIfExists = /--env-file-if-exists\b/.test(start);
    if (conIfExists) {
        ok('npm start carga .env con --env-file-if-exists');
    } else {
        avisar('npm start no usa --env-file-if-exists: el .env no se carga y ' +
            'ZAPI_SESSION_SECRET se regenera en cada reinicio (script actual: "' + start + '")');
    }
} catch (e) {
    avisar('no se pudo leer package.json: ' + e.message);
}

/* --- Fichas huerfanas -------------------------------------------

   No hace falta buscarlas aca: el generador de arriba ya las poda,
   porque su unica fuente es productos.js. Lo que si hace falta es no
   tragarse lo que hizo. Correr verificar puede borrar fichas, y
   borrar sin avisar es la clase de sorpresa que hace que la gente
   deje de correr la herramienta.

   Por eso se lee la salida del generador y lo que podo se reporta
   como aviso: si alguien renombro un producto, al verificar se entera
   de que la ficha vieja desaparecio y de por que. */

console.log('\n' + (problemas ? problemas + ' problema(s)' : 'Sin problemas'));

/* Suma de llaves: se deja fuera del conteo de "ok" porque es
   informativo, no un error. */
