(function () {

  const formulario = document.getElementById("headerSearch");
  const input = document.getElementById("searchInput");
  const botonLimpiar = document.getElementById("searchClear");
  const aviso = document.getElementById("searchStatus");
  const catalogo = document.getElementById("catalogo");

  if (!formulario || !input || !window.aplicarBusqueda) return;

  const escribir = texto => {
    input.value = texto;
    const hay = texto.length > 0;
    if (botonLimpiar) botonLimpiar.hidden = !hay;
  };

  const anunciar = texto => {
    if (!aviso) return;
    if (aviso.textContent === texto) return;
    aviso.textContent = texto;
  };

  const plural = (n, singular, pluralForma) => n === 1 ? singular : pluralForma;

  const anunciarResultados = (limpio, encontrados) => {
    anunciar(limpio && encontrados > 0
      ? `${encontrados} ${plural(encontrados, "producto", "productos")} para "${limpio}".`
      : "");
  };

  const buscar = texto => {
    const encontrados = window.aplicarBusqueda(texto);

    escribir(texto);
    anunciarResultados(texto.trim(), encontrados);

    return encontrados;
  };

  input.addEventListener("input", function () {
    buscar(input.value);
  });

  let yaSaltoAlCatalogo = false;

  const irAlCatalogo = () => {
    if (yaSaltoAlCatalogo || !catalogo) return;
    if (!catalogo.classList.contains("hidden")) return;

    yaSaltoAlCatalogo = true;

    const botonCatalogo = document.querySelector('.nav-link[data-section="catalogo"]');
    if (botonCatalogo) botonCatalogo.click();
  };

  input.addEventListener("focus", irAlCatalogo);
  input.addEventListener("input", irAlCatalogo);

  document.addEventListener("click", function (event) {
    const boton = event.target.closest("[data-section]");
    if (!boton) return;
    yaSaltoAlCatalogo = boton.dataset.section === "catalogo";
  });

  if (botonLimpiar) {
    botonLimpiar.addEventListener("click", function () {
      buscar("");
      input.focus();
    });
  }

  input.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && input.value.length > 0) {
      event.stopPropagation();
      event.preventDefault();
      buscar("");
    }
  });

  window.refrescarCampoBuscador = escribir;

  window.enfocarBuscadorHeader = function () {
    input.focus();
  };

  window.refrescarContadorBuscador = function (encontrados) {
    anunciarResultados(input.value.trim(), encontrados);
  };

  formulario.addEventListener("submit", function (event) {
    event.preventDefault();
  });

  const terminoInicial = new URLSearchParams(window.location.search).get("q");
  if (terminoInicial) buscar(terminoInicial);

})();
