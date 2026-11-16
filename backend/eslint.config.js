const g = require('globals');

/* Reglas del backend: Node con CommonJS. */
module.exports = [
    { ignores: ['node_modules/**'] },
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'commonjs',
            globals: { ...g.node, self: 'readonly' }
        },
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-undef': 'error'
        }
    }
];
