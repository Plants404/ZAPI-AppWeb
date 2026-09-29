/* ==========================================================
   CATÁLOGO COMPARTIDO ZAPI
   Datos de productos con precios fijos.
   Lo cargan tanto catalogo.html como carrito.html.
   ========================================================== */


/* ==========================================================
   PRODUCTOS
   ========================================================== */

const PRODUCTOS = [
    {
        id: 1,
        nombre: "Albahaca",
        categoria: "Aromáticas",
        imagen: "./asset/img/albahaca.JPG",
        imagenes: [
            "./asset/img/albahaca.JPG"
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
        imagen: "./asset/img/ruucula.JPG",
        imagenes: [
            "./asset/img/ruucula.JPG"
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
        imagen: "./asset/img/suculenta1.JPG",
        imagenes: [
            "./asset/img/suculenta1.JPG",
            "./asset/img/suculenta4.2.JPG",
            "./asset/img/suculenta4.1.JPG",
            "./asset/img/suculenta4.JPG",
            "./asset/img/suculenta3.2.JPG",
            "./asset/img/suculenta3.1.JPG",
            "./asset/img/suculenta3.JPG",
            "./asset/img/suculenta2.JPG",
            "./asset/img/suculentas2.1.JPG"
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
        imagen: "./asset/img/cactus1.JPG",
        imagenes: [
            "./asset/img/cactus1.JPG",
            "./asset/img/cactus4.JPG",
            "./asset/img/cactus5.JPG",
            "./asset/img/cactus3.JPG",
            "./asset/img/cactus2.JPG"
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
        imagen: "./asset/img/almacigosuculentas.JPG",
        imagenes: [
            "./asset/img/almacigosuculentas.JPG",
            "./asset/img/almacigosuculentas2.JPG"
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
        imagen: "./asset/img/cretona.JPG",
        imagenes: [
            "./asset/img/cretona.JPG"
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
        imagen: "./asset/img/kit_de_huerta_zapi.jpg",
        imagenes: [
            "./asset/img/kit_de_huerta_zapi.jpg"
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
   Lectura y escritura de "zapiCart", la misma clave que usa
   carrito.js. Vive aca para que las dos paginas compartan una
   sola definicion de como se guarda un producto.

   Cada pagina guarda lo que necesita: el catalogo solo id,
   precio y cantidad; el carrito ademas nombre, categoria e
   imagen para poder dibujar el pedido.
   ========================================================== */

function obtenerCarrito() {
    return JSON.parse(localStorage.getItem("zapiCart")) || [];
}

function guardarCarrito(carrito) {
    localStorage.setItem("zapiCart", JSON.stringify(carrito));
}
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

   El contexto se crea en el primer clic porque los navegadores
   no dejan sonar nada antes de que el usuario toque la pagina.
   Si el contexto queda suspendido (se puede pasar con un
   alt-tab) se reanuda; si el navegador no soporta Web Audio se
   devuelve null y el carrito sigue funcionando igual, solo que
   en silencio.
   ========================================================== */

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

function sonidoAgregar() {

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
   PRECIOS FIJOS
   El precio de cada producto es siempre
   su precioBase, sin variaciones.
   ========================================================== */

const precios = {};

PRODUCTOS.forEach(producto => {
    precios[producto.id] = producto.precioBase;
});
