'use strict';
/* Genera una pagina estatica por producto.
   Usage: node tools/generar-productos.js

   Escribe productos/<slug>.html para cada item de PRODUCTOS, con
   title y descripcion propios, canonical, Open Graph, Twitter Card
   y el JSON-LD de Product que piden los buscadores para mostrar el
   precio y la foto en los resultados.

   Los datos salen de productos.js, que es la unica fuente de
   verdad del catalogo: si el precio cambia alla, se corre esto y
   las siete paginas quedan al dia. No hay build ni bundler, solo
   Node >= 18.

   De donde salen los datos
   ------------------------
   productos.js es un script de navegador, asi que no se puede
   importar con require(). Se le saca el literal de PRODUCTOS con
   un contador de llaves y se evalua en un contexto vacio. Es
   codigo del propio repo, nunca entrada del visitante, y despues
   se valida la forma del resultado: si no es una lista de objetos
   con id, nombre y precio, el generador se corta sin escribir
   nada. La alternativa seria partir los datos a un
   datos/productos.json, pero entonces el catalogo tendria que
   hacer fetch y la pagina dejaria de abrir con doble clic en el
   archivo, que es como se esta revisando el sitio. */

const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');

/* ------------------------------------------------------------------
   Lo que hay que confirmar antes de publicar
   ------------------------------------------------------------------ */

const SITIO = 'https://zapi.uy';
const NOMBRE = 'ZAPI';
const MONEDA = 'UYU';

/* Stock real por id de producto.
   Se dejo vacio a proposito: no hay datos de inventario, y poner
   InStock sin saberlo seria publicar algo falso. Mientras un id no
   este en esta lista, el JSON-LD sale sin availability y el
   generador lo recuerda al final, para que se vea que falta. */
const STOCK = {
    /* 1: 'https://schema.org/InStock', */
};

/* ------------------------------------------------------------------
   Lectura de los datos
   ------------------------------------------------------------------ */

function extraerProductos() {
    const fuente = fs.readFileSync(path.join(raiz, 'public', 'js', 'productos.js'), 'utf8');
    const inicio = fuente.indexOf('const PRODUCTOS = [');

    if (inicio === -1) throw new Error('no se encontro "const PRODUCTOS = [" en productos.js');

    const desde = fuente.indexOf('[', inicio);
    let nivel = 0;
    let fin = -1;
    let enTexto = false;
    let comilla = '';

    for (let i = desde; i < fuente.length; i++) {
        const c = fuente[i];

        if (enTexto) {
            if (c === '\\') i++;
            else if (c === comilla) enTexto = false;
            continue;
        }

        if (c === '"' || c === "'" || c === '`') {
            enTexto = true;
            comilla = c;
        } else if (c === '[') nivel++;
        else if (c === ']') {
            nivel--;
            if (nivel === 0) { fin = i; break; }
        }
    }

    if (fin === -1) throw new Error('el arreglo PRODUCTOS no se cierra');

    const literal = fuente.slice(desde, fin + 1);
    const lista = new Function('"use strict"; return ' + literal)();

    return validar(lista);
}

function validar(lista) {
    if (!Array.isArray(lista) || !lista.length) {
        throw new Error('PRODUCTOS no es una lista con elementos');
    }

    const vistos = new Set();

    for (const p of lista) {
        for (const campo of ['id', 'nombre', 'categoria', 'descripcion', 'precioBase']) {
            if (p[campo] === undefined || p[campo] === '') {
                throw new Error('un producto no tiene "' + campo + '": ' + JSON.stringify(p));
            }
        }

        if (typeof p.precioBase !== 'number' || !isFinite(p.precioBase) || p.precioBase < 0) {
            throw new Error('precioBase invalido en "' + p.nombre + '": ' + p.precioBase);
        }

        if (!Array.isArray(p.imagenes) || !p.imagenes.length) {
            throw new Error('"' + p.nombre + '" no tiene imagenes');
        }

        if (vistos.has(slug(p.nombre))) throw new Error('dos productos share el mismo slug: ' + p.nombre);
        vistos.add(slug(p.nombre));
    }

    return lista;
}

/* ------------------------------------------------------------------
   Utilidades
   ------------------------------------------------------------------ */

