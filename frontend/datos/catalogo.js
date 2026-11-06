'use strict';
/* Semilla del catálogo. El sitio público y el panel leen el catálogo desde
   la API; este archivo solo se usa para sembrar la base con
   `npm run seed:catalogo`. Después de sembrar, los productos se editan
   desde el panel de administración. */

const PRODUCTOS = [
    {
        id: 1,
        nombre: "Albahaca",
        categoria: "Aromáticas",
        imagen: "public/img/albahaca.opt.jpg",
        imagenes: [
            "public/img/albahaca.opt.jpg"
        ],
        descripcion: "Fresca y perfumada, ideal para huertas en macetas.",
        precioBase: 150,
        costo: 60,
        stock: 12,
        infoDeVenta: [
            "Mata de 20 cm lista para plantar",
            "Rinde más de 8 semanas de cosecha continua",
            "Incluye guía de cuidados digital"
        ]
    },
    {
        id: 2,
        nombre: "Ruda",
        categoria: "Plantas",
        imagen: "public/img/ruda.opt.jpg",
        imagenes: [
            "public/img/ruda.opt.jpg"
        ],
        descripcion: "Planta de ruda para cultivo. Consultá sus cuidados y usos antes de consumirla.",
        precioBase: 120,
        costo: 45,
        stock: 8,
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
        imagen: "public/img/suculenta1.opt.jpg",
        imagenes: [
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
        descripcion: "Resistente, ideal para interiores luminosos.",
        precioBase: 180,
        costo: 90,
        stock: 15,
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
        imagen: "public/img/cactus1.opt.jpg",
        imagenes: [
            "public/img/cactus1.opt.jpg",
            "public/img/cactus4.opt.jpg",
            "public/img/cactus5.opt.jpg",
            "public/img/cactus3.opt.jpg",
            "public/img/cactus2.opt.jpg"
        ],
        descripcion: "Decorativo y de fácil mantenimiento.",
        precioBase: 220,
        costo: 110,
        stock: 6,
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
        imagen: "public/img/almacigosuculentas.opt.jpg",
        imagenes: [
            "public/img/almacigosuculentas.opt.jpg",
            "public/img/almacigosuculentas2.opt.jpg"
        ],
        descripcion: "Una selección de suculentas para tu hogar.",
        precioBase: 90,
        costo: 40,
        stock: 10,
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
        imagen: "public/img/cretona.opt.jpg",
        imagenes: [
            "public/img/cretona.opt.jpg"
        ],
        descripcion: "Hojas coloridas para espacios con luz indirecta.",
        precioBase: 320,
        costo: 160,
        stock: 4,
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
        imagen: "public/img/kit_de_huerta_zapi.opt.jpg",
        imagenes: [
            "public/img/kit_de_huerta_zapi.opt.jpg",
            "public/img/kit_de_huerta_zapi_2.opt.jpg",
            "public/img/kit_de_huerta_zapi3.opt.jpg",
            "public/img/kit_de_huerta_zapi4.opt.jpg",
            "public/img/kit_de_huerta_zapi5.opt.jpg"
        ],
        descripcion: "Semillas, sustrato y guía para tu primera huerta.",
        precioBase: 650,
        costo: 320,
        stock: 5,
        infoDeVenta: [
            "Semillas, sustrato y macetas para empezar",
            "Guía de cultivo paso a paso",
            "Embalaje reciclable, sin plástico de un solo uso"
        ]
    }
];

module.exports = { PRODUCTOS };
