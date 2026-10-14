

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

/* La ruta se calcula desde la ubicacion de este script, no desde la
   pagina. Asi catalogo.html (en la raiz) y las fichas de productos/
   resuelven el mismo public/data/productos.json, y sigue andando si el
   sitio cuelga de un subpath, como en GitHub Pages. Una ruta relativa a
   la pagina no sirve: ../data apunta a /data, que no existe y ademas
   esta bloqueado en el servidor. */
function urlDelCatalogo() {

    const script = document.currentScript;

    if (script && script.src) {
        return new URL("../data/productos.json", script.src).href;
    }

    return "public/data/productos.json";

}

function cargarCatalogo() {

    const url = urlDelCatalogo();

    fetch(url)
        .then(respuesta => {
            if (!respuesta.ok) {
                throw new Error("HTTP " + respuesta.status);
            }
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
            console.error("No se pudo cargar el catalogo:", {
                url: url,
                status: error && error.status,
                message: error && error.message
            });
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

/* Stock de demostracion: sin backend (preview, GitHub Pages) cada
   producto arranca con STOCK_DEMO unidades. Lo que el cliente ya pidio
   se acumula en localStorage para que el descuento sobreviva a una
   recarga. Con backend, la verdad es el servidor y estos contadores no
   se aplican. */
const CLAVE_STOCK_CONSUMIDO = "zapiStockConsumido";
const STOCK_DEMO = 10;

let stockConsumido = leerStockConsumido();
let stockDesdeBackend = false;

function leerStockConsumido() {
    try {
        const bruto = JSON.parse(localStorage.getItem(CLAVE_STOCK_CONSUMIDO));
        return bruto && typeof bruto === "object" ? bruto : {};
    } catch (error) {
        console.warn("No se pudo leer el stock consumido:", error);
        return {};
    }
}

function guardarStockConsumido() {
    try {
        localStorage.setItem(CLAVE_STOCK_CONSUMIDO, JSON.stringify(stockConsumido));
    } catch (error) {
        console.warn("No se pudo guardar el stock consumido:", error);
    }
}

function unidadesDeDemo(id) {
    const consumido = Number(stockConsumido[String(id)]) || 0;
    return Math.max(0, STOCK_DEMO - consumido);
}

function unidadesDe(id) {

    const clave = String(id);

    return Object.prototype.hasOwnProperty.call(STOCK, clave)
        ? STOCK[clave]
        : null;

}

function textoDeStock(unidades) {

    if (unidades <= 0) return "No hay stock";

    if (unidades === 1) return "1 disponible";

    return unidades + " disponibles";

}

function pintarStockDe(elemento) {

    const unidades = unidadesDe(elemento.dataset.stock);

    elemento.hidden = false;

    if (unidades === null) {
        elemento.textContent = "Consultando stock...";
        elemento.classList.remove("agotado", "pocas");
        return;
    }

    elemento.textContent = textoDeStock(unidades);
    elemento.classList.toggle("agotado", unidades <= 0);
    elemento.classList.toggle("pocas", unidades > 0 && unidades <= 3);

}

function pintarStockEnPantalla() {

    document.querySelectorAll("[data-stock]").forEach(pintarStockDe);

}

/* Descuenta del stock mostrado las cantidades que el cliente acaba de
   pedir. Con backend el servidor ya lo hizo (y el refresco siguiente
   trae el valor real); el descuento inmediato evita ver unidades
   viejas hasta ese refresco. Sin backend, ademas se persiste en
   localStorage para que el descuento sobreviva a la recarga. */
function descontarStockPedido(items) {

    if (!Array.isArray(items) || items.length === 0) return;

    for (const item of items) {

        if (!item) continue;

        const id = String(item.id ?? item.producto_id);
        const cantidad = Number(item.cantidad) || 0;

        if (!id || id === "undefined" || cantidad <= 0) continue;

        const actual = Object.prototype.hasOwnProperty.call(STOCK, id)
            ? STOCK[id]
            : unidadesDeDemo(id);

        STOCK[id] = Math.max(0, actual - cantidad);

        if (!stockDesdeBackend) {
            stockConsumido[id] = (Number(stockConsumido[id]) || 0) + cantidad;
        }

    }

    if (!stockDesdeBackend) guardarStockConsumido();

    pintarStockEnPantalla();

}

/* El camino inverso de descontarStockPedido: al cancelar un pedido se
   devuelven las unidades. Sin backend tambien se descuenta lo que el
   pedido habia sumado a "consumido", para que la recarga lo refleje. */
function devolverStockPedido(items) {

    if (!Array.isArray(items) || items.length === 0) return;

    for (const item of items) {

        if (!item) continue;

        const id = String(item.id ?? item.producto_id);
        const cantidad = Number(item.cantidad) || 0;

        if (!id || id === "undefined" || cantidad <= 0) continue;

        if (stockDesdeBackend) {
            STOCK[id] = (Number(STOCK[id]) || 0) + cantidad;
        } else {
            stockConsumido[id] = Math.max(0, (Number(stockConsumido[id]) || 0) - cantidad);
            STOCK[id] = unidadesDeDemo(id);
        }

    }

    if (!stockDesdeBackend) guardarStockConsumido();

    pintarStockEnPantalla();

}

/* Rellena el stock con el valor de demostracion: sin backend es el
   unico dato que hay. Se usa al arrancar y cuando falla el fetch. */
function aplicarStockDeDemostracion() {
    try {
        const elementos = document.querySelectorAll("[data-stock]");
        const ids = new Set();

        elementos.forEach(el => {
            if (el.dataset.stock) ids.add(String(el.dataset.stock));
        });

        if (ids.size > 0) {
            ids.forEach(id => {
                STOCK[id] = unidadesDeDemo(id);
            });
        } else if (typeof PRODUCTOS !== "undefined" && Array.isArray(PRODUCTOS)) {
            PRODUCTOS.forEach(p => {
                if (p && p.id !== null && p.id !== undefined) STOCK[String(p.id)] = unidadesDeDemo(p.id);
            });
        }

        pintarStockEnPantalla();
    } catch (e) {
        console.warn("No se pudo aplicar el stock de demostracion", e);
    }
}

function cargarStock() {

    /* Sin backend (Show Preview, hosting estatico): el stock es el de
       demostracion, no se llama a la API. */
    const fnHayApi = window.hayApiConfigurada;
    if (typeof fnHayApi === "function" && !fnHayApi()) {
        stockDesdeBackend = false;
        aplicarStockDeDemostracion();
        return Promise.resolve();
    }

    return fetch(window.urlApi("/api/stock"))
        .then(respuesta => {
            if (!respuesta.ok) throw new Error("el servidor devolvio " + respuesta.status);
            return respuesta.json();
        })
        .then(cuerpo => {

            const stock = cuerpo && cuerpo.stock;

            if (!stock || typeof stock !== "object") return;

            stockDesdeBackend = true;

            STOCK = {};

            Object.keys(stock).forEach(id => {

                const unidades = Number(stock[id]);

                if (Number.isFinite(unidades)) STOCK[id] = unidades;

            });

            pintarStockEnPantalla();

        })
        .catch(error => {
            console.warn("No se pudo cargar el stock:", error);
            stockDesdeBackend = false;
            if (Object.keys(STOCK).length === 0) aplicarStockDeDemostracion();
        });

}

document.addEventListener("visibilitychange", function () {

    if (document.visibilityState === "visible") cargarStock();

});

window.actualizarStock = cargarStock;
window.descontarStockPedido = descontarStockPedido;
window.devolverStockPedido = devolverStockPedido;

cargarStock();

   function normalizarCarrito(carrito) {

       return carrito.map(item => {

           const producto = PRODUCTOS.find(p => p.id === Number(item.id));

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

       const idProducto = Number(id);

       const auth = window.zapiAuth;

       if (auth && !auth.autenticado) {

           auth.listo.then(function () {

               if (auth.autenticado) agregarProductoAlCarrito(id);
               else auth.exigirCuenta();

           });

           return;

       }

       const producto = PRODUCTOS.find(p => p.id === idProducto);

       if (!producto) return;

       const carrito = obtenerCarrito();

       const existente = carrito.find(item => item.id === producto.id);

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
