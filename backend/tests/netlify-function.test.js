'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createFunctionHandler } = require('../../netlify/functions/api');

const config = {
    nodeEnv: 'test',
    port: 0,
    mongoUri: 'mongodb://localhost/test',
    jwtSecret: 'test-secret-that-is-at-least-32-bytes-long',
    jwtExpiresIn: '12h',
    frontendOrigins: ['https://zapiweb.netlify.app'],
    cookieName: 'zapi_session',
    cookieSameSite: 'lax',
    cookieSecure: true,
    cookieMaxAgeMs: 12 * 60 * 60 * 1000,
    trustProxy: 1,
};

function createEvent(method, path, body, headers = {}) {
    return {
        httpMethod: method,
        path,
        headers,
        queryStringParameters: null,
        body: body === undefined ? null : JSON.stringify(body),
        isBase64Encoded: false,
        requestContext: {
            identity: { sourceIp: '127.0.0.1' },
        },
    };
}

test('Netlify Function reenvia rutas API, métodos, JSON y cookies a Express', async () => {
    const connectedUris = [];
    const handler = createFunctionHandler(config, async uri => connectedUris.push(uri));
    const context = {};

    const health = await handler(
        createEvent('GET', '/.netlify/functions/api/api/health'),
        context
    );
    assert.equal(health.statusCode, 200);
    assert.deepEqual(JSON.parse(health.body), { estado: 'ok' });
    assert.equal(context.callbackWaitsForEmptyEventLoop, false);

    const unauthorized = await handler(createEvent('GET', '/api/auth/yo'));
    assert.equal(unauthorized.statusCode, 401);

    const invalidContact = await handler(createEvent(
        'POST',
        '/api/contacto',
        { nombre: 'x' },
        { 'content-type': 'application/json' }
    ));
    assert.equal(invalidContact.statusCode, 400);
    assert.ok(JSON.parse(invalidContact.body).error);

    const logout = await handler(createEvent('POST', '/api/auth/logout'));
    assert.equal(logout.statusCode, 204);
    assert.match(String(logout.headers['set-cookie']), /zapi_session=/);
    assert.match(String(logout.headers['set-cookie']), /Path=\/api/i);
    assert.match(String(logout.headers['set-cookie']), /HttpOnly/i);
    assert.match(String(logout.headers['set-cookie']), /Secure/i);
    assert.match(String(logout.headers['set-cookie']), /SameSite=Lax/i);

    const missingRoute = await handler(createEvent('GET', '/api/no-existe'));
    assert.equal(missingRoute.statusCode, 404);
    assert.deepEqual(connectedUris, Array(5).fill(config.mongoUri));
});
