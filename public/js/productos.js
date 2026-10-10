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
   EL CATALOGO
   ------------------------------------------------------------
   PRODUCTOS arranca vacio y se llena solo, bajando
   public/data/productos.json. Ese JSON lo escribe
   tools/generar-productos.js desde datos/catalogo.js, que es la
   fuente que se edita a mano.

   Por que no viene incrustado
   ----------------------------
   El catalogo estuvo un tiempo dentro de este mismo archivo, como
   un array. Servia para que la pagina abriera con doble clic. A
   cambio no habia forma de leerlo sin ejecutar el archivo entero:
   usa window y document, asi que habia que arrancarlo a mano y
   ejecutar el array con Function() solo para sacarle los datos.
   Ese era el punto mas fragil de todo el proyecto: un cambio de
   espaciado, unas comillas simples o un corchete en un comentario
   partian el catalogo.

   Ahora viaja en JSON aparte y el navegador lo pide por HTTP. El
   sitio anda de una sola forma, que es la que hace falta: por HTTP.

   Que el catalogo llegue un instante despues
   ------------------------------------------
   Antes era sincrono, ahora es un fetch. Hay codigo que lo necesita
   apenas carga la pagina y no puede esperar: es el catalogo de la
   grilla, el carrito guardado y el boton de agregar de las fichas.

   Por eso existe alCargarElCatalogo(). Se registra lo que hay que
   hacer, y el navegador lo corre en el instante en que los datos
   llegan, una sola vez. Los que dependen del catalogo usan esa
   funcion en vez de leer PRODUCTOS directo al arrancar; leerlo
   directo daria una lista vacia y, en el caso del carrito, peor:
   un carrito guardado con productos se descartaria por no
   encontrarlos en el catalogo todavia vacio.
   ========================================================== */

let PRODUCTOS = [];

/* Se suscribe lo que hay que correr cuando el catalogo este.
   Guarda las funciones para poder llamarlas todas juntas cuando el
   fetch termine, sin importar en que orden se registraron. */
const esperandoElCatalogo = [];

/* Va declarado antes de alCargarElCatalogo porque esa funcion lo
   mira: si el fetch ya termino, corre en el acto, y si no, se
   encola. */
let catalogoCargado = false;

/* Corre fn apenas el catalogo este disponible. Si ya llego, corre
   en el acto: asi da lo mismo suscribirse antes o despues del fetch.
   El try/catch es para que un fallo al dibujar una pantalla no
   cancele las demas. */
function alCargarElCatalogo(fn) {
    if (catalogoCargado) {
        try {
            fn();
        } catch (error) {
            console.error("Fallo al usar el catalogo ya cargado:", error);
        }
    } else {
        esperandoElCatalogo.push(fn);
    }
}

/* Baja el JSON y llena PRODUCTOS y precios. Cuando termina, corre
   todo lo que se haya suscrito con alCargarElCatalogo.

   La ruta es absoluta porque las fichas de producto viven en
   productos/ y si fuera relativa, desde ahi buscaria
   productos/public/data/... y no lo encontraria. */
function cargarCatalogo() {

    fetch("/public/data/productos.json")
        .then(respuesta => {
            if (!respuesta.ok) throw new Error("el servidor devolvio " + respuesta.status);
            return respuesta.json();
        })
        .then(documento => {

            const productos = documento && documento.productos;

            if (!Array.isArray(productos) || !productos.length) {
                throw new Error("el JSON del catalogo no trae productos");
            }

            PRODUCTOS = productos;

            /* precios se arma recien ahora, no al cargar el archivo.
               Antes se llenaba una vez y para siempre al tope del
               script, con lo que el catalogo ya venia entero. Con el
               fetch, si se llenara en ese momento, se quedaria
               vacio para siempre y las tarjetas del catalogo
               mostrarian el precio en blanco. */
            for (const producto of PRODUCTOS) {
                precios[producto.id] = producto.precioBase;
            }

            catalogoCargado = true;

            const funciones = esperandoElCatalogo.splice(0);
            for (const fn of funciones) {
                try {
                    fn();
                } catch (error) {
                    console.error("Fallo al dibujar con el catalogo:", error);
                }
            }

        })
        .catch(error => {
            console.error("No se pudo cargar el catalogo:", error);
            avisarCatalogoNoCargado();
        });

}

/* Si el fetch falla, la grilla y el carrito quedan con lo ultimo que
   有的. No es una pagina rota del todo -el esqueleto esta ahi- pero
   si necesita un aviso: sin productos, la grilla se dibuja vacia y
   no hay forma de que el visitante entienda por que.

   El caso que mas conviene tratar aparte es el doble clic. El
   sitio ya no anda con file:// porque el navegador le bloquea el
   fetch del catalogo por CORS, y el visitante ve una pagina sin
   productos sin ninguna pista de por que. Se le dice que sirva el
   sitio por HTTP. */
function avisarCatalogoNoCargado() {

    const grilla = document.getElementById("productGrid");
    if (!grilla) return;

    const aviso = document.createElement("p");
    aviso.className = "catalog-empty";

    /* Se arma con createElement y no con innerHTML. No hace falta
       meter HTML aca: asi el texto queda siempre escapado por el
       navegador y el escaner de XSS de verificar.js no tiene nada
       que revisar. */
    if (location.protocol === "file:") {
        aviso.appendChild(document.createTextNode(
            "Este sitio necesita servirse por HTTP para cargar el catálogo. "
            + "Abrí una terminal en la carpeta del proyecto y serví la carpeta raíz "
            + "con un servidor estático, por ejemplo "));
        aviso.appendChild(document.createElement("code")).textContent = "npx serve";
        aviso.appendChild(document.createTextNode("."));
    } else {
        aviso.textContent =
            "No pudimos cargar los productos. Recargá la página o probá de nuevo en un rato.";
    }

    grilla.innerHTML = "";
    grilla.appendChild(aviso);

}

/* El fetch arranca recien, sin await. El resto del archivo lo usa
   a traves de alCargarElCatalogo y ya no depende del momento. */
cargarCatalogo();



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

   Queda una sola forma de apagarlos y no es el sitio: si la
   persona pidio menos animacion en el sistema, lo mas probable es
   que tampoco quiera un tono en cada accion. Antes ademas habia un
   interruptor en el header de las tres paginas que guardaba la
   eleccion en localStorage; ese boton se saco y con el se fue la
   preferencia guardada.
   ========================================================== */

function sonidoHabilitado() {

    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
   Un producto puede quedar con la ruta de la foto mal escrita, o
   con el archivo borrado. Antes eso dejaba el
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
