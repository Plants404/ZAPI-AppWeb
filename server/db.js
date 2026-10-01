'use strict';
/* Base de datos del servidor.
   Sin dependencias: Node 24 trae node:sqlite, que es SQLite de
   verdad, asi que no hay que compilar nada ni instalar better-sqlite3.

   Por que SQLite y no un JSON
   ----------------------------
   Un archivo JSON con el stock se rompe en produccion apenas hay dos
   personas comprando a la vez: las dos leen el mismo contenido, las
   dos escriben encima y una pis a la otra. SQLite serializa las
   escrituras y descuenta stock de verdad, asi que el "ultimo" en
   entrar es el que gana y no se pierde ninguna venta.

   Y por que no Postgres todavia
   -----------------------------
   SQLite es un solo archivo. Se copia con un cp, se sube por FTP, se
   respalda pegandolo en el Drive y no hay que contratar ni configurar
   una base aparte. Alcanza de sobra para una vivera con siete
   productos. Si el dia de mañana hay que migrar, el esquema esta
   escrito en SQL normal y se cambia el archivo de conexion.

   Donde queda el archivo
   ----------------------
   data/zapi.db. Va en .gitignore: es estado, no codigo, y cada copia
   del repo arranca con el stock limpio. Para reiniciar de cero se
   borra el archivo y se corre el servidor otra vez. */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const raiz = path.join(__dirname, '..');
const carpetaDatos = path.join(raiz, 'data');

const RUTA_DB = process.env.ZAPI_DB || path.join(carpetaDatos, 'zapi.db');

fs.mkdirSync(carpetaDatos, { recursive: true });

const db = new DatabaseSync(RUTA_DB);

