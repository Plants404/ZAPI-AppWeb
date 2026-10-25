'use strict';

require('dotenv').config();

function parseBoolean(value, fallback) {
    if (value === undefined || value === '') return fallback;
    return value.toLowerCase() === 'true';
}

function loadConfig(environment = process.env) {
    const nodeEnv = environment.NODE_ENV || 'development';
    const sameSite = (environment.COOKIE_SAME_SITE || (nodeEnv === 'production' ? 'none' : 'lax')).toLowerCase();
    const secureCookie = parseBoolean(environment.COOKIE_SECURE, nodeEnv === 'production');

    if (!['strict', 'lax', 'none'].includes(sameSite)) {
        throw new Error('COOKIE_SAME_SITE debe ser strict, lax o none.');
    }

    if (sameSite === 'none' && !secureCookie) {
        throw new Error('COOKIE_SECURE debe ser true cuando COOKIE_SAME_SITE=none.');
    }

    return {
        nodeEnv,
        port: Number(environment.PORT) || 5501,
        mongoUri: environment.MONGODB_URI || '',
        jwtSecret: environment.JWT_SECRET || '',
        jwtExpiresIn: environment.JWT_EXPIRES_IN || '12h',
        frontendOrigins: (environment.FRONTEND_ORIGINS || 'http://localhost:5500,http://127.0.0.1:5500')
            .split(',')
            .map(origin => origin.trim())
            .filter(Boolean),
        cookieName: 'zapi_session',
        cookieSameSite: sameSite,
        cookieSecure: secureCookie,
        cookieMaxAgeMs: 12 * 60 * 60 * 1000,
        trustProxy: Number(environment.TRUST_PROXY) || 0,
        requiereCuenta: parseBoolean(environment.REQUIERE_CUENTA, true),
        registroPublico: parseBoolean(environment.REGISTRO_PUBLICO, nodeEnv === 'test'),
    };
}

function createOriginValidator(config) {
    const allowedOrigins = new Set(config.frontendOrigins);
    const allowLocalhostPorts = config.nodeEnv !== 'production';

    return function isAllowedOrigin(origin) {
        if (!origin) return true;
        if (allowedOrigins.has(origin)) return true;
        if (!allowLocalhostPorts) return false;

        try {
            const parsed = new URL(origin);
            return parsed.origin === origin
                && parsed.protocol === 'http:'
                && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');
        } catch {
            return false;
        }
    };
}

function validateConfig(config) {
    if (!config.mongoUri) {
        throw new Error('Falta MONGODB_URI en el entorno.');
    }

    if (Buffer.byteLength(config.jwtSecret, 'utf8') < 32) {
        throw new Error('JWT_SECRET debe tener al menos 32 bytes.');
    }

    if (config.frontendOrigins.length === 0) {
        throw new Error('FRONTEND_ORIGINS debe incluir al menos un origen.');
    }
}

module.exports = { createOriginValidator, loadConfig, validateConfig };
