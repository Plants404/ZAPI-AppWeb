'use strict';
/* Rutas de la API.
   
   Contrato
   --------
   GET    /api/productos      catalogo con el stock actual
   GET    /api/productos/:id  una ficha
   GET    /api/stock          stock de todo el catalogo
   PUT    /api/stock/:id      cargar o cambiar el stock
   GET    /api/carrito        el carrito de la sesion
   POST   /api/carrito        agregar un producto
   PATCH  /api/carrito/:id    cambiar la cantidad
   DELETE /api/carrito/:id    sacar un producto
   POST   /api/pedidos        cerrar el pedido
   POST   /api/contacto       consulta del formulario de contacto

   Que se valida y que no
   ----------------------
   Todo lo que viene del cliente se trata como sospechoso. Las
   cantidades son numeros enteros acotados, nunca negativos ni NaN; los
   ids tienen que existir en el catalogo; el precio SIEMPRE se vuelve a
   leer de la base, porque un carrito con el precio editado a mano
   tiene que cobrar lo que dice el catalogo.

   El unico momento en que el servidor acepta un id que eligio el
   cliente es /api/stock/:id, y a proposito: es la unica forma de
   cargar el stock sin montar todavia un panel de administracion. Esa
   ruta pide un token; si se deja abierta, cualquiera que se sepa la
   URL puede vaciar el inventario. Ver server.js. */

const crypto = require('crypto');

const db = require('./db');
const sesion = require('./sesion');

const LIMITE_CANTIDAD = 99;
const LARGO_MAXIMO = 500;

/* ------------------------------------------------------------------
   Utilidades
   ------------------------------------------------------------------ */

/* Texto del cliente: se le sacan los caracteres de control y se
   recortan los espacios de los bordes. El recorte de largo evita que
   alguien mande un nombre de cien mil caracteres y llene la base. */
function texto(valor, maximo = LARGO_MAXIMO) {
    if (typeof valor !== 'string') return '';

    return valor
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .trim()
        .slice(0, maximo);
}

/* Las cantidades llegan de un formulario o de un JSON. Se vuelven
   enteros y quedan entre 1 y 99. Un NaN, un -5 o un 1e400 se
   rechazan: es mejor responder un error claro que castear a NaN y
   dejar que eso llegue a la consulta. */
function cantidadSegura(valor) {
    const numero = Number(valor);

    if (!Number.isInteger(numero) || numero < 1) return null;

    return Math.min(numero, LIMITE_CANTIDAD);
}

function precioRedondeado(numero) {
    return Math.round(numero * 100) / 100;
}

/* ------------------------------------------------------------------
   Catalogo
   ------------------------------------------------------------------ */

/* Se junta el producto del catalogo con su stock. El JSON guardado
   en la columna descripcion_json trae el resto de los campos (fotos,
   descripcion, datos de venta), asi que agregar uno al catalogo no
   obliga a tocar el esquema. */
function aJson(fila) {
    return {
        ...JSON.parse(fila.descripcion_json),
        id: fila.id,
        nombre: fila.nombre,
        slug: fila.slug,
        categoria: fila.categoria,
        precio: fila.precio,
        /* unidades === null significa "no hay stock cargado". No es lo
           mismo que 0: con null hay que preguntar, con 0 hay que avisar
           que se agoto. El front los muestra distinto. */
        unidades: fila.unidades,
        stockActualizado: fila.actualizado
    };
}

function listarProductos(req, res) {
    res.json({
        productos: db.productosConStock().map(aJson)
    });
}

function verProducto(req, res) {
    const fila = db.productosConStock().find(p => p.id === texto(req.params.id, 32));

    if (!fila) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ producto: aJson(fila) });
}

/* ------------------------------------------------------------------
   Stock
   ------------------------------------------------------------------ */

function verStock(req, res) {
    const stock = {};

    for (const fila of db.productosConStock()) {
        stock[fila.id] = fila.unidades;
    }

    res.json({ stock });
}

/* PUT /api/stock/:id
   Carga o cambia el stock. Acepta null a proposito: null es "sin
   datos", que es el estado real de este catalogo hoy. */
