'use strict';

/* Ruta pública que entrega la versión ya publicada del contenido del sitio. */

const express = require('express');
const { HttpError } = require('../lib/http-error.js');

function crearRouterPublicado(getDatabase) {
    const router = express.Router();

    router.get('/publicado', async (req, res) => {
        const publicado = await getDatabase().collection('configuracionPublicada')
            .findOne({ _id: 'publicado' });
        if (!publicado) {
            throw new HttpError(404, 'No hay versión publicada.');
        }

        const camposPublicos = [
            'id', 'slug', 'nombre', 'categoria', 'imagen', 'imagenes',
            'descripcion', 'precioBase', 'stock', 'destacado', 'infoDeVenta'
        ];
        const camposEstilo = ['titulo', 'subtitulo', 'boton', 'tipografia', 'botones'];
        const coloresPublicos = ['primario', 'secundario', 'acento'];
        const estilo = Object.fromEntries(
            camposEstilo
                .filter(campo => publicado.estilo && publicado.estilo[campo] !== undefined)
                .map(campo => [campo, publicado.estilo[campo]])
        );
        const colores = Object.fromEntries(
            coloresPublicos
                .filter(campo => publicado.estilo?.colores?.[campo] !== undefined)
                .map(campo => [campo, publicado.estilo.colores[campo]])
        );
        if (Object.keys(colores).length) estilo.colores = colores;

        res.json({
            version: publicado.version,
            estilo,
            contenido: publicado.contenido || {},
            catalogo: (publicado.catalogo || [])
                .filter(producto => producto.active !== false && producto.visible !== false)
                .map(producto => Object.fromEntries(
                    camposPublicos
                        .filter(campo => producto[campo] !== undefined)
                        .map(campo => [campo, producto[campo]])
                )),
            publicadoEn: publicado.publicadoEn
        });
    });

    return router;
}

module.exports = { crearRouterPublicado };
