'use strict';

/* Escribe una entrada de auditoría para cada cambio del admin.
   Quién, qué, cuándo, resumen del antes y el después. Alimenta "Últimos cambios". */

async function registrarAuditoria(db, usuario, accion, antes, despues, resumen) {
    await db.collection('auditoria').insertOne({
        usuario: usuario && usuario.id ? usuario.id : 'desconocido',
        email: usuario && usuario.email ? usuario.email : '',
        rol: usuario && usuario.rol ? usuario.rol : '',
        accion,
        antes,
        despues,
        resumen,
        createdAt: new Date()
    });
}

module.exports = { registrarAuditoria };
