

const escaparHTML = valor => String(valor ?? "").replace(/[&<>"']/g, caracter => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
}[caracter]));

let PRODUCTOS = [];

const esperandoElCatalogo = [];

let catalogoCargado = false;

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

/* Ruta absoluta: las fichas viven en productos/ y una relativa se rompe. */
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

function avisarCatalogoNoCargado() {

    const grilla = document.getElementById("productGrid");
    if (!grilla) return;

    const aviso = document.createElement("p");
    aviso.className = "catalog-empty";

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

cargarCatalogo();

function formatearPrecio(value) {
    return new Intl.NumberFormat("es-UY", {
        style: "currency",
        currency: "UYU",
        maximumFractionDigits: 0
    }).format(value);
}

let STOCK = {};

function unidadesDe(id) {

    const clave = String(id);

    return Object.prototype.hasOwnProperty.call(STOCK, clave)
        ? STOCK[clave]
        : null;

}

function textoDeStock(unidades) {

    if (unidades <= 0) return "Sin stock";

    if (unidades === 1) return "Queda 1 unidad";

    return "Quedan " + unidades + " unidades";

}

function pintarStockDe(elemento) {

    const unidades = unidadesDe(elemento.dataset.stock);

    if (unidades === null) {

        elemento.hidden = true;
        elemento.textContent = "";

        return;

    }

    elemento.hidden = false;
    elemento.textContent = textoDeStock(unidades);
    elemento.classList.toggle("agotado", unidades <= 0);
    elemento.classList.toggle("pocas", unidades > 0 && unidades <= 3);

}

function pintarStockEnPantalla() {

    document.querySelectorAll("[data-stock]").forEach(pintarStockDe);

}

function cargarStock() {

    return fetch("/api/stock")
        .then(respuesta => {
            if (!respuesta.ok) throw new Error("el servidor devolvio " + respuesta.status);
            return respuesta.json();
        })
        .then(cuerpo => {

            const stock = cuerpo && cuerpo.stock;

            if (!stock || typeof stock !== "object") return;

            STOCK = {};

            Object.keys(stock).forEach(id => {

                const unidades = Number(stock[id]);

                if (Number.isFinite(unidades)) STOCK[id] = unidades;

            });

            pintarStockEnPantalla();

        })
        .catch(error => {
            console.warn("No se pudo cargar el stock:", error);
        });

}

document.addEventListener("visibilitychange", function () {

    if (document.visibilityState === "visible") cargarStock();

});

window.actualizarStock = cargarStock;

cargarStock();

   function normalizarCarrito(carrito) {

       return carrito.map(item => {

           const producto = PRODUCTOS.find(p => p.id == item.id);

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

   const suscriptoresDelCarrito = [];

   function suscribirAlCarrito(fn) {
       suscriptoresDelCarrito.push(fn);
   }

   function avisarCambioDelCarrito() {
       suscriptoresDelCarrito.forEach(fn => fn());
   }

   function agregarProductoAlCarrito(id) {

       const auth = window.zapiAuth;

       if (auth && !auth.autenticado) {

           auth.listo.then(function () {

               if (auth.autenticado) agregarProductoAlCarrito(id);
               else auth.exigirCuenta();

           });

           return;

       }

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

document.addEventListener("modal:agregar", function (evento) {

    agregarProductoAlCarrito(evento.detail.id);

});
  function actualizarContador(animar) {

      const total = obtenerCarrito().reduce(
          (suma, item) => suma + item.cantidad, 0
      );

      const navCarrito = document.getElementById("navLinkCarrito");

      if (navCarrito) {

          navCarrito.setAttribute(
              "aria-label",
              total === 1
                  ? "Carrito, 1 producto"
                  : `Carrito, ${total} productos`
          );

      }

      document.querySelectorAll("[data-cart-count]").forEach((badge) => {

          badge.textContent = total;

          badge.classList.toggle("con-productos", total > 0);

          if (!animar) return;

          /* Sacar, forzar reflow y volver a poner: si no, no se repite. */
          badge.classList.remove("pop", "destello");

          void badge.offsetWidth;

          badge.classList.add("pop", "destello");

      });

  }

  document.addEventListener("animationend", (evento) => {

      const badge = evento.target;

      if (!badge || !badge.hasAttribute) return;

      if (!badge.hasAttribute("data-cart-count")) return;

      if (evento.animationName !== "destelloContador") return;

      badge.classList.remove("pop", "destello");

  });

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

/* iOS deja el AudioContext suspendido si se crea en el click: se crea en el primer gesto. */
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

    const filtro = ctx.createBiquadFilter();

    filtro.type = "lowpass";
    filtro.frequency.setValueAtTime(3200, t0);

    filtro.connect(maestro);
    maestro.connect(ctx.destination);

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

const precios = {};

PRODUCTOS.forEach(producto => {
    precios[producto.id] = producto.precioBase;
});

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

    if (imagen.dataset.fallbackImagen === "si") return;

    imagen.dataset.fallbackImagen = "si";

    imagen.src = IMAGEN_FALLBACK;

    if (!imagen.alt) imagen.alt = "Imagen no disponible";

}, true);
