'use strict';

/* Catalogo en memoria para las paginas. Los bloques de datos se generan
   desde datos/catalogo.js con tools/generar-productos.js; las funciones
   de tarjeta viven aca para que inicio, catalogo y carrito dibujen siempre
   la misma pieza. El stock es la fuente publicada y nunca se descuenta
   desde el navegador. */

// INICIO_PRODUCTOS
const PRODUCTOS = [
    {
        "id": 1,
        "nombre": "Albahaca",
        "slug": "albahaca",
        "categoria": "Aromáticas",
        "imagen": "public/img/albahaca.opt.jpg",
        "imagenes": [
            "public/img/albahaca.opt.jpg"
        ],
        "descripcion": "Fresca y perfumada, ideal para huertas en macetas.",
        "precioBase": 150,
        "stock": 12,
        "destacado": true,
        "infoDeVenta": [
            "Mata de 20 cm lista para plantar",
            "Rinde más de 8 semanas de cosecha continua",
            "Incluye guía de cuidados digital"
        ]
    },
    {
        "id": 2,
        "nombre": "Ruda",
        "slug": "ruda",
        "categoria": "Plantas",
        "imagen": "public/img/ruda.opt.jpg",
        "imagenes": [
            "public/img/ruda.opt.jpg"
        ],
        "descripcion": "Planta de ruda para cultivo. Consultá sus cuidados y usos antes de consumirla.",
        "precioBase": 120,
        "stock": 8,
        "destacado": false,
        "infoDeVenta": [
            "Resiembra: hasta 4 cortes por planta",
            "Cultivo 100% agroecológico",
            "Incluye guía de cuidados digital"
        ]
    },
    {
        "id": 3,
        "nombre": "Suculenta",
        "slug": "suculenta",
        "categoria": "Plantas de interior",
        "imagen": "public/img/suculenta1.opt.jpg",
        "imagenes": [
            "public/img/suculenta1.opt.jpg",
            "public/img/suculenta4.2.opt.jpg",
            "public/img/suculenta4.1.opt.jpg",
            "public/img/suculenta4.opt.jpg",
            "public/img/suculenta3.2.opt.jpg",
            "public/img/suculenta3.1.opt.jpg",
            "public/img/suculenta3.opt.jpg",
            "public/img/suculenta2.opt.jpg",
            "public/img/suculentas2.1.opt.jpg"
        ],
        "descripcion": "Resistente, ideal para interiores luminosos.",
        "precioBase": 180,
        "stock": 15,
        "destacado": true,
        "infoDeVenta": [
            "Viene en maceta cerámica",
            "Riego: 1 vez cada 15 días",
            "Ideal para principiantes"
        ]
    },
    {
        "id": 4,
        "nombre": "Cactus",
        "slug": "cactus",
        "categoria": "Plantas de interior",
        "imagen": "public/img/cactus1.opt.jpg",
        "imagenes": [
            "public/img/cactus1.opt.jpg",
            "public/img/cactus4.opt.jpg",
            "public/img/cactus5.opt.jpg",
            "public/img/cactus3.opt.jpg",
            "public/img/cactus2.opt.jpg"
        ],
        "descripcion": "Decorativo y de fácil mantenimiento.",
        "precioBase": 220,
        "stock": 6,
        "destacado": true,
        "infoDeVenta": [
            "Viene en maceta cerámica",
            "Soporta largos períodos sin riego",
            "Purifica el aire de tu hogar"
        ]
    },
    {
        "id": 5,
        "nombre": "Suculentas mix",
        "slug": "suculentas-mix",
        "categoria": "Combo",
        "imagen": "public/img/almacigosuculentas.opt.jpg",
        "imagenes": [
            "public/img/almacigosuculentas.opt.jpg",
            "public/img/almacigosuculentas2.opt.jpg"
        ],
        "descripcion": "Una selección de suculentas para tu hogar.",
        "precioBase": 90,
        "stock": 10,
        "destacado": false,
        "infoDeVenta": [
            "Pack de 6 variedades surtidas",
            "30% más económico que por unidad",
            "Incluye caja de regalo"
        ]
    },
    {
        "id": 6,
        "nombre": "Cretona",
        "slug": "cretona",
        "categoria": "Plantas de interior",
        "imagen": "public/img/cretona.opt.jpg",
        "imagenes": [
            "public/img/cretona.opt.jpg"
        ],
        "descripcion": "Hojas coloridas para espacios con luz indirecta.",
        "precioBase": 320,
        "stock": 4,
        "destacado": false,
        "infoDeVenta": [
            "Viene en maceta decorativa",
            "Hojas rojas, crema y verde",
            "Incluye guía de cuidados digital"
        ]
    },
    {
        "id": 7,
        "nombre": "Kit de huerta sustentable",
        "slug": "kit-de-huerta-sustentable",
        "categoria": "Kits",
        "imagen": "public/img/kit_de_huerta_zapi.opt.jpg",
        "imagenes": [
            "public/img/kit_de_huerta_zapi.opt.jpg",
            "public/img/kit_de_huerta_zapi_2.opt.jpg",
            "public/img/kit_de_huerta_zapi3.opt.jpg",
            "public/img/kit_de_huerta_zapi4.opt.jpg",
            "public/img/kit_de_huerta_zapi5.opt.jpg"
        ],
        "descripcion": "Semillas, sustrato y guía para tu primera huerta.",
        "precioBase": 650,
        "stock": 5,
        "destacado": true,
        "infoDeVenta": [
            "Semillas, sustrato y macetas para empezar",
            "Guía de cultivo paso a paso",
            "Embalaje reciclable, sin plástico de un solo uso"
        ]
    }
];
// FIN_PRODUCTOS

