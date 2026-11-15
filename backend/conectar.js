'use strict';

/* Comprueba la conexión a MongoDB y dice qué arreglar si falla.
   Uso: npm run backend:conectar
   Nunca muestra la cadena de conexión ni la contraseña. */

const { connectDatabase, closeDatabase } = require('./db.js');

/* Devuelve un texto con el problema de la cadena, o null si parece bien. */
function revisarCadena(cadena) {
    if (!cadena || !cadena.trim()) {
        return 'Falta MONGODB_URI. Creá un archivo .env en la raíz del proyecto con esa variable.';
    }
    const uri = cadena.trim();
    if (/\s|["']/.test(uri)) {
        return 'La cadena tiene espacios o comillas. Pegala en una sola línea y sin comillas.';
    }
    if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
        return 'MONGODB_URI debe empezar con mongodb+srv:// (copiala desde Atlas: Connect, Drivers, Node.js).';
    }
    if (/[<>]/.test(uri)) {
        return 'La cadena todavía tiene el marcador de contraseña entre < >. Reemplazalo por la contraseña, sin esos símbolos.';
    }
    const credencialesYHost = uri.replace(/^mongodb(\+srv)?:\/\//, '').split('/')[0];
    if ((credencialesYHost.match(/@/g) || []).length > 1) {
        return 'La contraseña tiene un @ sin codificar. Generá una contraseña sin símbolos o codificá los símbolos.';
    }
    return null;
}

/* Traduce el error de MongoDB a una acción concreta. No usa el mensaje original. */
function explicarError(error) {
    const nombre = error && (error.codeName || error.name || '');
    const texto = String((error && error.message) || '');

    if (error.code === 18 || nombre === 'AuthenticationFailed' || /bad auth|authentication failed/i.test(texto)) {
        return 'Usuario o contraseña incorrectos. En Atlas, Database Users, editá la contraseña del usuario y copiala en el .env. Si tiene símbolos (@ : / ? # %), generá una sin símbolos.';
    }
    if (/ENOTFOUND|querySrv|EBADNAME/i.test(texto)) {
        return 'No se pudo encontrar el cluster. Revisá que la dirección esté bien copiada (termina en .mongodb.net) y que tengas internet.';
    }
    if (nombre === 'MongoServerSelectionError') {
        return 'Atlas no respondió. Lo más común: tu IP actual no está en Network Access (agregala), o el cluster está pausado.';
    }
    if (error.code === 13 || nombre === 'Unauthorized') {
        return 'El usuario se conectó pero no tiene permisos. Tiene que tener readWrite sobre la base indicada en MONGODB_DB.';
    }
    return `Error inesperado (${nombre || 'sin nombre'}). Corré de nuevo; si sigue, copiá este nombre de error.`;
}

async function probarEscritura(db) {
    const coleccion = db.collection('_prueba_conexion');
    await coleccion.insertOne({ fecha: new Date() });
    await coleccion.deleteMany({});
    await coleccion.drop().catch(() => {});
}

async function main() {
    const problema = revisarCadena(process.env.MONGODB_URI);
    if (problema) {
        console.error(`Revisá el .env: ${problema}`);
        process.exitCode = 1;
        return;
    }

    const nombreBase = process.env.MONGODB_DB || 'zapi-api2';
    let db;
    try {
        db = await connectDatabase();
        console.log(`OK conexión con Atlas, base "${nombreBase}".`);
        await probarEscritura(db);
        console.log('OK el usuario puede leer y escribir en esa base.');

        const colecciones = (await db.listCollections().toArray()).map(c => c.name);
        const hayLimites = colecciones.includes('limites');
        const productos = colecciones.includes('products') ? await db.collection('products').countDocuments() : 0;
        console.log(`Colecciones existentes: ${colecciones.length}. Productos cargados: ${productos}.`);
        if (!hayLimites) console.log('Falta: npm run backend:indices');
        if (productos === 0) console.log('Falta: npm run backend:seed');
        if (hayLimites && productos > 0) console.log('La base está lista.');
    } catch (error) {
        console.error(`Falló: ${explicarError(error)}`);
        process.exitCode = 1;
    } finally {
        await closeDatabase();
    }
}

if (require.main === module) {
    main();
}

module.exports = { explicarError, revisarCadena };
