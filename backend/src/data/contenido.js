'use strict';

/* Contenido editable del sitio. Cada sección tiene campos fijos: el panel
   nunca guarda HTML libre. Estos valores son el respaldo público mientras
   la colección `contenidos` todavía no fue sembrada. */

const CONTENIDO_POR_DEFECTO = Object.freeze({
    negocio: {
        nombre: 'ZAPI',
        descripcion: 'Vivero agroecológico en Montevideo.',
        whatsapp: '59898268560',
        whatsappVisible: '098 268 560',
        email: 'hola@zapi.uy',
        direccion: 'Congreso de Abril, Montevideo, Uruguay',
        horario: 'Visitas coordinadas previamente por WhatsApp.',
        sitio: 'https://zapi.uy',
    },
    portada: {
        etiqueta: 'Vivero agroecológico · Montevideo',
        titulo: 'Transformamos espacios con naturaleza.',
        subtitulo: 'En ZAPI conectamos a las personas con la naturaleza a través de soluciones agroecológicas integrales.',
        imagen: 'public/img/plants-hero.opt.jpg',
        sello: 'Envío gratis desde $2.500',
        beneficios: [
            'Plantas de calidad, cuidadosamente seleccionadas.',
            'Asesoramiento profesional, paso a paso.',
            'Cuidado simple para que tu espacio prospere.',
        ],
    },
    servicios: {
        etiqueta: 'Servicios',
        titulo: 'Soluciones para cada proyecto.',
        descripcion: 'Además de vender plantas, te ayudamos a planificar, desarrollar y mantener espacios verdes de forma eficiente.',
        items: [
            { icono: 'support_agent', titulo: 'Asesoramiento personalizado', texto: 'Guía paso a paso adaptada a tu espacio y tu tiempo.' },
            { icono: 'yard', titulo: 'Diseño de jardines', texto: 'Planificación estética y funcional para patios y balcones.' },
            { icono: 'agriculture', titulo: 'Huertas familiares', texto: 'Proyectamos tu huerta urbana para cosechar alimentos en casa.' },
            { icono: 'local_florist', titulo: 'Selección de especies', texto: 'Elegimos las plantas ideales según la luz y el clima de tu espacio.' },
            { icono: 'grass', titulo: 'Mantenimiento', texto: 'Podas, nutrición del suelo y control orgánico de plagas.' },
            { icono: 'apartment', titulo: 'Proyectos para empresas', texto: 'Ambientación verde para oficinas, comercios e instituciones.' },
            { icono: 'school', titulo: 'Talleres y capacitaciones', texto: 'Aprendé siembra, compostaje y cuidados paso a paso.' },
            { icono: 'request_quote', titulo: 'Propuestas a medida', texto: 'Contanos tu idea y armamos una solución personalizada.' },
        ],
    },
    nosotros: {
        etiqueta: 'Quiénes somos',
        titulo: 'Empezar tu huerta o jardín puede ser tan simple como abrir una caja.',
        descripcion: 'No solo vendemos plantas: te ayudamos a crear tu primer rincón verde y a sostenerlo en el tiempo.',
        problemaTitulo: 'La idea entusiasma. El comienzo confunde.',
        problemaTexto: 'A casi todos nos gusta tener una huerta o un jardín y cuidarlo nosotros. Pero a la hora de empezar aparecen las dudas. Compramos una planta sin saber cómo cuidarla, se nos muere y lo dejamos.',
        solucionTitulo: 'Un punto de partida pensado para principiantes.',
        solucionTexto: 'En ZAPI no te sumamos una planta más para dejarte solo. Te damos todo listo, explicado y con acompañamiento.',
        pilares: [
            { titulo: 'Kits para empezar', texto: 'Semillas orgánicas, sustrato, etiquetas y manual de cultivo. Abrís la caja y plantás.' },
            { titulo: 'Plantas para tu espacio', texto: 'Producidas con enfoque agroecológico para tu huerta o jardín.' },
            { titulo: 'Insumos para seguir', texto: 'Recargas y todo lo necesario para que tu espacio siga creciendo.' },
        ],
        razones: [
            { titulo: 'Producción propia', texto: 'Producimos con enfoque agroecológico y elegimos el resto con criterio.' },
            { titulo: 'Diseño de punta a punta', texto: 'Del logo a la maceta: cuidamos cada detalle del producto.' },
            { titulo: 'Pensado para empezar de cero', texto: 'Sin dudas ni decisiones difíciles: todo llega listo y explicado.' },
            { titulo: 'Seguimos cerca después', texto: 'Te acompañamos para que tu huerta o jardín prosperen.' },
        ],
        equipo: [
            { nombre: 'Marcio Lahouratate', rol: 'Producción y logística', texto: 'Auxiliar técnico agrario y técnico en marketing. Estudia Ingeniería Agronómica y Desarrollo de Software.' },
            { nombre: 'Pablo Souza', rol: 'Administración y contabilidad', texto: 'Auxiliar técnico administrativo. Estudia Contador Público y Técnico Administrativo.' },
        ],
    },
    contacto: {
        etiqueta: 'Contacto',
        titulo: 'Empezá hoy a transformar tus espacios.',
        descripcion: 'Contanos qué necesitás y te respondemos a la brevedad. También podés coordinar todo directamente por WhatsApp.',
        telefono: '098 268 560',
        email: 'hola@zapi.uy',
        direccion: 'Congreso de Abril, Montevideo, Uruguay',
        horario: 'Visitas coordinadas previamente por WhatsApp.',
    },
    promociones: {
        activa: false,
        titulo: '',
        texto: '',
        enlace: '',
        textoEnlace: '',
    },
});

const SECCIONES = Object.keys(CONTENIDO_POR_DEFECTO);

module.exports = { CONTENIDO_POR_DEFECTO, SECCIONES };
