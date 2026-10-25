'use strict';

const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

console.log('Iniciando entorno de desarrollo ZAPI (Frontend + Backend)...\n');

const backend = spawn(npmCmd, ['start'], {
    cwd: path.join(rootDir, 'backend'),
    stdio: 'inherit',
    shell: true,
});

const frontend = spawn(npmCmd, ['start'], {
    cwd: path.join(rootDir, 'frontend'),
    stdio: 'inherit',
    shell: true,
});

function cleanup() {
    console.log('\nDeteniendo servidores...');
    try {
        if (!backend.killed) backend.kill('SIGTERM');
    } catch {}
    try {
        if (!frontend.killed) frontend.kill('SIGTERM');
    } catch {}
    process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
