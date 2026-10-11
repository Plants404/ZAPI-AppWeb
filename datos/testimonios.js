'use strict';
/* ==========================================================
   TESTIMONIOS: FUENTE DE AUTORIA
   ------------------------------------------------------------
   Este es el lugar donde se editan las opiniones de la home. Un
   texto nuevo, una nota que cambia o una opinion que se saca se
   hacen aca y en ningun otro lado.

   De este archivo sale, con npm run generar:testimonios:

     - public/data/testimonios.json, que es lo que baja el
       carrusel de la home cuando la API no esta (o como respaldo
       si decide caerse).

   La API GET /api/testimonios se siembra del JSON, y el JSON sale
   de aca: una sola copia de cada opinion, imposible que el
   carrusel, el respaldo estatico y la base disputen entre si.

   Por que vive aca y los textos parecen de ejemplo
   ---------------------------------------------------
   OJO: lo que hay abajo son opiniones de ejemplo para ver como
   queda la seccion, NO opiniones de clientes reales. No se pueden
   publicar como si lo fueran: cuando entren las de verdad, se
   reemplazan estas por las nuevas y el resto no se toca.

   El campo fecha se escribe como YYYY-MM-DD (sin hora): es la
   unica forma que queda clara leyendo la pagina como texto. El
   generador y el backend la convierten.

   La nota (estrellas) va de 0 a 5 y admite medios puntos: el
   carrusel dibuja media estrella con la nota con decimal.
   ========================================================== */

const TESTIMONIOS = [
    {
        autor: "María Gómez",
        lugar: "Montevideo",
        texto: "Compré dos aromáticas para la cocina y llegaron sanas y con la guía de cuidados. A las dos semanas ya las estaba usando para las comidas.",
        estrellas: 5,
        fecha: "2026-08-14"
    },
    {
        autor: "Diego Fernández",
        lugar: "Ciudad de la Costa",
        texto: "Nos hicieron el diseño de la huerta del colegio. El equipo entendió lo que necesitan los chicos y nos dejaron claro cómo seguir con el mantenimiento.",
        estrellas: 5,
        fecha: "2026-07-02"
    },
    {
        autor: "Lucía Sánchez",
        lugar: "Punta del Este",
        texto: "Me tasteó y por eso sigo comprando. Los precios del catálogo son fijos hasta que se avisa, y siempre avisan antes de cambiar algo.",
        estrellas: 4,
        fecha: "2026-06-21"
    },
    {
        autor: "Andrés Pérez",
        lugar: "Salto",
        texto: "Encargamos el mantenimiento de un patio chico. Es un trabajo prolijo, ordenado y se nota el cambio en el estado de las plantas.",
        estrellas: 4.5,
        fecha: "2026-05-30"
    },
    {
        autor: "Familia Bentancor",
        lugar: "Canelones",
        texto: "Pedimos la huerta familiar completa y nos explican cada paso. Después de un mes ya estábamos comiendo de lo que sembramos.",
        estrellas: 5,
        fecha: "2026-05-11"
    }
];

module.exports = { TESTIMONIOS };