// INICIO_CATEGORIAS
const CATEGORIAS = [
    "Aromáticas",
    "Plantas",
    "Plantas de interior",
    "Combo",
    "Kits"
];
// FIN_CATEGORIAS

function fotosDeProducto(producto) {
    if (!producto) return [];

    const imagenes = Array.isArray(producto.imagenes) && producto.imagenes.length
        ? producto.imagenes
        : [producto.imagen].filter(Boolean);

    return imagenes.filter(Boolean);
}

function obtenerProducto(id) {
    if (id && typeof id === "object") return id;

    const buscado = Number(id);

    if (!Number.isFinite(buscado)) return null;

    return PRODUCTOS.find(producto => Number(producto.id) === buscado) || null;
}

function unidadesDe(id) {
    const producto = obtenerProducto(id);

    if (!producto) return 0;

    const stock = Number(producto.stock);

    return Number.isFinite(stock) && stock > 0 ? Math.floor(stock) : 0;
}

function rutaFicha(producto, raiz) {
    if (!producto || !producto.slug) return rutaConRaiz("catalogo.html");

    const base = raiz === undefined ? raizDelSitio() : raiz;

    return base + "/producto-" + encodeURIComponent(producto.slug) + ".html";
}

function htmlTarjetaProducto(producto, raiz) {
    const unidades = unidadesDe(producto);
    const agotado = unidades === 0;
    const imagenes = fotosDeProducto(producto);
    const ficha = rutaFicha(producto, raiz);
    const boton = agotado
        ? '<span class="material-symbols-outlined" aria-hidden="true">block</span> <span>Sin stock</span>'
        : '<span class="material-symbols-outlined" aria-hidden="true">add_shopping_cart</span> <span>Agregar</span>';

    return `
        <article class="tarjeta-producto${agotado ? " tarjeta-agotada" : ""}">
            <a class="tarjeta-imagen" href="${escaparHTML(ficha)}" data-abrir-producto="${escaparHTML(producto.id)}" aria-label="Ver ${escaparHTML(producto.nombre)}">
                <img src="${rutaConRaiz(escaparHTML(imagenes[0] || ""))}" alt="${escaparHTML(producto.nombre)}" loading="lazy" width="798" height="1200">
                <span class="stock ${claseDeStock(unidades)}">${escaparHTML(textoDeStock(unidades))}</span>
            </a>
            <div class="tarjeta-cuerpo">
                <span class="etiqueta">${escaparHTML(producto.categoria)}</span>
                <h3><a href="${escaparHTML(ficha)}" data-abrir-producto="${escaparHTML(producto.id)}">${escaparHTML(producto.nombre)}</a></h3>
                <p>${escaparHTML(producto.descripcion)}</p>
                <div class="tarjeta-pie">
                    <strong>${formatearPrecio(producto.precioBase)}</strong>
                    <button class="boton-agregar" type="button" data-agregar-producto="${escaparHTML(producto.id)}"${agotado ? " disabled" : ""}>
                        ${boton}
                    </button>
                </div>
            </div>
        </article>`;
}
