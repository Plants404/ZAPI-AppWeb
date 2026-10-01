/* ==========================================================
   CATÁLOGO COMPARTIDO ZAPI
   Datos de productos con precios fijos.
   Lo cargan tanto catalogo.html como carrito.html.
   ========================================================== */


/* ==========================================================
   ESCAPAR TEXTO PARA EL DOM
   ------------------------------------------------------------
   Todo texto que venga del visitante (o del almacenamiento)
   tiene que pasar por acá antes de entrar en un innerHTML.
   Escapar el texto es lo seguro; permitir HTML sin sanitize
   seria abrir la puerta a XSS.
   ========================================================== */

const escaparHTML = valor => String(valor ?? "").replace(/[&<>"']/g, caracter => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
}[caracter]));


/* ==========================================================
   PRODUCTOS
   ========================================================== */

const PRODUCTOS = [
    {
        id: 1,
        nombre: "Albahaca",
        categoria: "Aromáticas",
        imagen: "./public/img/albahaca.opt.jpg",
        imagenes: [
            "./public/img/albahaca.opt.jpg"
        ],
        descripcion: "Fresca y perfumada, ideal para huertas en macetas.",
        precioBase: 150,
        infoDeVenta: [
            "Mata de 20 cm lista para plantar",
            "Rinde + de 8 semanas de cosecha continua",
            "Incluye guía de cuidados digital"
        ]
    },
    {
        id: 2,
        nombre: "Rúcula",
        categoria: "Hortalizas",
        imagen: "./public/img/ruucula.opt.jpg",
        imagenes: [
            "./public/img/ruucula.opt.jpg"
        ],
        descripcion: "Tierna y picante, lista para tus ensaladas.",
        precioBase: 120,
        infoDeVenta: [
            "Resiembra: hasta 4 cortes por planta",
            "Cultivo 100% agroecológico",
            "Incluye guía de cuidados digital"
        ]
    },
    {
        id: 3,
        nombre: "Suculenta",
        categoria: "Plantas de interior",
        imagen: "./public/img/suculenta1.opt.jpg",
        imagenes: [
            "./public/img/suculenta1.opt.jpg",
            "./public/img/suculenta4.2.opt.jpg",
            "./public/img/suculenta4.1.opt.jpg",
            "./public/img/suculenta4.opt.jpg",
            "./public/img/suculenta3.2.opt.jpg",
            "./public/img/suculenta3.1.opt.jpg",
            "./public/img/suculenta3.opt.jpg",
            "./public/img/suculenta2.opt.jpg",
            "./public/img/suculentas2.1.opt.jpg"
        ],
        descripcion: "Resistente, ideal para interiores luminosos.",
        precioBase: 180,
        infoDeVenta: [
            "Viene en maceta cerámica",
            "Riego: 1 vez cada 15 días",
            "Ideal para principiantes"
        ]
    },
    {
        id: 4,
        nombre: "Cactus",
        categoria: "Plantas de interior",
        imagen: "./public/img/cactus1.opt.jpg",
        imagenes: [
            "./public/img/cactus1.opt.jpg",
            "./public/img/cactus4.opt.jpg",
            "./public/img/cactus5.opt.jpg",
            "./public/img/cactus3.opt.jpg",
            "./public/img/cactus2.opt.jpg"
        ],
        descripcion: "Decorativo y de fácil mantenimiento.",
        precioBase: 220,
        infoDeVenta: [
            "Viene en maceta cerámica",
            "Soporta largos períodos sin riego",
            "Purifica el aire de tu hogar"
        ]
    },
    {
        id: 5,
        nombre: "Suculentas mix",
        categoria: "Combo",
        imagen: "./public/img/almacigosuculentas.opt.jpg",
        imagenes: [
            "./public/img/almacigosuculentas.opt.jpg",
            "./public/img/almacigosuculentas2.opt.jpg"
        ],
        descripcion: "Una selección de suculentas para tu hogar.",
        precioBase: 90,
        infoDeVenta: [
            "Pack de 6 variedades surtidas",
            "30% más económico que por unidad",
            "Incluye caja de regalo"
        ]
    },
    {
        id: 6,
        nombre: "Cretona",
        categoria: "Plantas de interior",
        imagen: "./public/img/cretona.opt.jpg",
        imagenes: [
            "./public/img/cretona.opt.jpg"
        ],
        descripcion: "Hojas coloridas para espacios con luz indirecta.",
        precioBase: 320,
        infoDeVenta: [
            "Viene en maceta decorativa",
            "Hojas rojas, crema y verde",
            "Incluye guía de cuidados digital"
        ]
    },
    {
        id: 7,
        nombre: "Kit de huerta sustentable",
        categoria: "Kits",
        imagen: "./public/img/kit_de_huerta_zapi.opt.jpg",
        imagenes: [
            "./public/img/kit_de_huerta_zapi.opt.jpg",
            "./public/img/kit_de_huerta_zapi_2.opt.jpg",
            "./public/img/kit_de_huerta_zapi3.opt.jpg",
            "./public/img/kit_de_huerta_zapi4.opt.jpg",
            "./public/img/kit_de_huerta_zapi5.opt.jpg"
        ],
        descripcion: "Semillas, sustrato y guía para tu primera huerta.",
        precioBase: 650,
        infoDeVenta: [
            "Semillas, sustrato y macetas para empezar",
            "Guía de cultivo paso a paso",
            "Embalaje reciclable, sin plástico de un solo uso"
        ]
    }
];


