
'use strict';

(function () {

document.addEventListener('DOMContentLoaded', () => {
  inicializarNavegacion();
});

function inicializarNavegacion() {
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-section]');
    if (!trigger) return;

    event.preventDefault();
    const sectionId = trigger.getAttribute('data-section');
    if (sectionId) {
      mostrarSeccion(sectionId);
    }
  });

  window.addEventListener('popstate', (event) => {
    const seccionId = event.state?.sectionId || window.location.hash.replace('#', '') || 'inicio';
    mostrarSeccion(seccionId, false);
  });

  const hashInicial = window.location.hash.replace('#', '');
  const seccionInicial = hashInicial && document.getElementById(hashInicial) ? hashInicial : 'inicio';
  mostrarSeccion(seccionInicial, false);
}

function mostrarSeccion(id, actualizarHistorial = true) {
  if (!id || typeof id !== 'string') return;

  const secciones = document.querySelectorAll('.section');
  const seccionObjetivo = document.getElementById(id);

  if (!seccionObjetivo) {
    console.warn(`[Navegación] La sección con ID "${id}" no existe.`);
    return;
  }

  const partes = new Set([seccionObjetivo.id]);

  /* El id viene del hash de la URL, asi que no se arma un selector
     con el: un # raro tiraria la excepcion al construirlo. Se filtra
     por atributo y se compara en codigo. */
  document.querySelectorAll('[data-parte-de]').forEach((parte) => {
    if (parte.getAttribute('data-parte-de') === seccionObjetivo.id && parte.id) {
      partes.add(parte.id);
    }
  });

  const cambioPorClick = actualizarHistorial && document.activeElement &&
    document.activeElement !== document.body;

  secciones.forEach((seccion) => {
    if (!partes.has(seccion.id)) {
      seccion.classList.add('hidden');
    }
  });

  partes.forEach((parteId) => {
    document.getElementById(parteId)?.classList.remove('hidden');
  });

  actualizarNavegacionActiva(id);

  if (actualizarHistorial && window.location.hash !== `#${id}`) {
    window.history.pushState({ sectionId: id }, '', `#${id}`);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (cambioPorClick) {
    anunciarCambioDeSeccion(seccionObjetivo);
  }
}

function anunciarCambioDeSeccion(seccion) {
  const titulo = seccion.querySelector('h1, h2');

  if (titulo) {
    if (!titulo.hasAttribute('tabindex')) {
      titulo.setAttribute('tabindex', '-1');
    }
    titulo.focus({ preventScroll: true });
    return;
  }

  let region = document.getElementById('navEstado');

  if (!region) {
    region = document.createElement('div');
    region.id = 'navEstado';
    region.className = 'visually-hidden';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    document.body.appendChild(region);
  }

  region.textContent = `Sección ${seccion.id}`;
}

function actualizarNavegacionActiva(idActivo) {
  const controles = document.querySelectorAll('[data-section]');

  controles.forEach((control) => {
    const esActivo = control.getAttribute('data-section') === idActivo;

    if (control.classList.contains('nav-link') || control.closest('.nav-bar')) {
      control.classList.toggle('active', esActivo);

      if (esActivo) {
        control.setAttribute('aria-current', 'page');
      } else {
        control.removeAttribute('aria-current');
      }
    }
  });
}

})();
