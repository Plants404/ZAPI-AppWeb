'use strict';
/* ==========================================================
   ALTA DE UNA CUENTA DESDE LA CONSOLA
   ------------------------------------------------------------
   Crea una cuenta para poder entrar al carrito en desarrollo sin
   pasar por el formulario web. Usa el mismo services/usuarios.service
   que usa la web, asi que la clave se guarda igual (scrypt + salt):
   no hay una contrasena en texto plano en ningun lado.

   Uso:
     npm run crear:usuario -- <email> <nombre> <clave>
   o, sin npm:
     node --env-file-if-exists=.env tools/crear-usuario.js <email> <nombre> <clave>

   Toma la conexion de config/env.js (MONGODB_URI, o el Mongo local
   por defecto). Sale con codigo 1 si falta un dato, si el correo ya
   esta tomado o si no se puede conectar; 0 si la creo. */

const path = require('path');

const raiz = path.join(__dirname, '..');
const backend = (...partes) => path.join(raiz, 'backend', 'src', ...partes);

const database = require(backend('config', 'database'));
const { CORREO, LARGO, MINIMOS } = require(backend('constants'));
const usuarios = require(backend('services', 'usuarios.service'));

const AYUDA = 'Uso: npm run crear:usuario -- <email> <nombre> <clave>';

async function principal() {
    const [emailCrudo, nombreCrudo, clave] = process.argv.slice(2);

    if (!emailCrudo || !nombreCrudo || !clave) {
        console.error(AYUDA);
        process.exitCode = 1;
        return;
    }

    const email = emailCrudo.trim().toLowerCase();
    const nombre = nombreCrudo.trim();

    if (!CORREO.test(email)) {
        console.error('Email invalido: ' + emailCrudo);
        process.exitCode = 1;
        return;
    }

    if (nombre.length < MINIMOS.nombre || nombre.length > LARGO.nombre) {
        console.error(
            'Nombre invalido: tiene que tener entre ' +
            MINIMOS.nombre + ' y ' + LARGO.nombre + ' caracteres.'
        );
        process.exitCode = 1;
        return;
    }

    if (clave.length < MINIMOS.clave || clave.length > LARGO.clave) {
        console.error(
            'Clave invalida: tiene que tener entre ' +
            MINIMOS.clave + ' y ' + LARGO.clave + ' caracteres.'
        );
        process.exitCode = 1;
        return;
    }

    try {
        await database.conectar();

        const resultado = await usuarios.crear({ email, nombre, clave });

        if (resultado.tipo === 'duplicado') {
            console.error('Ya existe una cuenta con el correo ' + email + '.');
            process.exitCode = 1;
            return;
        }

        console.log('Cuenta creada: ' + resultado.usuario.email +
            ' (nombre: ' + resultado.usuario.nombre + ')');
        console.log('Entrá en /login.html con ese correo y la clave.');
    } catch (error) {
        console.error('No se pudo crear la cuenta: ' + error.message);
        process.exitCode = 1;
    } finally {
        await database.cerrar();
    }
}

principal();