function cambiarStock(req, res) {
    const id = texto(req.params.id, 32);
    const unidades = req.body?.unidades;

    const esValido = unidades === null ||
        (Number.isInteger(unidades) && unidades >= 0);

    if (!esValido) {
        return res.status(400).json({
            error: 'Las unidades tienen que ser un entero mayor o igual a 0, o null si no hay datos'
        });
    }

    if (!db.precioDe(id)) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    db.ponerStock(id, unidades);

    res.json({ ok: true, id, unidades });
}

/* ------------------------------------------------------------------
   Carrito
   ------------------------------------------------------------------ */

/* El carrito se arma desde la base, no desde lo que el cliente mando.
   Asi los nombres y los precios son siempre los del catalogo. */
function verCarrito(req, res) {
    const idSesion = sesion.obtener(req, res);
    const items = db.carritoDe(idSesion);

    const total = items.reduce((suma, item) => suma + item.precio * item.cantidad, 0);

    /* Una linea con stock conocido que quedo por encima de lo
       disponible se marca en vez de bajarse sola: si se corrigiera en
       silencio, el cliente veria un precio distinto del que estaba
       mirando. Se avisa y que decida el. */
    const problemas = items
        .filter(item => item.unidades !== null && item.cantidad > item.unidades)
        .map(item => ({
            id: item.producto_id,
            nombre: item.nombre,
            pedido: item.cantidad,
            disponibles: item.unidades
        }));

    res.json({
        items: items.map(item => ({
            id: item.producto_id,
            nombre: item.nombre,
            precio: item.precio,
            cantidad: item.cantidad,
            unidades: item.unidades
        })),
        total: precioRedondeado(total),
        problemas
    });
}

function agregar(req, res) {
    const id = texto(req.body?.id, 32);
/* Si viene cantidad se valida; si no viene, se asume 1, que es lo
       que quiere decir "agregar". El ?? 1 solo corre cuando el campo
       no existe: si viene null explicito, ?? lo convertiria en 1 y
       aceptaria una cantidad que el cliente mando como invalida. */
const cantidad = cantidadSegura('cantidad' in req.body ? req.body.cantidad : 1);

        if (cantidad === null) {
            return res.status(400).json({ error: 'Cantidad invalida' });
        }

    if (!db.precioDe(id)) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const idSesion = sesion.obtener(req, res);
    db.agregarAlCarrito(idSesion, id, cantidad);

    res.status(201).json({ ok: true });
}

function fijar(req, res) {
    const id = texto(req.params.id, 32);
    const cantidad = cantidadSegura(req.body?.cantidad);

    if (cantidad === null) {
        return res.status(400).json({ error: 'Cantidad invalida' });
    }

    if (!db.precioDe(id)) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const idSesion = sesion.obtener(req, res);
    db.fijarCantidad(idSesion, id, cantidad);

    res.json({ ok: true });
}

function quitar(req, res) {
    const id = texto(req.params.id, 32);
    const idSesion = sesion.obtener(req, res);

    db.fijarCantidad(idSesion, id, 0);

    res.json({ ok: true });
}

/* ------------------------------------------------------------------
   Pedidos
   ------------------------------------------------------------------ */