function slug(texto) {
    return String(texto)
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function escapar(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function paraJsonLd(datos) {
    return JSON.stringify(datos, null, 2).replace(/</g, '\\u003c');
}

/* ------------------------------------------------------------------
   Plantilla
   ------------------------------------------------------------------ */

function pagina(producto, otros) {
    const s = slug(producto.nombre);
    const url = SITIO + '/productos/' + s + '.html';
    const principal = producto.imagenes[0];

    const descripcion = producto.descripcion +
        (producto.infoDeVenta.length ? ' ' + producto.infoDeVenta[0] : '');

    const disponibilidad = STOCK[producto.id];

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: producto.nombre,
        description: producto.descripcion,
        image: producto.imagenes.map(f => SITIO + '/' + f.replace(/^\.\//, '')),
        category: producto.categoria,
        sku: 'ZAPI-' + String(producto.id).padStart(3, '0'),
        brand: { '@type': 'Brand', name: NOMBRE },
        offers: {
            '@type': 'Offer',
            url,
            priceCurrency: MONEDA,
            price: String(producto.precioBase),
            availability: disponibilidad || undefined,
            itemCondition: 'https://schema.org/NewCondition',
            seller: { '@type': 'Organization', name: NOMBRE }
        }
    };

    const migas = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITIO + '/' },
            { '@type': 'ListItem', position: 2, name: 'Catalogo', item: SITIO + '/catalogo.html' },
            { '@type': 'ListItem', position: 3, name: producto.nombre, item: url }
        ]
    };

    return `<!DOCTYPE html>
<html lang="es-UY">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title>${escapar(producto.nombre)} | ${escapar(NOMBRE)}</title>
    <meta name="description" content="${escapar(descripcion)}">
    <link rel="canonical" href="${url}">

    <meta property="og:type" content="product">
    <meta property="og:site_name" content="${escapar(NOMBRE)}">
    <meta property="og:locale" content="es_UY">
    <meta property="og:title" content="${escapar(producto.nombre)} | ${escapar(NOMBRE)}">
    <meta property="og:description" content="${escapar(descripcion)}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${SITIO}/${principal.replace(/^\.\//, '')}">
    <meta property="product:price:amount" content="${producto.precioBase}">
    <meta property="product:price:currency" content="${MONEDA}">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapar(producto.nombre)} | ${escapar(NOMBRE)}">
    <meta name="twitter:description" content="${escapar(descripcion)}">
    <meta name="twitter:image" content="${SITIO}/${principal.replace(/^\.\//, '')}">

    <link rel="icon" type="image/svg+xml" href="../public/img/logo.svg">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <!-- Una sola peticion para la tipografia y los Material Symbols:
         antes eran dos <link> al mismo origen y la segunda
         bloqueaba el render. Montserrat no se pide porque en las
         fichas de producto no se usa. -->
    <link rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:opsz,wght@14..32,100..900&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap">

    <link rel="stylesheet" href="../public/css/styles.css">
    <link rel="stylesheet" href="../public/css/estilos-producto.css">

    <script type="application/ld+json">
${paraJsonLd(jsonLd)}
    </script>
    <script type="application/ld+json">
${paraJsonLd(migas)}
    </script>
</head>

<body class="pagina-producto">
    <a class="saltar-contenido" href="#contenido">Saltar al contenido</a>

    <header class="header-producto">
        <a class="logo" href="../index.html" aria-label="${escapar(NOMBRE)}, ir al inicio">
            <img src="../public/img/logo.svg" alt="" width="40" height="40">
            <span>${escapar(NOMBRE)}</span>
        </a>

        <form class="buscador-producto" action="../catalogo.html" role="search">
            <label class="visually-hidden" for="q">Buscar productos</label>
            <input type="search" id="q" name="q" placeholder="Buscar productos"
                autocomplete="off">
            <button type="submit">
                <span class="material-symbols-outlined" aria-hidden="true">search</span>
                <span class="visually-hidden">Buscar</span>
            </button>
        </form>

        <a class="carrito-enlace" href="../carrito.html">
            <span class="material-symbols-outlined" aria-hidden="true">shopping_cart</span>
            <span>Carrito</span>
        </a>
    </header>

    <main id="contenido">
        <nav class="migas" aria-label="Ruta de navegacion">
            <ol>
                <li><a href="../index.html">Inicio</a></li>
                <li><a href="../catalogo.html">Catalogo</a></li>
                <li aria-current="page">${escapar(producto.nombre)}</li>
            </ol>
        </nav>

        <article class="producto">
            <div class="producto-galeria">
                <img class="producto-principal" id="fotoPrincipal"
                    src="../${principal.replace(/^\.\//, '')}"
                    alt="${escapar(producto.nombre)}" width="798" height="1200">

                ${producto.imagenes.length > 1 ? `
                <ul class="producto-miniaturas" aria-label="Fotos de ${escapar(producto.nombre)}">
                    ${producto.imagenes.map((f, i) => `
                    <li>
                        <button type="button" class="producto-miniatura${i === 0 ? ' activa' : ''}"
                            data-src="../${f.replace(/^\.\//, '')}"
                            aria-label="Ver foto ${i + 1} de ${producto.imagenes.length}">
                            <img src="../${f.replace(/^\.\//, '')}" alt="" loading="lazy"
                                width="80" height="120">
                        </button>
                    </li>`).join('')}
                </ul>` : ''}
            </div>

            <div class="producto-datos">
                <p class="producto-categoria">${escapar(producto.categoria)}</p>
                <h1>${escapar(producto.nombre)}</h1>
                <p class="producto-precio" data-precio="${producto.precioBase}">
                    ${escapar(formatearPrecio(producto.precioBase))}
                </p>
                <p class="producto-descripcion">${escapar(producto.descripcion)}</p>

                <ul class="producto-info">
                    ${producto.infoDeVenta.map(item => `
                    <li>
                        <span class="material-symbols-outlined" aria-hidden="true">check_circle</span>
                        <span>${escapar(item)}</span>
                    </li>`).join('')}
                </ul>

                <div class="producto-acciones">
                    <button type="button" class="agregar" data-id="${producto.id}">
                        <span class="material-symbols-outlined" aria-hidden="true">add_shopping_cart</span>
                        Agregar al carrito
                    </button>
                    <a class="whatsapp"
                        href="https://wa.me/098268560?text=${encodeURIComponent('Hola ' + NOMBRE + ', quiero consultar por ' + producto.nombre)}"
                        target="_blank" rel="noopener">
                        Consultar por WhatsApp
                    </a>
                </div>

                <p class="producto-aviso" role="status" aria-live="polite"></p>
            </div>
        </article>

        <section class="producto-relacionados" aria-labelledby="titulo-relacionados">
            <h2 id="titulo-relacionados">Tambien te puede interesar</h2>
            <ul>
                ${otros.filter(o => o.id !== producto.id).slice(0, 3).map(o => `
                <li>
                    <a href="./${slug(o.nombre)}.html">
                        <img src="../${o.imagen.replace(/^\.\//, '')}" alt="" loading="lazy"
                            width="798" height="1200">
                        <span class="relacionado-nombre">${escapar(o.nombre)}</span>
                        <span class="relacionado-precio">${escapar(formatearPrecio(o.precioBase))}</span>
                    </a>
                </li>`).join('')}
            </ul>
        </section>
    </main>

    <footer class="footer-producto">
        <p>${escapar(NOMBRE)}</p>
        <nav aria-label="Enlaces del pie">
            <a href="../index.html">Inicio</a>
            <a href="../catalogo.html">Catalogo</a>
            <a href="../carrito.html">Carrito</a>
        </nav>
    </footer>

    <script src="../public/js/productos.js" defer></script>
    <script src="../public/js/productos-pagina.js" defer></script>
</body>
</html>
`;
}