/* ==========================================================
   FORMATO DE DINERO
   ------------------------------------------------------------
   Un solo lugar donde se decide como se ve un precio. Lo usan
   el catalogo, el carrito y la ventana de detalle, asi que
   "$ 150" se escribe siempre igual en toda la pagina.
   Intl se ocupa del separador de miles y del simbolo segun
   el pais; sin decimales porque el vivero no los maneja.
   ========================================================== */

function formatearPrecio(value) {
    return new Intl.NumberFormat("es-UY", {
        style: "currency",
        currency: "UYU",
        maximumFractionDigits: 0
    }).format(value);
}


/* ==========================================================
   CARRITO COMPARTIDO
   ------------------------------------------------------------
   Aca vive la unica definicion de como se lee, se modifica y
   se guarda "zapiCart". Cuando catalogo y carrito conviven en
   la misma pagina (index.html) cada uno tiene su propia vista
   de los datos; si cada uno escribiera por su cuenta, el
   ultimo en guardar pisaria lo que sumo el otro. Por eso solo
   este archivo escribe, y el resto se avisa con
   suscribirAlCarrito.
   ========================================================== */

   /* Recupera el item guardado a partir del catalogo. Las
      versiones anteriores del sitio guardaban solo {id, precio,
      cantidad} y con rutas de imagen viejas, asi que los datos
      que faltan o quedaron desactualizados se completan con los
      del producto en vez de romper la pagina. */

   function normalizarCarrito(carrito) {

       return carrito.map(item => {

           const producto = PRODUCTOS.find(p => p.id == item.id);

           /* Un id que ya no existe en el catalogo no se
              puede dibujar: antes se colaba en la lista y
              terminaba mostrando "undefined" y una imagen
              rota. Se descarta y el resto del carrito sigue. */
           if (!producto) return null;

           return {
               id: producto.id,
               nombre: producto.nombre,
               categoria: producto.categoria,
               imagen: producto.imagen,
               precio: Number.isFinite(Number(item.precio))
                   ? Number(item.precio)
                   : precios[producto.id] ?? producto.precioBase,
               cantidad: Math.max(1, Number(item.cantidad) || 1)
           };

       }).filter(Boolean);

   }


   /* ==========================================================
      ALMACENAMIENTO DEL CARRITO
      ------------------------------------------------------------
      En modo privado, con cookies de terceros bloqueadas o
      con la cuota llena, localStorage puede lanzar. Sin este
      rodeo, obtenerCarrito() rompia la pagina entera. Ahora
      el carrito sigue funcionando en memoria durante la
      sesion, solo que no sobrevive a la recarga.
      ========================================================== */

   let carritoSinGuardar = null;

   function leerCarritoGuardado() {

       try {
           return JSON.parse(localStorage.getItem("zapiCart")) || [];
       } catch (error) {
           console.warn("No se pudo leer el carrito guardado:", error);
           return [];
       }

   }

   function guardarCarrito(carrito) {

       try {
           localStorage.setItem("zapiCart", JSON.stringify(carrito));
       } catch (error) {
           carritoSinGuardar = carrito;
           console.warn("El carrito no se pudo guardar, se mantiene solo en memoria:", error);
       }

   }

   function obtenerCarrito() {

       if (carritoSinGuardar) return normalizarCarrito(carritoSinGuardar);

       const guardado = leerCarritoGuardado();

       if (!Array.isArray(guardado)) return [];

       return normalizarCarrito(guardado);

   }


