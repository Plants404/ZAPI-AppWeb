'use strict';

/* Script de prueba de CORS para /api/eventos.
   Uso: node backend/probar-cors.js <url>
   Ejemplo: node backend/probar-cors.js https://api.zapi.uy */

const fetch = globalThis.fetch;

async function probarCors(url) {
    const cuerpo = JSON.stringify({
        tipo: 'vista_de_pagina',
        idSesion: 'sesion-cors-prueba',
        pagina: '/',
        dispositivo: 'computadora'
    });
    const cabecerasJson = { 'Content-Type': 'application/json' };

    console.log('═'.repeat(60));
    console.log('PRUEBA CORS contra:', url);
    console.log('═'.repeat(60));

    // Prueba 1: POST con Origin del sitio (debe responder 202)
    console.log('\n--- Prueba 1: POST /api/eventos con Origin del sitio (https://zapi.uy) ---');
    try {
        const r1 = await fetch(`${url}/api/eventos`, {
            method: 'POST',
            headers: {
                ...cabecerasJson,
                Origin: 'https://zapi.uy'
            },
            body: cuerpo
        });
        console.log('Status:', r1.status);
        console.log('Access-Control-Allow-Origin:', r1.headers.get('access-control-allow-origin'));
        console.log('Vary:', r1.headers.get('vary'));
        console.log('Cuerpo:', await r1.text());
    } catch (e) {
        console.log('Error:', e.message);
    }

    // Prueba 2: POST con Origin ajeno (debe responder 403)
    console.log('\n--- Prueba 2: POST /api/eventos con Origin ajeno (https://sitio-otro.com) ---');
    try {
        const r2 = await fetch(`${url}/api/eventos`, {
            method: 'POST',
            headers: {
                ...cabecerasJson,
                Origin: 'https://sitio-otro.com'
            },
            body: cuerpo
        });
        console.log('Status:', r2.status);
        console.log('Access-Control-Allow-Origin:', r2.headers.get('access-control-allow-origin'));
        console.log('Cuerpo:', await r2.text());
    } catch (e) {
        console.log('Error:', e.message);
    }

    // Prueba 3: OPTIONS preflight con Origin del sitio (debe responder 204)
    console.log('\n--- Prueba 3: OPTIONS /api/eventos preflight con Origin del sitio ---');
    try {
        const r3 = await fetch(`${url}/api/eventos`, {
            method: 'OPTIONS',
            headers: {
                Origin: 'https://zapi.uy',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type'
            }
        });
        console.log('Status:', r3.status);
        console.log('Access-Control-Allow-Origin:', r3.headers.get('access-control-allow-origin'));
        console.log('Access-Control-Allow-Methods:', r3.headers.get('access-control-allow-methods'));
        console.log('Access-Control-Allow-Headers:', r3.headers.get('access-control-allow-headers'));
        console.log('Vary:', r3.headers.get('vary'));
    } catch (e) {
        console.log('Error:', e.message);
    }

    console.log('\n═'.repeat(60));
    console.log('Pruebas CORS completadas.');
    console.log('═'.repeat(60));
}

const url = process.argv[2];
if (!url) {
    console.error('Uso: node backend/probar-cors.js <url>');
    console.error('Ejemplo: node backend/probar-cors.js https://api.zapi.uy');
    process.exit(1);
}

probarCors(url).catch(e => {
    console.error('Error inesperado:', e.message);
    process.exit(1);
});