/* Mismo formato que formatearPrecio, en productos.js, para que la
   pagina muestre el precio igual que el catalogo sin depender del
   script para eso. */
function formatearPrecio(valor) {
    return new Intl.NumberFormat('es-UY', {
        style: 'currency',
        currency: MONEDA,
        maximumFractionDigits: 0
    }).format(valor);
}

/* ------------------------------------------------------------------
   Poda de fichas que ya no estan en el catalogo
   ------------------------------------------------------------------ */

/* Si un producto se renombra o se saca, su ficha vieja se queda en
   productos/, y como generar-sitemap.js lee esa carpeta con
   readdirSync, la ficha entra al sitemap y queda publicada con el
   precio y el texto viejos. Es exactamente la clase de error que este
   proyecto no se permite.

   Igual no se borra a ciegas. Solo se borra lo que se puede demostrar
   que salio de este generador: un canonical que apunta a la URL
   publica de esa misma ficha mas el JSON-LD de Product. Una pagina
   escrita a mano no tiene las dos cosas, asi que queda intacta y se
   avisa, por si hay que mirarla a ojo.

   Con --sin-poda no se borra nada. */
function esGenerada(archivo) {
    let texto;
    try {
        texto = fs.readFileSync(archivo, 'utf8');
    } catch {
        return false;
    }

    /* El canonical se compara con el nombre del archivo, no con la
       ruta: lo que se escribio en la pagina es
       SITIO/productos/<archivo.html>, sin la carpeta. */
    const nombreArchivo = path.basename(archivo);

    const canonical = new RegExp('<link\\s+rel="canonical"\\s+href="' +
        SITIO.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\/productos\\/' +
        nombreArchivo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"');

    const okCanon = canonical.test(texto);
    const okProducto = /"@type"\s*:\s*"Product"/.test(texto);
    return okCanon && okProducto;
}

function podar(esperados) {
    const sinPoda = process.argv.includes('--sin-poda');
    const existentes = fs.existsSync(destino)
        ? fs.readdirSync(destino).filter(f => f.endsWith('.html'))
        : [];

    const borrados = [];
    const ajenos = [];

    for (const ficha of existentes) {
        const nombre = ficha.replace(/\.html$/, '');

        if (esperados.has(nombre)) continue;

        const completa = path.join(destino, ficha);

        if (!esGenerada(completa)) {
            ajenos.push(ficha);
            continue;
        }

        if (!sinPoda) fs.unlinkSync(completa);
        borrados.push(ficha);
    }

    return { borrados, ajenos, sinPoda };
}

/* ------------------------------------------------------------------
   Escritura
   ------------------------------------------------------------------ */

const productos = extraerProductos();
const destino = path.join(raiz, 'productos');

if (!fs.existsSync(destino)) fs.mkdirSync(destino, { recursive: true });

const sinStock = [];
const escritas = [];

for (const producto of productos) {
    const s = slug(producto.nombre);
    const archivo = path.join(destino, s + '.html');
    const contenido = pagina(producto, productos);

    /* Se escribe solo si el contenido cambio. Regenerar paginas que ya
       estan bien deja git con las 7 fichas marcadas como modificadas
       aunque no haya cambiado un byte, y a la semana ya nadie sabe si
       ese cambio es real. Aparte se evita el trabajo de reescribir. */
    let anterior = null;
    try {
        anterior = fs.readFileSync(archivo, 'utf8');
    } catch {
        /* No existe todavia: es la primera vez que sale. */
    }

    const cambio = anterior !== contenido;
    if (cambio) {
        fs.writeFileSync(archivo, contenido, 'utf8');
        escritas.push(s);
    }

    const estado = STOCK[producto.id]
        ? 'stock: ' + STOCK[producto.id].split('/').pop()
        : 'sin availability (falta stock)';

    if (!STOCK[producto.id]) sinStock.push(producto.nombre);

    console.log('  productos/' + s + '.html  (' + estado + (cambio ? '' : ', sin cambios') + ')');
}

/* La poda va despues de escribir: si el catalogo esta roto, el script
   ya tiró antes de llegar aca y no se borra nada. */
const poda = podar(new Set(productos.map(p => slug(p.nombre))));

/* Se cuenta lo que se escribio de verdad, no la cantidad del catalogo:
   si nada cambio, decirlo asi y no "7 paginas escritas". */
console.log('\n' + productos.length + ' fichas al dia, ' + escritas.length + ' cambiadas' +
    (escritas.length ? ': ' + escritas.join(', ') : ''));

if (poda.borrados.length) {
    console.log('\n' + (poda.sinPoda ? 'Poda suspendida (--sin-poda). Quedaron sin borrar:' : 'Fichas borradas (ya no estan en el catalogo):'));

    for (const ficha of poda.borrados) {
        console.log('  productos/' + ficha);
    }
}

if (poda.ajenos.length) {
    console.log('\nArchivos .html en productos/ que no son de este generador, sin tocar:');

    for (const ficha of poda.ajenos) {
        console.log('  productos/' + ficha + '  (no tiene canonical ni JSON-LD de Product: no se borro)');
    }
}

if (sinStock.length) {
    console.log('\nFalta el stock real de: ' + sinStock.join(', '));
    console.log('Las paginas se publicaron sin "availability" en el JSON-LD.');
    console.log('Cargar el valor en STOCK, arriba en este archivo, y correr de nuevo.');
}

console.log('\nRevisar SITIO: ahora apunta a ' + SITIO + '. Si el dominio final es otro,');
console.log('cambiar esa constante y volver a correr el generador: el canonical, el');
console.log('JSON-LD y las URLs del sitemap salen de ahi.');
