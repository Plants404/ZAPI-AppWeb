'use strict';

/* Prueba el limitador contra la base real del .env.
   Uso: npm run probar:limiter
   Verifica: que cuente, que bloquee al superar el límite, que reinicie al
   vencer la ventana y que 40 peticiones simultáneas den exactamente 30
   permitidas (límite de `eventos`), sin errores ni conteos perdidos.
   Antes hay que haber corrido `npm run backend:indices`. */

const assert = require('node:assert/strict');
const { connectDatabase, closeDatabase } = require('./db.js');
const { POLITICAS, verificarLimite } = require('./lib/limiter.js');

async function main() {
    const db = await connectDatabase();
    const sufijo = `prueba-${Date.now()}`;
    const limites = db.collection('limites');

    try {
        const { limite } = POLITICAS.contacto;
        for (let i = 1; i <= limite; i += 1) {
            assert.equal((await verificarLimite(db, 'contacto', sufijo)).permitido, true, `llamada ${i}`);
        }
        const bloqueada = await verificarLimite(db, 'contacto', sufijo);
        assert.equal(bloqueada.permitido, false, 'la llamada siguiente al límite debe bloquearse');
        assert.ok(bloqueada.retryAfter >= 1);
        console.log(`OK conteo y bloqueo (límite ${limite}, retryAfter ${bloqueada.retryAfter}s)`);

        await limites.updateOne({ clave: `contacto:${sufijo}` }, { $set: { expiraEn: new Date(Date.now() - 1000) } });
        assert.equal((await verificarLimite(db, 'contacto', sufijo)).permitido, true, 'tras vencer la ventana');
        assert.equal((await limites.findOne({ clave: `contacto:${sufijo}` })).count, 1);
        console.log('OK reinicio al vencer la ventana');

        const total = 40;
        const resultados = await Promise.all(
            Array.from({ length: total }, () => verificarLimite(db, 'eventos', sufijo))
        );
        const permitidas = resultados.filter(r => r.permitido).length;
        assert.equal(permitidas, POLITICAS.eventos.limite, `de ${total} simultáneas deben pasar ${POLITICAS.eventos.limite}`);
        assert.equal((await limites.findOne({ clave: `eventos:${sufijo}` })).count, total);
        console.log(`OK concurrencia (${total} simultáneas: ${permitidas} permitidas, ${total - permitidas} bloqueadas)`);

        console.log('Limitador verificado contra la base real.');
    } finally {
        await limites.deleteMany({ clave: { $regex: `${sufijo}$` } });
        await closeDatabase();
    }
}

main().catch(error => {
    console.error('FALLÓ:', error.message);
    process.exitCode = 1;
});
