'use strict';

const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const mongoose = require('mongoose');
const { ensureDatabaseConnected } = require('../../backend/database');

const originalConnect = mongoose.connect;

afterEach(() => {
    mongoose.connect = originalConnect;
});

test('comparte una conexión MongoDB en curso entre invocaciones', async () => {
    let calls = 0;
    mongoose.connect = async () => {
        calls += 1;
        await new Promise(resolve => setTimeout(resolve, 10));
        return mongoose;
    };

    await Promise.all([
        ensureDatabaseConnected('mongodb://localhost/test'),
        ensureDatabaseConnected('mongodb://localhost/test'),
        ensureDatabaseConnected('mongodb://localhost/test'),
    ]);

    assert.equal(calls, 1);
});

test('permite reintentar la conexión después de un error', async () => {
    let calls = 0;
    mongoose.connect = async () => {
        calls += 1;
        if (calls === 1) throw new Error('connection failed');
        return mongoose;
    };

    await assert.rejects(
        ensureDatabaseConnected('mongodb://localhost/test'),
        /connection failed/
    );
    await ensureDatabaseConnected('mongodb://localhost/test');
    assert.equal(calls, 2);
});
