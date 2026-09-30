/* ==========================================================
   BUSCADOR DEL HEADER
   ------------------------------------------------------------
   El input del header escribe en el filtro de catalogo.js por
   medio de window.aplicarBusqueda. Aca solo se maneja el
   formulario: el boton de limpiar, Enter, Escape, el aviso
   para lectores de pantalla y el salto al catalogo cuando el
   visitante escribe desde otra seccion.

   Al filtrar no se cambia la URL: el buscador es una ayuda
   para recorrer el catalogo, no una pagina propia, asi que
   no ensucia el historial con una entrada por tecla.
   ========================================================== */

(function () {

  const formulario = document.getElementById("headerSearch");
  const input = document.getElementById("searchInput");
  const botonLimpiar = document.getElementById("searchClear");
  const aviso = document.getElementById("searchStatus");
  const catalogo = document.getElementById("catalogo");

  /* En una pagina sin catalogo (por ejemplo carrito.html) el
     buscador no tiene nada que filtrar, asi que no se monta. */
  if (!formulario || !input || !window.aplicarBusqueda) return;

  const escribir = texto => {
    input.value = texto;
    const hay = texto.length > 0;
    if (botonLimpiar) botonLimpiar.hidden = !hay;
  };

  /* Escribe un texto distinto al actual y recien despues avisa.
     Un lector de pantalla solo anuncia si el texto cambia de
     verdad, asi que repetir "3 productos" cada tecla no sirve
     de nada. */
  const anunciar = texto => {
    if (!aviso) return;
    if (aviso.textContent === texto) return;
    aviso.textContent = texto;
  };

  const plural = (n, singular, pluralForma) => n === 1 ? singular : pluralForma;

  const buscar = texto => {
    const encontrados = window.aplicarBusqueda(texto);

    const limpio = texto.trim();
    escribir(texto);

    /* Si no hay nada, el mensaje lo pone la grilla. El aviso
       solo confirma cuando hay resultados, y en el catalogo
       exacto (sin filtro de categoría) para no mentir. */
    if (limpio && encontrados > 0) {
      anunciar(`${encontrados} ${plural(encontrados, "producto", "productos")} para "${limpio}".`);
    } else if (!limpio) {
      anunciar("");
    }

    return encontrados;
  };

  input.addEventListener("input", function () {
    buscar(input.value);
  });

  /* Escribir arriba del catalogo, en otra seccion, no se ve
     nada pasar. Se lleva la vista al catalogo la primera vez
     que hay algo escrito, no en cada tecla, porque mover el
     scroll mientras se escribe es molesto. */
  let yaSaltoAlCatalogo = false;

  const irAlCatalogo = () => {
    if (yaSaltoAlCatalogo || !catalogo) return;
    if (!catalogo.classList.contains("hidden")) return;

    yaSaltoAlCatalogo = true;

    /* En index.html el catálogo es una sección y se enruta con el
       botón de la barra. En catalogo.html la página ya es el
       catálogo, así que el id no está oculto y no hay nada que
       hacer. */
    const botonCatalogo = document.querySelector('.nav-link[data-section="catalogo"]');
    if (botonCatalogo) botonCatalogo.click();
  };

  input.addEventListener("focus", irAlCatalogo);
  input.addEventListener("input", irAlCatalogo);

  /* Al cambiar de sección el catálogo deja de estar visible: se
     rearma el salto para que la próxima búsqueda lo vuelva a
     abrir. Al llegar al catálogo con el botón, en cambio, ya no
     hace falta el salto. */
  document.addEventListener("click", function (event) {
    const boton = event.target.closest("[data-section]");
    if (!boton) return;
    yaSaltoAlCatalogo = boton.dataset.section === "catalogo";
  });

  if (botonLimpiar) {
    botonLimpiar.addEventListener("click", function () {
      escribir("");
      buscar("");
      anunciar("");
      /* El foco vuelve al campo: si se queda en el botón que ya
         no está, el siguiente tab se pierde. */
      input.focus();
    });
  }

  /* Escape limpia el campo, pero solo si hay algo escrito: si
     está vacío lo esperable es cerrar el menú, y eso ya lo
     maneja menu.js. */
  input.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && input.value.length > 0) {
      event.stopPropagation();
      event.preventDefault();
      escribir("");
      buscar("");
      anunciar("");
    }
  });

  /* catalogo.js llama a esto cuando su propio botón de limpiar
     (el del estado vacío) apaga la búsqueda. */
  window.refrescarCampoBuscador = escribir;

  /* El botón "Enviar" implícito no debe recargar la página. */
  formulario.addEventListener("submit", function (event) {
    event.preventDefault();
  });

})();