/* ==========================================================
   AVISAR QUE CAMBIO EL CARRITO
   ------------------------------------------------------------
   Quien dibuja una lista de productos (el carrito) se
   suscribe para redibujarse; quien solo muestra un numero
   alcanza con la llamada directa a actualizarContador.
   ========================================================== */

   const suscriptoresDelCarrito = [];

   function suscribirAlCarrito(fn) {
       suscriptoresDelCarrito.push(fn);
   }

   function avisarCambioDelCarrito() {
       suscriptoresDelCarrito.forEach(fn => fn());
   }


/* ==========================================================
   SUMAR UN PRODUCTO
   ------------------------------------------------------------
   El camino unico para agregar, para que el boton de la
   tarjeta, el de la recomendacion y el de la ventana de
   detalle hagan exactamente lo mismo. Suma la unidad, deja el
   contador al dia, suena y avisa a los suscriptores.
   ========================================================== */

   function agregarProductoAlCarrito(id) {

       const producto = PRODUCTOS.find(p => p.id == id);

       if (!producto) return;

       const carrito = obtenerCarrito();

       const existente = carrito.find(item => item.id == producto.id);

       if (existente) {

           existente.cantidad += 1;

       } else {

           carrito.push({
               id: producto.id,
               nombre: producto.nombre,
               categoria: producto.categoria,
               imagen: producto.imagen,
               precio: precios[producto.id] ?? producto.precioBase,
               cantidad: 1
           });

       }

       guardarCarrito(carrito);

       actualizarContador(true);
       sonidoAgregar();
       avisarCambioDelCarrito();

   }


/* El boton de la ventana de detalle dispara "modal:agregar".
   Se escucha una sola vez, aca, y no en cada pagina: con las dos
   paginas cargadas en index.html un solo clic sumaba dos
   unidades. */

document.addEventListener("modal:agregar", function (evento) {

    agregarProductoAlCarrito(evento.detail.id);

});
  function actualizarContador(animar) {

      const total = obtenerCarrito().reduce(
          (suma, item) => suma + item.cantidad, 0
      );

      /* El enlace del header anuncia la cantidad: su globo está
         marcado como aria-hidden para no leerla dos veces. */

      const navCarrito = document.getElementById("navLinkCarrito");

      if (navCarrito) {

          navCarrito.setAttribute(
              "aria-label",
              total === 1
                  ? "Carrito, 1 producto"
                  : `Carrito, ${total} productos`
          );

      }

      /* Los dos globos (header y botón flotante) se actualizan
         siempre juntos. */

      document.querySelectorAll("[data-cart-count]").forEach((badge) => {

          badge.textContent = total;

          /* Con productos el contador queda rojo; si el carrito se
             vacía se quita la clase y el color vuelve por la
             transición. En el header eso además lo muestra. */

          badge.classList.toggle("con-productos", total > 0);

          if (!animar) return;

          /* Para que la animación corra de nuevo hay que sacarla,
             forzar el reflow y volver a ponerla. */

          badge.classList.remove("pop", "destello");

          void badge.offsetWidth;

          badge.classList.add("pop", "destello");

      });

  }

  /* Se registra una sola vez a nivel de documento. Si el destello
     termina, sus clases se van y el fondo queda en manos de
     "con-productos", sin cambios visibles porque el último keyframe
     ya es el mismo rojo. */

  document.addEventListener("animationend", (evento) => {

      const badge = evento.target;

      if (!badge || !badge.hasAttribute) return;

      if (!badge.hasAttribute("data-cart-count")) return;

      if (evento.animationName !== "destelloContador") return;

      badge.classList.remove("pop", "destello");

  });