function crearPedido(req, res) {
    const nombre = texto(req.body?.nombre, 120);
    const telefono = texto(req.body?.telefono, 40);

    /* Sin nombre y telefono no hay forma de coordinar el envio. El
       telefono se trata como texto y no como numero porque en
       Uruguay se escriben con guiones y con + adelante, y si se
       casteara a numero se romperia. */
    if (nombre.length < 2) {
        return res.status(400).json({ error: 'Falta el nombre de quien recibe' });
    }

    if (telefono.length < 6) {
        return res.status(400).json({ error: 'Falta un telefono de contacto' });
    }

    const idSesion = sesion.obtener(req, res);
    const items = db.carritoDe(idSesion);

    if (items.length === 0) {
        return res.status(400).json({ error: 'El carrito esta vacio' });
    }

    /* El precio se vuelve a leer de la base, no el que vino en el
       pedido: es la unica defensa contra que alguien manipule el total
       desde el navegador. */
    const lineas = items.map(item => {
        const producto = db.precioDe(item.producto_id);

        return {
            productoId: item.producto_id,
            nombre: producto ? producto.nombre : item.nombre,
            precio: producto ? producto.precio : item.precio,
            cantidad: item.cantidad
        };
    });

    const total = precioRedondeado(
        lineas.reduce((suma, linea) => suma + linea.precio * linea.cantidad, 0)
    );

    const sello = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const id = `Z-${sello}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    try {
        db.crearPedido({
            id,
            sesion: idSesion,
            nombre,
            telefono,
            email: texto(req.body?.email, 160) || null,
            zona: texto(req.body?.zona, 120) || null,
            notas: texto(req.body?.notas, 500) || null,
            total,
            items: lineas,
            creado: new Date().toISOString()
        });
    } catch (error) {
        /* La transaccion de db.js ya revirtio el stock. Falta stock de
           verdad: se responde 409 con las unidades reales, para que el
           cliente baje la cantidad y pueda seguir.

           Ojo con el filter: la cantidad pedida aqui se llama
           "pedido", no "cantidad". Comparar contra linea.cantidad
           comparaba contra undefined, que da false siempre, el filtro
           se comia todos los shortages y el 409 nunca salia: el
           cliente recibia un 500 en vez de un 409 con las unidades. */
        const shortages = lineas
            .map(linea => ({
                id: linea.productoId,
                nombre: linea.nombre,
                pedido: linea.cantidad,
                disponibles: db.unidadesRestantes(linea.productoId)
            }))
            .filter(linea => linea.disponibles === null || linea.disponibles < linea.pedido);

        if (shortages.length > 0) {
            return res.status(409).json({
                error: 'No hay stock suficiente',
                shortages
            });
        }

        throw error;
    }

    db.vaciarCarrito(idSesion);

    res.status(201).json({ ok: true, id, total });
}

/* ------------------------------------------------------------------
   Contacto
   ------------------------------------------------------------------ */

/* Lo que se busca es separar "se le olvidó el @ o el .com" de "esto
   no es un correo". No es un validador de RFC: apretar reglas de mas
   termina rechazando direcciones que son reales. */
const CORREO = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

/* POST /api/contacto
   Recibe el formulario de la seccion de contacto. A diferencia del
   carrito, aca no hay transaccion que hacer: o se guarda la consulta
   entera o no se guarda nada, y por eso alcanza con un INSERT. */
function crearContacto(req, res) {
    /* Campo trampa (honeypot). Va escondido para la persona y es
       invisible para un robot que completa todos los inputs. Si
       viene relleno se responde 201 igual de ok: si se respondiera
       con error, el robot aprenderia a no llenarlo, y entonces
       dejaria de filtrarse pero a costa de un dato real menos. */
    if (texto(req.body?.sitio_web, 100)) {
        return res.status(201).json({ ok: true });
    }

    const nombre = texto(req.body?.nombre, 120);
    const correo = texto(req.body?.correo, 160);
    const telefono = texto(req.body?.telefono, 40);
    const consulta = texto(req.body?.consulta, 2000);

    /* Cada error vuelve con el nombre del campo: el front usa eso
       para poner el foco en el input que hay que corregir, en vez
       de pintar un error suelto arriba del formulario. */
    if (nombre.length < 2) {
        return res.status(400).json({ error: 'Escribí tu nombre', campo: 'nombre' });
    }

    if (!CORREO.test(correo)) {
        return res.status(400).json({ error: 'Revisá el correo electrónico', campo: 'correo' });
    }

    /* El teléfono se cuenta por dígitos, no por largo: en Uruguay se
       escribe con +, con guiones y con espacios, y contado crudo un
       "09 123 456" da 10 caracteres pero un "+598 9 123 4567" da 13.
       Lo que importa es que haya suficientes números para llamar. */
    if (telefono.replace(/\D/g, '').length < 6) {
        return res.status(400).json({ error: 'Revisá el teléfono de contacto', campo: 'telefono' });
    }

    if (consulta.length < 10) {
        return res.status(400).json({
            error: 'Contanos un poco más sobre tu consulta',
            campo: 'consulta'
        });
    }

    db.crearMensaje({
        nombre,
        correo,
        telefono,
        consulta,
        creado: new Date().toISOString()
    });

    res.status(201).json({ ok: true });
}

/* ------------------------------------------------------------------
   Salud
   ------------------------------------------------------------------ */

function salud(req, res) {
    res.json({
        ok: true,
        productos: db.productosConStock().length,
        hora: new Date().toISOString()
    });
}

module.exports = {
    listarProductos,
    verProducto,
    verStock,
    cambiarStock,
    verCarrito,
    agregar,
    fijar,
    quitar,
    crearPedido,
    crearContacto,
    salud,
    cantidadSegura
};
