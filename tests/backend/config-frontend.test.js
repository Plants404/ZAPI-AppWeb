'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { runInNewContext } = require('node:vm');
const { test } = require('node:test');

const configSource = readFileSync(
    path.join(__dirname, '../../public/js/config.js'),
    'utf8'
);

function resolveApiBase(hostname, port = '') {
    const window = {
        location: { hostname, port },
        localStorage: {
            getItem() { return null; },
            setItem() {},
        },
    };
    const document = {
        currentScript: null,
        querySelector() { return null; },
    };

    runInNewContext(configSource, { URL, document, window });
    return {
        apiBase: window.API_BASE,
        configured: window.hayApiConfigurada(),
        url: window.urlApi('/api/health'),
    };
}

test('usa la API local solo para hosts locales', () => {
    assert.deepEqual(resolveApiBase('localhost', '5500'), {
        apiBase: 'http://localhost:5501',
        configured: true,
        url: 'http://localhost:5501/api/health',
    });
    assert.deepEqual(resolveApiBase('127.0.0.1', '5500'), {
        apiBase: 'http://127.0.0.1:5501',
        configured: true,
        url: 'http://127.0.0.1:5501/api/health',
    });
    assert.equal(resolveApiBase('::1', '5500').apiBase, 'http://[::1]:5501');
});

test('usa rutas relativas en produccion y con netlify dev', () => {
    for (const [hostname, port] of [['zapiweb.netlify.app', ''], ['localhost', '8888']]) {
        assert.deepEqual(resolveApiBase(hostname, port), {
            apiBase: '',
            configured: true,
            url: '/api/health',
        });
    }
});

test('conserva el override de runtime', () => {
    const window = {
        __ZAPI_API__: 'https://api.example.com/',
        location: { hostname: 'zapiweb.netlify.app', port: '' },
        localStorage: { getItem() { return null; }, setItem() {} },
    };
    const document = { currentScript: null, querySelector() { return null; } };
    runInNewContext(configSource, { URL, document, window });

    assert.equal(window.API_BASE, 'https://api.example.com');
});

test('conserva el override del meta zapi-api', () => {
    const window = {
        location: { hostname: 'zapiweb.netlify.app', port: '' },
        localStorage: { getItem() { return null; }, setItem() {} },
    };
    const document = {
        currentScript: null,
        querySelector() { return { content: 'https://meta.example.com/' }; },
    };
    runInNewContext(configSource, { URL, document, window });

    assert.equal(window.API_BASE, 'https://meta.example.com');
});
