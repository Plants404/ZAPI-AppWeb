'use strict';

const express = require('express');
const Testimonio = require('../../models/Testimonio');
const { registrarAuditoria } = require('../../utils/auditoria');
const {
    esIdMongo,
    escaparRegex,
    paginacion,
    texto,
} = require('../../utils/validacion');

const ESTADOS = ['pendiente', 'aprobado', 'rechazado'];

function testimonioAdmin(testimonio) {
    return {
        id: String(testimonio._id),
        autor: testimonio.autor,
        lugar: testimonio.lugar,
        texto: testimonio.texto,
        estrellas: testimonio.estrellas,
        estado: testimonio.estado,
        motivoRechazo: testimonio.motivoRechazo,
        productoId: testimonio.productoId,
        fecha: testimonio.createdAt,
        usuario: testimonio.usuario && typeof testimonio.usuario === 'object'
            ? {
                id: String(testimonio.usuario._id),
                nombre: testimonio.usuario.nombre,
                email: testimonio.usuario.email,
            }
            : testimonio.usuario
                ? String(testimonio.usuario)
                : null,
    };
}

function createTestimoniosAdminRouter() {
    const router = express.Router();

    router.get('/', async (request, response, next) => {
        try {
            const { pagina, limite, salto } = paginacion(request.query);
            const filtro = {};

            if (ESTADOS.includes(request.query.estado)) filtro.estado = request.query.estado;

            const busqueda = texto(request.query.q);

            if (busqueda) {
                const patron = new RegExp(escaparRegex(busqueda), 'i');
                filtro.$or = [{ autor: patron }, { texto: patron }, { lugar: patron }];
            }

            const [testimonios, total] = await Promise.all([
                Testimonio.find(filtro)
                    .populate('usuario', 'nombre email')
                    .sort({ createdAt: -1 })
                    .skip(salto)
                    .limit(limite)
                    .lean(),
                Testimonio.countDocuments(filtro),
            ]);

            return response.status(200).json({
                testimonios: testimonios.map(testimonioAdmin),
                total,
                pagina,
                paginas: Math.max(1, Math.ceil(total / limite)),
            });
        } catch (error) {
            return next(error);
        }
    });

    router.patch('/:id', async (request, response, next) => {
        try {
            if (!esIdMongo(request.params.id)) {
                return response.status(404).json({ error: 'Testimonio no encontrado.' });
            }

            const body = request.body || {};
            const cambios = {};

            if (body.estado !== undefined) {
                const estado = texto(body.estado);

                if (!ESTADOS.includes(estado)) {
                    return response.status(400).json({ error: 'El estado no es válido.', campo: 'estado' });
                }

                cambios.estado = estado;
            }

            if (body.autor !== undefined) {
                const autor = texto(body.autor);
                if (autor.length < 2 || autor.length > 120) {
                    return response.status(400).json({ error: 'El autor debe tener entre 2 y 120 caracteres.', campo: 'autor' });
                }
                cambios.autor = autor;
            }

            if (body.lugar !== undefined) {
                const lugar = texto(body.lugar);
                if (lugar.length > 120) {
                    return response.status(400).json({ error: 'El lugar no puede superar 120 caracteres.', campo: 'lugar' });
                }
                cambios.lugar = lugar;
            }

            if (body.texto !== undefined) {
                const contenido = texto(body.texto);
                if (contenido.length < 10 || contenido.length > 600) {
                    return response.status(400).json({ error: 'El texto debe tener entre 10 y 600 caracteres.', campo: 'texto' });
                }
                cambios.texto = contenido;
            }

            if (body.estrellas !== undefined) {
                const estrellas = Number(body.estrellas);
                if (!Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) {
                    return response.status(400).json({ error: 'El puntaje debe ser un entero entre 1 y 5.', campo: 'estrellas' });
                }
                cambios.estrellas = estrellas;
            }

            if (body.motivoRechazo !== undefined) {
                const motivo = texto(body.motivoRechazo);
                if (motivo.length > 300) {
                    return response.status(400).json({ error: 'El motivo no puede superar 300 caracteres.', campo: 'motivoRechazo' });
                }
                cambios.motivoRechazo = motivo || null;
            }

            if (!Object.keys(cambios).length) {
                return response.status(400).json({ error: 'No hay cambios para guardar.' });
            }

            const testimonio = await Testimonio.findByIdAndUpdate(
                request.params.id,
                { $set: cambios },
                { returnDocument: 'after', runValidators: true }
            )
                .populate('usuario', 'nombre email')
                .lean();

            if (!testimonio) return response.status(404).json({ error: 'Testimonio no encontrado.' });

            await registrarAuditoria({
                actor: request.user,
                accion: cambios.estado ? `moderar-${cambios.estado}` : 'editar',
                entidad: 'testimonio',
                entidadId: testimonio._id,
                detalle: { autor: testimonio.autor, cambios },
            });

            return response.status(200).json({ testimonio: testimonioAdmin(testimonio) });
        } catch (error) {
            return next(error);
        }
    });

    return router;
}

module.exports = { createTestimoniosAdminRouter };
