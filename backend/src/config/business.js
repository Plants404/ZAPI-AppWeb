'use strict';
/* ==========================================================
   DATOS DEL NEGOCIO
   ------------------------------------------------------------
   Un solo lugar para lo que dice la marca: nombre, contacto,
   horarios, envios, pagos, servicios y promociones. Antes esto
   vivia repartido entre public/js/zapi-bot.js, los HTML y el
   README; ahora hay una fuente unica que el asistente, los
   endpoints y el front puedan leer.

   Nada de esto es secreto ni sale del entorno: son textos
   comerciales. Lo unico que hay que cuidar es no inventar datos:
   si un campo no esta confirmado (instagram, correo) se deja
   vacio y el front no lo dibuja, en vez de rellenarlo con algo
   inventado.
   ========================================================== */

const WHATSAPP = '098268560';

const NEGOCIO = {
    nombre: 'ZAPI',
    asistente: 'Brotecito',
    rubro: 'vivero agroecologico',
    descripcion:
        'Vivero agroecologico uruguayo. Plantas de interior, ' +
        'aromaticas, hortalizas, suculentas y cactus, mas servicios ' +
        'de diseno y mantenimiento de espacios verdes.',

    ubicacion: 'Canelones, Uruguay',
    horario:
        'Lunes a viernes de 9 a 18 hs y sabados de 9 a 13 hs. ' +
        'Fuera de horario respondemos lo antes posible.',

    /* Contacto. WhatsApp es el canal real del negocio (aparece en
       todos los HTML). Instagram y correo NO estan publicados en
       el sitio: quedan vacios a proposito. Completar cuando el
       negocio confirme la cuenta y el correo oficiales. */
    contacto: {
        whatsapp: WHATSAPP,
        whatsappUrl:
            `https://wa.me/${WHATSAPP}?text=` +
            encodeURIComponent('Hola ZAPI, necesito ayuda con una consulta'),
        instagram: '', // TODO: definir cuenta oficial de Instagram
        correo: '',    // TODO: definir correo oficial de contacto
    },

    envios: {
        resumen:
            'Envios a todo el Uruguay. Montevideo en 24 hs, interior ' +
            'en 48 a 72 hs, y retiro en el vivero sin costo.',
        gratisDesde: 2500,
        notas:
            'El costo de envio se calcula segun cantidad y destino y ' +
            'se coordina al confirmar el pedido.',
    },

    pagos: [
        'Efectivo',
        'Transferencia bancaria',
        'Tarjetas de credito y debito',
    ],

    factura: 'Emitimos factura electronica sin costo adicional.',

    servicios: [
        'Asesoramiento personalizado',
        'Diseno de jardines y huertas familiares',
        'Seleccion de especies segun tu espacio',
        'Mantenimiento de espacios verdes',
        'Proyectos para empresas e instituciones',
        'Capacitaciones y talleres',
    ],

    club: {
        nombre: 'Club ZAPI',
        reglas:
            'Por cada $1.000 de compra sumas 100 puntos. 500 puntos = ' +
            '10% de descuento, 1.000 puntos = 12% y 1.500 puntos = 15%. ' +
            'Los puntos no vencen.',
    },

    cuidados:
        'Cada compra incluye una guia de cuidados digital. Antes de ' +
        'regar, revisa la humedad del sustrato; ubica cada especie ' +
        'segun su necesidad de luz y no riegues de mas las suculentas ' +
        'ni los cactus.',

    promociones: [
        {
            titulo: '10% en tu primera compra',
            detalle:
                'Con el codigo ZAPI10 tenes 10% de descuento en tu ' +
                'primera compra en la web.',
            codigo: 'ZAPI10',
        },
        {
            titulo: 'Envio gratis',
            detalle:
                'En compras superiores a $2.500 el envio a Montevideo y ' +
                'area metropolitana no tiene costo.',
            codigo: null,
        },
        {
            titulo: 'Club ZAPI',
            detalle:
                'Con 1.500 puntos acumulados te corresponde un 15% de ' +
                'descuento en tu proxima compra.',
            codigo: null,
        },
    ],
};

module.exports = { NEGOCIO, WHATSAPP };
