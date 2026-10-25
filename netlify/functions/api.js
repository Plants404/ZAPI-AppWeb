'use strict';

const serverless = require('serverless-http');
const { createApp } = require('../../backend/src/app');
const { ensureDatabaseConnected } = require('../../backend/src/database');
const { loadConfig, validateConfig } = require('../../backend/src/config');

function createFunctionHandler(config = loadConfig(), connect = ensureDatabaseConnected) {
    validateConfig(config);
    const expressHandler = serverless(createApp(config), {
        basePath: '/.netlify/functions/api',
    });

    return async function handler(event, context) {
        if (context) context.callbackWaitsForEmptyEventLoop = false;
        await connect(config.mongoUri);
        return expressHandler(event, context);
    };
}

let defaultHandler;

async function handler(event, context) {
    if (!defaultHandler) defaultHandler = createFunctionHandler();
    return defaultHandler(event, context);
}

module.exports = { createFunctionHandler, handler };
