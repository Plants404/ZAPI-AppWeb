'use strict';

/* Entorno de desarrollo: API Express + servidor estático con proxy.
   Uso: npm start */

const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const procesos = [];

function iniciar(nombre, script, env = {}) {
    const proceso = spawn(process.execPath, [script], {
        cwd: rootDir,
        stdio: 'inherit',
        env: { ...process.env, ...env },
    });

    proceso.on('exit', codigo => {
        if (codigo && codigo !== 0) {
            console.error(`${nombre} terminó con código ${codigo}.`);
        }
    });

    procesos.push(proceso);
    return proceso;
}

console.log('Iniciando ZAPI: API (5501) + web (5500)...\n');

iniciar('API', path.join(rootDir, 'backend', 'server.js'));
iniciar('Web', path.join(rootDir, 'frontend', 'tools', 'servir.js'));

let cerrando = false;

function cleanup() {
    if (cerrando) return;
    cerrando = true;

    console.log('\nDeteniendo servidores...');

    for (const proceso of procesos) {
        try {
            if (!proceso.killed) proceso.kill('SIGTERM');
        } catch {
            /* El proceso ya terminó. */
        }
    }

    process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
