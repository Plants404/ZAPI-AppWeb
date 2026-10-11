'use strict';
/* ==========================================================
   ARRANQUE
   ------------------------------------------------------------
   Conecta a Mongo ANTES de escuchar. El servidor no dice que
   esta listo si la base todavia no responde: escuchar con Mongo
   caido hace que el visitante mande un formulario que se pierde
   en silencio, que es peor que un error al arrancar.

   Al recibir SIGINT/SIGTERM se cierra primero el servidor (deja
   de aceptar conexiones nuevas y termina las que estan en
   curso) y recien despues la base. Con un tiempo limite, para
   que un apagado no quede colgado.
   ========================================================== */

const config = require('./config/env');
const database = require('./config/database');
const log = require('./utils/log');
const { crearApp } = require('./app');
const { sembrarCatalogo } = require('./services/catalogo.service');
const { sembrarTestimonios } = require('./services/testimonios.service');

const ESPERA_CIERRE = 10000;

async function arrancar() {
    await database.conectar();

    /* El catalogo se carga del JSON versionado ANTES de escuchar:
       un deploy recien clonado tiene productos aunque nunca se
       haya corrido nada. El stock no se toca: se escribe a mano. */
    await sembrarCatalogo();

    /* Los testimonios salen del mismo JSON que baja el carrusel
       cuando la API no esta: siembra idempotente por autor+fecha. */
    await sembrarTestimonios();

    const app = crearApp();

    const server = app.listen(config.puerto, () => {
        log.info('servidor escuchando', {
            url: `http://localhost:${config.puerto}`,
            entorno: config.entorno,
            mongo: database.nombreEstado(),
        });
    });

    let cerrando = false;

    for (const senal of ['SIGINT', 'SIGTERM']) {
        process.on(senal, () => {
            /* Dos Ctrl+C seguidos no tienen que disparar dos
               cierres en paralelo. */
            if (cerrando) return;

            cerrando = true;

            log.info('cerrando', { senal });

            const limite = setTimeout(() => {
                log.warn('cierre forzado por timeout');
                process.exit(1);
            }, ESPERA_CIERRE);

            limite.unref();

            server.close(async () => {
                await database.cerrar();

                log.info('cerrado');

                process.exit(0);
            });
        });
    }

    return server;
}

/* Solo arranca si se ejecuta el archivo directo. Si se importa
   -como hace una prueba-, queda la funcion a mano y el test
   elige cuando y en que puerto. */
if (require.main === module) {
    arrancar().catch(error => {
        log.error('no se pudo arrancar el servidor', { mensaje: error.message });
        process.exit(1);
    });
}

module.exports = { arrancar };
