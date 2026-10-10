'use strict';
/* ==========================================================
   CATALOGO DE PRODUCTOS: FUENTE DE AUTORIA
   ------------------------------------------------------------
   Este es el lugar donde se edita el catalogo. Un cambio de
   precio, de nombre o de foto se hace aca y en ningun otro lado.
   Si tocás un precio, tocá un solo lugar: acá.

   De este archivo salen, con npm run generar:

     - public/data/productos.json, que es lo que baja el navegador
       con fetch;
     - las fichas de productos/*.html;
     - sitemap.xml, a traves de las fichas.

   Por que vive aca y no en public/js/
   ---------------------------------------
   Antes el array estaba en public/js/productos.js, que el navegador
   cargaba como un script comun. El problema era leerlo sin require
   -productos.js usa window y document-: habia que arrancar el array
   a mano con un contador de llaves y evaluarlo con Function(). Ese
   emparejar() era fragil: un cambio de espaciado, unas comillas
   simples o un corchete dentro de un comentario partian el
   catalogo.

   Ahora el catalogo viaja en JSON y el navegador lo pide por HTTP,
   que es la unica forma en que anda el sitio.

   Que quede claro el reparto: este archivo NO lo carga el
   navegador. Solo lo leen los generadores de tools/. Por eso puede
   usar module.exports y comentarios con toda la libertad: el
   navegador nunca lo ve.

   Por que es .js y no .json: un .json no admite comentarios, y los
   precios de este vivero se explican con texto. Con JSON puro esas
   notas se pierden.
   ========================================================== */

const PRODUCTOS = [
    {
        id: 1,
        nombre: "Albahaca",
        categoria: "Aromáticas",
        imagen: "./public/img/albahaca.opt.jpg",
        imagenes: [
            "./public/img/albahaca.opt.jpg"
        ],
        descripcion: "Fresca y perfumada, ideal para huertas en macetas.",
        precioBase: 150,
        infoDeVenta: [
            "Mata de 20 cm lista para plantar",
            "Rinde + de 8 semanas de cosecha continua",
            "Incluye guía de cuidados digital"
        ]
    },
    {
        id: 2,
        nombre: "Ruda",
        categoria: "Hortalizas",
        imagen: "./public/img/ruda.opt.jpg",
        imagenes: [
            "./public/img/ruda.opt.jpg"
        ],
        descripcion: "Tierna y picante, lista para tus ensaladas.",
        precioBase: 120,
        infoDeVenta: [
            "Resiembra: hasta 4 cortes por planta",
            "Cultivo 100% agroecológico",
            "Incluye guía de cuidados digital"
        ]
    },
    {
        id: 3,
        nombre: "Suculenta",
        categoria: "Plantas de interior",
        imagen: "./public/img/suculenta1.opt.jpg",
        imagenes: [
            "./public/img/suculenta1.opt.jpg",
            "./public/img/suculenta4.2.opt.jpg",
            "./public/img/suculenta4.1.opt.jpg",
            "./public/img/suculenta4.opt.jpg",
            "./public/img/suculenta3.2.opt.jpg",
            "./public/img/suculenta3.1.opt.jpg",
            "./public/img/suculenta3.opt.jpg",
            "./public/img/suculenta2.opt.jpg",
            "./public/img/suculentas2.1.opt.jpg"
        ],
        descripcion: "Resistente, ideal para interiores luminosos.",
        precioBase: 180,
        infoDeVenta: [
            "Viene en maceta cerámica",
            "Riego: 1 vez cada 15 días",
            "Ideal para principiantes"
        ]
    },
    {
        id: 4,
        nombre: "Cactus",
        categoria: "Plantas de interior",
        imagen: "./public/img/cactus1.opt.jpg",
        imagenes: [
            "./public/img/cactus1.opt.jpg",
            "./public/img/cactus4.opt.jpg",
            "./public/img/cactus5.opt.jpg",
            "./public/img/cactus3.opt.jpg",
            "./public/img/cactus2.opt.jpg"
        ],
        descripcion: "Decorativo y de fácil mantenimiento.",
        precioBase: 220,
        infoDeVenta: [
            "Viene en maceta cerámica",
            "Soporta largos períodos sin riego",
            "Purifica el aire de tu hogar"
        ]
    },
    {
        id: 5,
        nombre: "Suculentas mix",
        categoria: "Combo",
        imagen: "./public/img/almacigosuculentas.opt.jpg",
        imagenes: [
            "./public/img/almacigosuculentas.opt.jpg",
            "./public/img/almacigosuculentas2.opt.jpg"
        ],
        descripcion: "Una selección de suculentas para tu hogar.",
        precioBase: 90,
        infoDeVenta: [
            "Pack de 6 variedades surtidas",
            "30% más económico que por unidad",
            "Incluye caja de regalo"
        ]
    },
    {
        id: 6,
        nombre: "Cretona",
        categoria: "Plantas de interior",
        imagen: "./public/img/cretona.opt.jpg",
        imagenes: [
            "./public/img/cretona.opt.jpg"
        ],
        descripcion: "Hojas coloridas para espacios con luz indirecta.",
        precioBase: 320,
        infoDeVenta: [
            "Viene en maceta decorativa",
            "Hojas rojas, crema y verde",
            "Incluye guía de cuidados digital"
        ]
    },
    {
        id: 7,
        nombre: "Kit de huerta sustentable",
        categoria: "Kits",
        imagen: "./public/img/kit_de_huerta_zapi.opt.jpg",
        imagenes: [
            "./public/img/kit_de_huerta_zapi.opt.jpg",
            "./public/img/kit_de_huerta_zapi_2.opt.jpg",
            "./public/img/kit_de_huerta_zapi3.opt.jpg",
            "./public/img/kit_de_huerta_zapi4.opt.jpg",
            "./public/img/kit_de_huerta_zapi5.opt.jpg"
        ],
        descripcion: "Semillas, sustrato y guía para tu primera huerta.",
        precioBase: 650,
        infoDeVenta: [
            "Semillas, sustrato y macetas para empezar",
            "Guía de cultivo paso a paso",
            "Embalaje reciclable, sin plástico de un solo uso"
        ]
    }
];

module.exports = { PRODUCTOS };
