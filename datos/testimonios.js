'use strict';
/* ==========================================================
   TESTIMONIOS: FUENTE DE AUTORIA
   ------------------------------------------------------------
   Este es el lugar donde se editan las opiniones de la home. Un
   texto nuevo, una nota que cambia o una opinion que se saca se
   hacen aca y en ningun otro lado.

   De este archivo sale public/data/testimonios.json, que puede
   usarse para iniciar la base del backend. La lista se mantiene
   vacia hasta tener opiniones verificadas y autorizadas.

   Solo agregar opiniones verificadas y autorizadas para publicacion.
   Mientras no haya opiniones reales, la lista queda vacia.

   El campo fecha se escribe como YYYY-MM-DD (sin hora): es la
   unica forma que queda clara leyendo la pagina como texto. El
   generador y el backend la convierten.

   La nota (estrellas) va de 0 a 5 y admite medios puntos: el
   carrusel dibuja media estrella con la nota con decimal.

   El campo producto_id es opcional: cuando la opinion es sobre un
   producto del catalogo, se pone su id (el mismo numero que usa
   datos/catalogo.js) y el carrusel muestra la etiqueta "Sobre:
   <nombre>" para abrir la ficha. Si la opinion es sobre un
   servicio, o no hay un producto claro, se deja afuera y no se
   dibuja ninguna etiqueta. El generador comprueba que el id
   exista en el catalogo, asi que un numero mal escrito no llega
   al JSON.
   ========================================================== */

const TESTIMONIOS = [];

module.exports = { TESTIMONIOS };