/* ==========================================================
   CONFIRMACION SONORA
   ------------------------------------------------------------
   El "pop" que suena al sumar un producto. Va aca, y no en una
   de las paginas, porque las dos lo necesitan: el boton de la
   tarjeta del catalogo, el boton de la tarjeta de
   recomendaciones y el "Agregar al carrito" de la ventana
   flotante terminan todos en la misma suma.

   Se sintetiza con Web Audio en vez de cargar un archivo: no
   suma bytes ni peticiones, y el tono se ajusta cambiando las
   dos frecuencias de "notas".

   El contexto se crea en el primer toque y no en el primer clic: en
   iOS Safari el clic llega despues del gesto y ya no cuenta como
   gesto del usuario, asi que un contexto creado ahi queda suspendido
   y el primer "pop" no suena. Por eso despertarAudio() lo crea en
   el pointerdown. Si despues queda suspendido (se puede pasar con un
   alt-tab) se reanuda; si el navegador no soporta Web Audio se
   devuelve null y el carrito sigue funcionando igual, solo que
   en silencio.

   Hay un interruptor global: guarda la eleccion en localStorage
   y arranca con el sonido apagado si la persona prefiero menos
   animacion o ya lo habia apagado antes. El boton vive en el
   header, asi que el mismo switch sirve en las tres paginas.
   ========================================================== */

const CLAVE_SONIDO = "zapiSonido";

function sonidoHabilitado() {

    try {

        if (localStorage.getItem(CLAVE_SONIDO) === "off") return false;

    } catch (error) {

        /* Sin almacenamiento no se puede recordar la eleccion, pero
           tampoco hay que romper nada: se sigue con la preferencia
           del sistema. */

    }

    /* prefers-reduced-motion se extiende a sonido por el mismo
       motivo: si la persona pidio menos movimiento, lo mas
       probable es que no quiera un tono en cada accion. */

    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

}

function aplicarEstadoSonido(activo) {

    document.documentElement.classList.toggle("sonido-off", !activo);

    const boton = document.getElementById("sonidoToggle");

    if (!boton) return;

    boton.setAttribute("aria-pressed", String(activo));
    boton.setAttribute("aria-label",
        activo ? "Desactivar sonidos" : "Activar sonidos");

    /* El nombre del icono es lo unico que cambia en la pantalla,
       asi que se dibuja desde el estado y no queda una segunda
       fuente de verdad que se pueda desincronizar. */

    const icono = boton.querySelector("[data-sonido-icono]");

    if (icono) {
        icono.textContent = activo ? "volume_up" : "volume_off";
    }

}

function cambiarSonido(activo) {

    try {
        localStorage.setItem(CLAVE_SONIDO, activo ? "on" : "off");
    } catch (error) {
        /* si no se puede guardar, el cambio dura hasta recargar */
    }

    aplicarEstadoSonido(activo);

}

let audioZapi = null;

function contextoAudio() {

    if (!audioZapi) {

        const Contexto = window.AudioContext || window.webkitAudioContext;

        if (!Contexto) return null;

        audioZapi = new Contexto();

    }

    if (audioZapi.state === "suspended") audioZapi.resume();

    return audioZapi;

}

/* iOS Safari entrega el gesto como pointerdown o touchstart, y el
   click llega despues, ya afuera del gesto. Si el AudioContext se
   creara adentro del click del boton, el navegador lo dejaria
   suspended y el primer "pop" del carrito no sonaria: habria que
   tocar dos veces.

   Este listener crea y reanuda el contexto en el primer toque de la
   pagina, con captura para correr antes que cualquier otro handler.
   Es de un solo uso: apenas entra, se saca de los tres eventos, y si
   el sonido esta apagado ni siquiera crea el contexto. Se escucha
   keydown tambien, para que el boton funcione con Enter o Espacio
   desde el teclado. */

function despertarAudio() {

    document.removeEventListener("pointerdown", despertarAudio, true);
    document.removeEventListener("touchstart", despertarAudio, true);
    document.removeEventListener("keydown", despertarAudio, true);

    if (!sonidoHabilitado()) return;

    contextoAudio();

}

document.addEventListener("pointerdown", despertarAudio, true);
document.addEventListener("touchstart", despertarAudio, true);
document.addEventListener("keydown", despertarAudio, true);

