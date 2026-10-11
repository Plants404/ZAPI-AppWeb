'use strict';
/* ==========================================================
   SERVICIO: PEDIDOS
   ------------------------------------------------------------
   Cierre del pedido: descuenta stock y guarda el pedido. La
   garantia de "o todo o nada" se consigue en dos partes:

   1. Cada descuento es un findOneAndUpdate con condicion de
      unidades disponibles: Mongo lo ejecuta atomico sobre ese
      documento, asi que dos pedidos simultaneos no pueden
      vender el mismo paquete.
   2. Si una linea falla (o el guardado del pedido falla), se
      devuelve el stock ya descontado. Ese rollback a mano se
      llama compensacion, y es la alternativa a las transacciones
      de Mongo, que exigen un replica set que un standalone no
      tiene.

   El stock en null es "sin datos cargados": no se puede vender,
   igual que en el backend anterior. Se corta con 409 y las
   unidades reales, para que el cliente baje la cantidad y pueda
   seguir.
   ========================================================== */

const crypto = require('crypto');

const { Pedido } = require('../models/pedido.model');
const { Stock } = require('../models/stock.model');
const { Producto } = require('../models/producto.model');
const { cantidadSegura, idNumerico } = require('../utils/numero');
const { LIMITE_CANTIDAD } = require('../constants');

function redondear(numero) {
    return Math.round(numero * 100) / 100;
}

/* Z-20261011-AB12CD: fecha legible y tres bytes aleatorios. Los
   sufijos no se reutilizan ni se predecen, que es lo que pide la
   API para que nadie invente un pedido. */
function generarId() {
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    return `Z-${fecha}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

/* Devuelve a las filas de stock lo que ya se habia restado. Solo
   puede fallar a medias en una catastrofe: si algo tira aca, el
   stock queda bajo pero nunca hay un pedido por mas unidades de
   las contadas. */
async function compensar(descontados) {
    for (const d of descontados) {
        await Stock.updateOne({ producto_id: d.producto_id }, { $inc: { unidades: d.cantidad } });
    }
}

async function problemasDe(lineas) {
    const stock = await Stock.find({
        producto_id: { $in: lineas.map(l => l.producto_id) },
    }).lean();

    const porId = new Map(stock.map(s => [s.producto_id, s.unidades]));

    return lineas.map(linea => ({
        id: linea.producto_id,
        nombre: linea.nombre,
        pedido: linea.cantidad,
        disponibles: porId.has(linea.producto_id)
            ? porId.get(linea.producto_id)
            : null,
    }));
}

/* datos: { sesion, nombre, telefono, email, zona, notas,
   lineas: [{ producto_id, nombre, precio, cantidad }] }
   Las lineas ya vienen con el precio del catalogo ARMADO por el
   controlador (del servicio de carrito o del cuerpo, pero siempre
   con nombre y precio releidos de la base); aca no se vuelve a
   confiar en el navegador. Devuelve { tipo: 'ok', id, total } o
   { tipo: 'shortage', problemas }. */
async function nuevoPedido(datos) {
    const id = generarId();
    const creado = new Date();
    const descontados = [];
    const lineas = datos.lineas.map(linea => ({
        producto_id: linea.producto_id,
        nombre: linea.nombre,
        precio: linea.precio,
        cantidad: linea.cantidad,
    }));

    for (const linea of lineas) {
        const resultado = await Stock.findOneAndUpdate(
            { producto_id: linea.producto_id, unidades: { $gte: linea.cantidad } },
            { $inc: { unidades: -linea.cantidad }, $set: { actualizado: new Date() } },
            { new: true }
        );

        if (!resultado) {
            await compensar(descontados);

            return { tipo: 'shortage', problemas: await problemasDe(lineas) };
        }

        descontados.push({ producto_id: linea.producto_id, cantidad: linea.cantidad });
    }

    const total = redondear(lineas.reduce((suma, linea) => suma + linea.precio * linea.cantidad, 0));

    /* Si el pedido no se llega a guardar, el stock descontado se
       devuelve: un pedido sin fila madre no puede cobrarse. */
    try {
        await Pedido.create({
            id,
            sesion: datos.sesion,
            nombre: datos.nombre,
            telefono: datos.telefono,
            email: datos.email || null,
            zona: datos.zona || null,
            notas: datos.notas || null,
            total,
            estado: 'pendiente',
            creado,
            items: lineas,
        });
    } catch (error) {
        await compensar(descontados);
        throw error;
    }

    return { tipo: 'ok', id, total, creado };
}

/* El front arma el pedido con su carrito de localStorage y lo
   manda en el cuerpo como [{ id, cantidad }]. Aca se valida el
   formato, se suman las cantidades repetidas (con tope, como en
   el carrito), se relee nombre y precio del catalogo y se
   descarta que el cliente mande un precio. Devuelve:
     { tipo: 'ok', lineas }      listo para cobrar/descontar
     { tipo: 'formato' }         items mal formados
     { tipo: 'inexistente' }     algun producto no esta en el catalogo
     { tipo: 'vacio' }           no trajo ninguna linea util */
async function lineasDesdeBruto(items) {
    if (!Array.isArray(items) || items.length === 0) {
        return { tipo: 'formato' };
    }

    const cantidades = new Map();

    for (const bruto of items) {
        if (!bruto || typeof bruto !== 'object') return { tipo: 'formato' };

        const id = idNumerico(bruto.id);
        const cantidad = cantidadSegura(bruto.cantidad);

        if (id === null || cantidad === null) return { tipo: 'formato' };

        cantidades.set(id, Math.min(LIMITE_CANTIDAD, (cantidades.get(id) || 0) + cantidad));
    }

    if (cantidades.size === 0) return { tipo: 'vacio' };

    const ids = [...cantidades.keys()];

    const productos = await Producto.find({ _id: { $in: ids }, activo: true }).lean();
    const porId = new Map(productos.map(p => [p._id, p]));

    if (porId.size !== ids.length) return { tipo: 'inexistente' };

    const lineas = [...cantidades.entries()].map(([id, cantidad]) => {
        const producto = porId.get(id);

        return {
            producto_id: producto._id,
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad,
        };
    });

    return { tipo: 'ok', lineas };
}

module.exports = { nuevoPedido, lineasDesdeBruto };