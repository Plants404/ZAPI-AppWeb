'use strict';

/* Gestión del panel admin: mensajes de contacto, testimonios y accesos (usuarios).
   Todo exige sesión de administrador y deja rastro en auditoría. */

const express = require('express');
const { ObjectId } = require('mongodb');
const { HttpError } = require('../lib/http-error.js');
const { requerirAdmin } = require('../lib/auth.js');
const { registrarAuditoria } = require('../lib/auditoria.js');

const ESTADOS_MENSAJE = ['new', 'read', 'answered'];
const ESTADOS_TESTIMONIO = ['pending', 'approved', 'rejected'];
const ROLES = ['admin', 'cliente'];
const LIMITE = 100;

function idObjeto(valor) {
    if (!/^[a-f0-9]{24}$/.test(String(valor))) throw new HttpError(404, 'No se encontró el registro.');
    return new ObjectId(String(valor));
}

function estadoValido(cuerpo, validos) {
    const estado = cuerpo && cuerpo.estado;
    if (!validos.includes(estado)) throw new HttpError(400, 'El estado no es válido.');
    return estado;
}

function crearRouter(getDatabase) {
    const router = express.Router();
    const admin = requerirAdmin(getDatabase);

    /* ----- Mensajes de contacto ----- */
    router.get('/mensajes', admin, async (req, res) => {
        const filtro = ESTADOS_MENSAJE.includes(req.query.estado) ? { estado: req.query.estado } : {};
        const items = await getDatabase().collection('contacts')
            .find(filtro).sort({ createdAt: -1 }).limit(LIMITE).toArray();
        res.json({
            mensajes: items.map(m => ({
                id: String(m._id || m.id),
                nombre: m.nombre,
                email: m.email,
                telefono: m.telefono || '',
                asunto: m.asunto,
                mensaje: m.mensaje,
                estado: m.estado || 'new',
                fecha: m.createdAt
            }))
        });
    });

    router.patch('/mensajes/:id', admin, async (req, res) => {
        const db = getDatabase();
        const estado = estadoValido(req.body, ESTADOS_MENSAJE);
        const _id = idObjeto(req.params.id);
        const antes = await db.collection('contacts').findOne({ _id });
        if (!antes) throw new HttpError(404, 'No se encontró el mensaje.');
        await db.collection('contacts').findOneAndUpdate({ _id }, { $set: { estado } });
        await registrarAuditoria(db, req.usuario, 'mensaje.estado', { estado: antes.estado }, { estado },
            `Mensaje de ${antes.nombre} marcado como ${estado}`);
        res.json({ ok: true, estado });
    });

    /* ----- Testimonios ----- */
    router.get('/testimonios', admin, async (req, res) => {
        const filtro = ESTADOS_TESTIMONIO.includes(req.query.estado) ? { estado: req.query.estado } : {};
        const items = await getDatabase().collection('testimonials')
            .find(filtro).sort({ createdAt: -1 }).limit(LIMITE).toArray();
        res.json({
            testimonios: items.map(t => ({
                id: String(t._id),
                autor: t.autor,
                lugar: t.lugar || '',
                texto: t.texto,
                estrellas: t.estrellas,
                productoId: t.productoId === undefined ? null : t.productoId,
                estado: t.estado || 'pending',
                fecha: t.createdAt
            }))
        });
    });

    router.patch('/testimonios/:id', admin, async (req, res) => {
        const db = getDatabase();
        const estado = estadoValido(req.body, ESTADOS_TESTIMONIO);
        const _id = idObjeto(req.params.id);
        const antes = await db.collection('testimonials').findOne({ _id });
        if (!antes) throw new HttpError(404, 'No se encontró el testimonio.');
        await db.collection('testimonials').findOneAndUpdate({ _id }, { $set: { estado } });
        await registrarAuditoria(db, req.usuario, 'testimonio.estado', { estado: antes.estado }, { estado },
            `Testimonio de ${antes.autor} marcado como ${estado}`);
        res.json({ ok: true, estado });
    });

    /* ----- Accesos ----- */
    router.get('/usuarios', admin, async (req, res) => {
        const items = await getDatabase().collection('users')
            .find({}).sort({ createdAt: -1 }).limit(LIMITE).toArray();
        res.json({
            usuarios: items.map(u => ({
                id: String(u._id),
                nombre: u.nombre || '',
                email: u.email,
                rol: u.rol,
                fecha: u.createdAt,
                esYo: String(u._id) === req.usuario.id
            }))
        });
    });

    router.patch('/usuarios/:id', admin, async (req, res) => {
        const db = getDatabase();
        const rol = req.body && req.body.rol;
        if (!ROLES.includes(rol)) throw new HttpError(400, 'El rol no es válido.');
        const _id = idObjeto(req.params.id);
        if (String(_id) === req.usuario.id) {
            throw new HttpError(400, 'No podés cambiar tu propio rol.');
        }
        const antes = await db.collection('users').findOne({ _id });
        if (!antes) throw new HttpError(404, 'No se encontró el usuario.');

        await db.collection('users').findOneAndUpdate({ _id }, { $set: { rol } });
        /* Las sesiones guardan el rol: se cierran para que el cambio rija ya. */
        await db.collection('sessions').deleteMany({ userId: String(_id) });
        await registrarAuditoria(db, req.usuario, 'usuario.rol', { rol: antes.rol }, { rol },
            `Rol de ${antes.email} cambiado a ${rol}`);
        res.json({ ok: true, rol });
    });

    return router;
}

module.exports = { crearRouter };