function sonidoAgregar() {

    if (!sonidoHabilitado()) return;

    const ctx = contextoAudio();

    if (!ctx) return;

    const t0 = ctx.currentTime;

    const maestro = ctx.createGain();

    maestro.gain.value = 0.18;

    /* Pasa los agudos para que el tono no salga aspero. */

    const filtro = ctx.createBiquadFilter();

    filtro.type = "lowpass";
    filtro.frequency.setValueAtTime(3200, t0);

    filtro.connect(maestro);
    maestro.connect(ctx.destination);

    /* Dos notas ascendentes: se percibe como "sumado". */

    const notas = [[587.33, 0], [880, 0.09]];

    notas.forEach(([frecuencia, arranque]) => {

        const inicio = t0 + arranque;

        const osc = ctx.createOscillator();

        osc.type = "sine";
        osc.frequency.setValueAtTime(frecuencia, inicio);

        const env = ctx.createGain();

        env.gain.setValueAtTime(0.0001, inicio);
        env.gain.exponentialRampToValueAtTime(0.9, inicio + 0.015);
        env.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.3);

        osc.connect(env);
        env.connect(filtro);

        osc.start(inicio);
        osc.stop(inicio + 0.32);

    });

}


/* ==========================================================
   INTERRUPTOR DE SONIDO
   ------------------------------------------------------------
   Se engancha solo en las paginas que tienen el boton. El estado
   se aplica al <html> con la clase sonido-off, y el boton refleja
   si el sonido esta activo con aria-pressed.
   ========================================================== */

document.addEventListener("DOMContentLoaded", function () {

    const boton = document.getElementById("sonidoToggle");

    if (!boton) return;

    /* Se aplica el estado guardado antes de que suene nada. */

    aplicarEstadoSonido(sonidoHabilitado());

    boton.addEventListener("click", function () {

        cambiarSonido(!sonidoHabilitado());

    });

});


/* ==========================================================
   PRECIOS FIJOS
   El precio de cada producto es siempre
   su precioBase, sin variaciones.
   ========================================================== */

const precios = {};

PRODUCTOS.forEach(producto => {
    precios[producto.id] = producto.precioBase;
});


/* ==========================================================
   IMAGENES QUE NO CARGAN
   ------------------------------------------------------------
   Un producto puede quedar con una foto que ya no esta en el
   servidor, o con una ruta mal escrita. Antes eso dejaba el
   icono de imagen rota del navegador adentro del marco, con el
   fondo gris y el texto alt al lado.

   Se escucha el evento "error" de forma global y se cambia la
   foto por un marcador con los colores de la marca. Va con
   data: URI para no sumar un request a un archivo que solo se
   usa cuando algo ya salio mal.

   El evento "error" no burbujea, asi que hace falta capturarlo
   en la fase de captura: un listener comun en <img> o en su
   contenedor padre no lo veria.
   ========================================================== */

const IMAGEN_FALLBACK = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150" ' +
    'preserveAspectRatio="xMidYMid meet">' +
    '<rect width="120" height="150" fill="#f7f4ec"/>' +
    '<path d="M60 96V58" stroke="#4a7c59" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M60 74c-16 0-24-10-24-24 14-2 24 6 24 24Z" fill="#4a7c59"/>' +
    '<path d="M60 84c16 0 24-10 24-24-14-2-24 6-24 24Z" fill="#2f5c3c"/>' +
    '<path d="M36 116h48" stroke="#2f5c3c" stroke-width="3" stroke-linecap="round"/>' +
    '</svg>'
);

document.addEventListener("error", (evento) => {

    const imagen = evento.target;

    if (!(imagen instanceof HTMLImageElement)) return;

    /* La marca evita el bucle: si el propio marcador fallara,
       el evento vuelve a disparar el handler. */

    if (imagen.dataset.fallbackImagen === "si") return;

    imagen.dataset.fallbackImagen = "si";

    imagen.src = IMAGEN_FALLBACK;

    /* Si la foto original no tenia texto alternativo, el marcador
       no aporta nada, asi que se deja claro que no hay imagen. */

    if (!imagen.alt) imagen.alt = "Imagen no disponible";

}, true);
