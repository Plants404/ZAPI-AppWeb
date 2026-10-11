'use strict';
/* ==========================================================
   CONTROLADOR: PEDIDOS
   ------------------------------------------------------------
   POST /api/pedidos { nombre, telefono, email?, zona?, notas? }

   El pedido se arma del CARRITO DE LA SESION, nunca del cuerpo:
   las lineas que llegan en la peticion se ignoran. Sin nombre y
   telefono no hay forma de coordinar el envio; el telefono se
   cuenta por digitos porque en Uruguay se escribe con + y
   guiones.

   El total lo calcula el servicio con el precio de la base, no
   con lo que mando el navegador: esa es la unica defensa contra
   que alguien manipule el total.
   ========================================================== */

const { limpiarTexto, soloDigitos } = require('../utils/texto');
const { LARGO, MINIMOS } = require('../constants');
const carrito = require('../services/carrito.service');
const { nuevoPedido } = require('../services/pedidos.service');

async function crear(req, res, next) {
    try {
        const nombre = limpiarTexto(req.body && req.body.nombre, LARGO.nombre);
        const telefono = limpiarTexto(req.body && req.body.telefono, LARGO.telefono);

        if (nombre.length < MINIMOS.nombre) {
            return res.status(400).json({ error: 'Escribí tu nombre', campo: 'nombre' });
        }

        if (soloDigitos(telefono).length < MINIMOS.telefonoDigitos) {
            return res.status(400).json({ error: 'Falta un teléfono de contacto', campo: 'telefono' });
        }

        const armado = await carrito.armar(req.sesion);

        if (armado.items.length === 0) {
            return res.status(400).json({ error: 'El carrito está vacío' });
        }

        const lineas = armado.items.map(item => ({
            producto_id: item.id,
            nombre: item.nombre,
            precio: item.precio,
            cantidad: item.cantidad,
        }));

        const resultado = await nuevoPedido({
            sesion: req.sesion,
            nombre,
            telefono,
            email: limpiarTexto(req.body && req.body.email, LARGO.correo) || null,
            zona: limpiarTexto(req.body && req.body.zona, LARGO.zona) || null,
            notas: limpiarTexto(req.body && req.body.notas, LARGO.notas) || null,
            lineas,
        });

        if (resultado.tipo === 'shortage') {
            /* 409, no 500: es falta de stock real, no un error de
               servidor. Se mandan las unidades reales para que el
               cliente baje la cantidad y pueda seguir. */
            const shortages = resultado.problemas.filter(
                problema => problema.disponibles === null || problema.disponibles < problema.pedido
            );

            return res.status(409).json({ error: 'No hay stock suficiente', shortages });
        }

        /* Recien aca se vacia: si el pedido no se cerro, el
           carrito sigue igual y el cliente puede corregirlo. */
        await carrito.vaciar(req.sesion);

        res.status(201).json({ ok: true, id: resultado.id, total: resultado.total });
    } catch (error) {
        next(error);
    }
}

module.exports = { crear };