/* WAL: el servidor sigue leyendo mientras se escribe un pedido.
   Sin esto, cada venta traba a todos los que estan mirando el
   catalogo. Y busy_timeout evita que dos escrituras simultaneas
   tiren error: la segunda espera en vez de romper. */
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA busy_timeout = 5000');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
    /* El catalogo de verdad: precio, nombre y demas datos del
       producto. Se carga desde productos.js al arrancar. La columna
       descripcion_json guarda el resto del objeto (fotos, categoria,
       datos de venta) tal cual llega, para que agregar un campo al
       catalogo no obligue a tocar el esquema. */
    CREATE TABLE IF NOT EXISTS productos (
        id              TEXT PRIMARY KEY,
        nombre          TEXT NOT NULL,
        slug            TEXT NOT NULL UNIQUE,
        categoria       TEXT NOT NULL,
        precio          REAL NOT NULL,
        descripcion_json TEXT NOT NULL,
        activo          INTEGER NOT NULL DEFAULT 1
    );

    /* El stock va aparte del catalogo a proposito: el catalogo se
       edita con un commit de git, el stock lo baja la gente
       comprando. Mezclarlos haria que cada venta dejara el repo
       sucio, o que un edit de precio borrara las unidades vendidas.

       0 = sin datos. No es lo mismo que 0 unidades: sin datos hay
       que preguntar, con 0 unidades hay que avisar que se agoto. Por
       eso stock es NULL y no 0 cuando no se cargo. */
    CREATE TABLE IF NOT EXISTS stock (
        producto_id TEXT PRIMARY KEY REFERENCES productos(id),
        unidades    INTEGER,
        actualizado TEXT
    );

    /* Carritos del servidor. El carrito se guarda aca y no en el
       navegador para que el stock que se ve sea el mismo que el que
       se descuenta: si dos personas arman el mismo pedido a la vez,
       la segunda ve que no hay unidades. La sesion es una cookie
       firmada, aca solo esta su id. */
    CREATE TABLE IF NOT EXISTS carritos (
        sesion    TEXT PRIMARY KEY,
        creado    TEXT NOT NULL,
        actualizado TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS carrito_items (
        sesion     TEXT NOT NULL REFERENCES carritos(sesion) ON DELETE CASCADE,
        producto_id TEXT NOT NULL REFERENCES productos(id),
        cantidad   INTEGER NOT NULL,
        PRIMARY KEY (sesion, producto_id)
    );

    /* Pedidos. Se guardan antes de cobrar: si el cobro falla, el
       pedido queda con estado 'pendiente' y se puede revisar a mano.
       Nunca se borran: son las ventas. */
    CREATE TABLE IF NOT EXISTS pedidos (
        id            TEXT PRIMARY KEY,
        sesion        TEXT,
        nombre        TEXT NOT NULL,
        telefono      TEXT NOT NULL,
        email         TEXT,
        zona          TEXT,
        notas         TEXT,
        total         REAL NOT NULL,
        estado        TEXT NOT NULL DEFAULT 'pendiente',
        creado        TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pedido_items (
        pedido_id    TEXT NOT NULL REFERENCES pedidos(id),
        producto_id  TEXT NOT NULL,
        nombre       TEXT NOT NULL,
        precio       REAL NOT NULL,
        cantidad     INTEGER NOT NULL,
        PRIMARY KEY (pedido_id, producto_id)
    );

    CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
    CREATE INDEX IF NOT EXISTS idx_items_producto ON carrito_items(producto_id);
`);

/* ------------------------------------------------------------------
   Consultas reutilizables
   ------------------------------------------------------------------ */

/* carrito_items tiene clave foranea a carritos, asi que la fila madre
   tiene que existir antes de escribir una linea. Con INSERT OR IGNORE
   da igual: si ya esta no hace nada, y si no esta la crea.

   Vive afuera del objeto exportado, y no dentro, por una razon muy
   concreta: los metodos del objeto no se pueden llamar entre si con el
   nombre pelado. Si asegurarCarrito fuera un metodo mas, el
   agregarAlCarrito que lo invoca recibiria un ReferenceError y el
   primer "agregar al carrito" reventaria con un 500. */
function asegurarCarrito(sesion) {
    db.prepare(`
        INSERT OR IGNORE INTO carritos (sesion, creado, actualizado)
        VALUES (?, datetime('now'), datetime('now'))
    `).run(sesion);
}

module.exports = {
    db,
    RUTA_DB,
    asegurarCarrito,

    /* El catalogo con el stock pegado. LEFT JOIN y no INNER porque
       un producto sin stock cargado igual tiene que aparecer en el
       catalogo: lo que se muestra aca es "precio sin confirmar
       stock", no "producto inexistente". */
    productosConStock() {
        return db.prepare(`
            SELECT p.id, p.nombre, p.slug, p.categoria, p.precio,
                   p.descripcion_json, s.unidades, s.actualizado
            FROM productos p
            LEFT JOIN stock s ON s.producto_id = p.id
            WHERE p.activo = 1
            ORDER BY p.nombre
        `).all();
    },

    /* Inserta o actualiza un producto del catalogo. Se corre al
       arrancar el servidor con lo que hay en productos.js. */
    upsertProducto(producto) {
        db.prepare(`
            INSERT INTO productos (id, nombre, slug, categoria, precio, descripcion_json, activo)
            VALUES (?, ?, ?, ?, ?, ?, 1)
            ON CONFLICT(id) DO UPDATE SET
                nombre = excluded.nombre,
                slug = excluded.slug,
                categoria = excluded.categoria,
                precio = excluded.precio,
                descripcion_json = excluded.descripcion_json
        `).run(
            producto.id,
            producto.nombre,
            producto.slug,
            producto.categoria,
            producto.precio,
            JSON.stringify(producto.resto)
        );
    },

    /* El stock se escribe a mano desde la administracion, asi que
       este es el unico camino para cambiarlo. Si llega null es "sin
       datos" y no "agotado": null > null devuelve null en SQLite. */
    ponerStock(productoId, unidades) {
        db.prepare(`
            INSERT INTO stock (producto_id, unidades, actualizado)
            VALUES (?, ?, datetime('now'))
            ON CONFLICT(producto_id) DO UPDATE SET
                unidades = excluded.unidades,
                actualizado = excluded.actualizado
        `).run(productoId, unidades);
    },

    /* El precio sale de la base y nunca del cliente. Un carrito con
       el precio editado a mano tiene que cobrar lo que dice el
       catalogo. */
    precioDe(productoId) {
        const fila = db.prepare(
            'SELECT nombre, precio FROM productos WHERE id = ? AND activo = 1'
        ).get(productoId);

        return fila || null;
    },

    stockDe(productoId) {
        const fila = db.prepare(
            'SELECT unidades FROM stock WHERE producto_id = ?'
        ).get(productoId);

        return fila ? fila.unidades : null;
    },

    /* ----------------------------------------------------------------
       Carrito
       ---------------------------------------------------------------- */

    carritoDe(sesion) {
        return db.prepare(`
            SELECT i.producto_id, i.cantidad, p.nombre, p.precio, s.unidades
            FROM carrito_items i
            JOIN productos p ON p.id = i.producto_id
            LEFT JOIN stock s ON s.producto_id = p.id
            WHERE i.sesion = ? AND p.activo = 1
            ORDER BY p.nombre
        `).all(sesion);
    },

    /* Suma la cantidad sin pasarse. Se hace con un UPSERT porque el
       carrito no tiene lineas hasta que alguien agrega algo: el
       ON CONFLICT resuelve el caso de que ya exista, asi que no hace
       falta leer antes. */
    agregarAlCarrito(sesion, productoId, cantidad) {
        asegurarCarrito(sesion);

        db.prepare(`
            INSERT INTO carrito_items (sesion, producto_id, cantidad)
            VALUES (?, ?, ?)
            ON CONFLICT(sesion, producto_id) DO UPDATE SET
                cantidad = MIN(cantidad + excluded.cantidad, 99)
        `).run(sesion, productoId, cantidad);
    },

    fijarCantidad(sesion, productoId, cantidad) {
        asegurarCarrito(sesion);

        if (cantidad <= 0) {
            return db.prepare(
                'DELETE FROM carrito_items WHERE sesion = ? AND producto_id = ?'
            ).run(sesion, productoId);
        }

        return db.prepare(`
            UPDATE carrito_items SET cantidad = ?
            WHERE sesion = ? AND producto_id = ?
        `).run(Math.min(cantidad, 99), sesion, productoId);
    },

    vaciarCarrito(sesion) {
        return db.prepare('DELETE FROM carrito_items WHERE sesion = ?').run(sesion);
    },

    /* ----------------------------------------------------------------
       Pedidos
       ---------------------------------------------------------------- */

    /* Descuenta stock y escribe el pedido en una transaccion. O pasa
       todo o no pasa nada: si algo falla a medias, el rollback deja el
       stock como estaba. Sin esto se podria haber descontado el stock
       de un pedido que no llego a guardarse, que es plata que no
       vuelve sola.

       El orden de escritura no es libre: pedido_items tiene clave
       foranea a pedidos(id), asi que la fila del pedido tiene que
       existir ANTES de escribir sus lineas. Al reves da FOREIGN KEY
       constraint failed. Por eso va escribir.run() primero y el
       for de las lineas despues. */
    crearPedido(datos) {
        const descontar = db.prepare(`
            UPDATE stock SET unidades = unidades - ?, actualizado = datetime('now')
            WHERE producto_id = ? AND unidades IS NOT NULL AND unidades >= ?
        `);

        const escribir = db.prepare(`
            INSERT INTO pedidos (id, sesion, nombre, telefono, email, zona, notas, total, estado, creado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?)
        `);

        const lineas = db.prepare(`
            INSERT INTO pedido_items (pedido_id, producto_id, nombre, precio, cantidad)
            VALUES (?, ?, ?, ?, ?)
        `);

        db.exec('BEGIN IMMEDIATE');

        try {
            /* Primero la fila madre, porque las lineas la referencian. */
            escribir.run(
                datos.id, datos.sesion, datos.nombre, datos.telefono,
                datos.email || null, datos.zona || null, datos.notas || null,
                datos.total, datos.creado
            );

            for (const linea of datos.items) {
                const resultado = descontar.run(
                    linea.cantidad, linea.productoId, linea.cantidad
                );

                /* changes === 0 significa que la fila de stock no
                   existe (sin datos cargados), o que no quedaban
                   unidades. En los dos casos no se puede vender: se
                   corta y el rollback deja todo como estaba. */
                if (resultado.changes === 0) {
                    throw new Error(`Sin stock disponible para ${linea.nombre}`);
                }

                lineas.run(
                    datos.id, linea.productoId, linea.nombre, linea.precio, linea.cantidad
                );
            }

            db.exec('COMMIT');
        } catch (error) {
            db.exec('ROLLBACK');
            throw error;
        }
    },

    /* Stock que quedo, para avisarle al cliente que se agoto en vez
       de soltarle un error seco. */
    unidadesRestantes(productoId) {
        const fila = db.prepare(
            'SELECT unidades FROM stock WHERE producto_id = ?'
        ).get(productoId);

        return fila ? fila.unidades : null;
    }
};
