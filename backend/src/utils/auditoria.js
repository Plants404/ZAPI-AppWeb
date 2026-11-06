'use strict';

const Auditoria = require('../models/Auditoria');

async function registrarAuditoria({ actor, accion, entidad, entidadId, detalle }, session) {
    if (!actor) return null;

    const [registro] = await Auditoria.create([{
        actor: actor._id || actor.id || null,
        actorEmail: actor.email || '',
        accion,
        entidad,
        entidadId: entidadId ? String(entidadId) : '',
        detalle: detalle || null,
    }], session ? { session } : {});

    return registro;
}

module.exports = { registrarAuditoria };
