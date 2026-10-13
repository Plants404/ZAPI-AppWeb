'use strict';
/* ==========================================================
   RATE LIMIT
   ------------------------------------------------------------
   Un limite pensado para una sola operacion atomica por cubo,
   con la implementacion por defecto en memoria. Dos reglas segun
   cuanta informacion mueve cada endpoint: leer testimonios es lo
   normal y aguanta mucho mas; escribir una consulta de contacto
   se corta antes de que alguien llene la base con spam.

   El contador NO vive en este middleware: vive en un almacen
   (store) intercambiable. Por defecto es un Map en memoria del
   proceso, que alcanza para una sola instancia y no agrega
   infraestructura. Para escalar horizontalmente (varias
   instancias detras de un balanceador) se inyecta con
   usarAlmacen() un almacen compartido (por ejemplo, uno sobre
   Redis) que ofrezca esta interfaz:

     consumir({ clave, ventanaMs, maximo, ahora }) -> resultado
       resultado = { permitido: true }
                 | { permitido: false, segundos: N }

     purgar(ahora)   -> borra las ventanas vencidas (opcional)
     reiniciar()     -> deja el almacen vacio (opcional)

   Los metodos pueden devolver el resultado directo o una promesa;
   el limitador espera las dos formas. Un almacen compartido debe
   resolver el incremento de forma atomica (en Redis: INCR y
   EXPIRE) para que dos instancias no cuenten la misma peticion
   dos veces ni se pisen.
   ========================================================== */

const config = require('../config/env');

/* Almacen por defecto: un Map del proceso. consumir() es sincrono
   y atomico (Node corre un solo hilo), asi que el limite se
   respeta aunque lleguen peticiones en el mismo tick. */
function crearAlmacenEnMemoria() {
    const registros = new Map();

    return {
        consumir({ clave, ventanaMs, maximo, ahora }) {
            const previo = registros.get(clave);

            if (!previo || ahora > previo.reinicio) {
                registros.set(clave, { cuenta: 1, reinicio: ahora + ventanaMs });

                return { permitido: true };
            }

            if (previo.cuenta >= maximo) {
                return {
                    permitido: false,
                    segundos: Math.ceil((previo.reinicio - ahora) / 1000),
                };
            }

            previo.cuenta++;

            return { permitido: true };
        },
        purgar(ahora) {
            for (const [clave, dato] of registros) {
                if (ahora > dato.reinicio) registros.delete(clave);
            }
        },
        reiniciar() {
            registros.clear();
        },
    };
}

let almacen = crearAlmacenEnMemoria();

/* Reemplaza el almacen activo. Pensado para inyectar uno compartido
   o, en las pruebas, uno de mentira. */
function usarAlmacen(nuevo) {
    if (!nuevo || typeof nuevo.consumir !== 'function') {
        throw new Error('usarAlmacen necesita un almacen con consumir()');
    }

    almacen = nuevo;
}

/* Limpieza periodica de las ventanas vencidas del almacen activo.
   El setInterval lleva unref() para que no mantenga vivo el proceso
   al apagar. */
setInterval(() => {
    if (typeof almacen.purgar === 'function') almacen.purgar(Date.now());
}, 5 * 60 * 1000).unref();

let contador = 0;

/* Cada limitador arma su clave con su nombre ademas de la IP. Sin
   el nombre, los cuatro limites compartirian la misma entrada del
   almacen por IP y se pisarian las cuentas entre si: una racha de
   lecturas gastaria el cupo del login, y al reves. El nombre hace
   que cada regla tenga su propio cubo. */
function crearLimite(ventanaMs, maximo, nombre) {
    const prefijo = (nombre || `limite-${++contador}`) + '|';

    function decidir(resultado, res, next) {
        if (resultado.permitido) return next();

        res.setHeader('Retry-After', String(resultado.segundos));

        return res.status(429).json({
            error: 'Demasiadas peticiones. Esperá un momento e intentá de nuevo.',
        });
    }

    return function limite(req, res, next) {
        /* Detras de un proxy, req.ip es la IP real si trust proxy
           esta bien configurado (ver app.js). */
        const clave = prefijo + (req.ip || 'desconocido');

        const resultado = almacen.consumir({
            clave,
            ventanaMs,
            maximo,
            ahora: Date.now(),
        });

        /* El almacen en memoria responde sincrono; uno compartido
           responde con promesa. Se atienden las dos formas. */
        if (resultado && typeof resultado.then === 'function') {
            resultado.then(r => decidir(r, res, next), next);
        } else {
            decidir(resultado, res, next);
        }
    };
}

const limiteLectura = crearLimite(60 * 1000, config.limiteLectura, 'lectura');
const limiteEscritura = crearLimite(10 * 60 * 1000, config.limiteEscritura, 'escritura');

/* El chat del asistente va aparte: mueve mas que una escritura
   normal y quiere su propia ventana corta. */
const limiteChat = crearLimite(60 * 1000, config.limiteChat, 'chat');

/* Login y registro: ventana de 10 minutos y un tope bajo. Es la
   unica ruta donde alguien podria probar contraseñas en serie. */
const limiteAuth = crearLimite(10 * 60 * 1000, config.limiteAutenticacion, 'auth');

/* Solo para las pruebas: deja el almacen activo limpio entre casos. */
function reiniciar() {
    if (typeof almacen.reiniciar === 'function') almacen.reiniciar();
}

module.exports = {
    limiteLectura, limiteEscritura, limiteChat, limiteAuth,
    crearLimite, reiniciar, usarAlmacen, crearAlmacenEnMemoria,
};
