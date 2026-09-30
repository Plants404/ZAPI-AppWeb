
// Inicialización cuando el DOM está completamente cargado
document.addEventListener('DOMContentLoaded', () => {
  inicializarNavegacion();
});

//Configura los escuchadores de eventos y determina la sección inicial.
function inicializarNavegacion() {
  // Delegación de eventos para cualquier elemento con el atributo data-section
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-section]');
    if (!trigger) return;

    event.preventDefault();
    const sectionId = trigger.getAttribute('data-section');
    if (sectionId) {
      mostrarSeccion(sectionId);
    }
  });

  // Soporte para botones de avance y retroceso del navegador (historial)
  window.addEventListener('popstate', (event) => {
    const seccionId = event.state?.sectionId || window.location.hash.replace('#', '') || 'inicio';
    mostrarSeccion(seccionId, false);
  });

  // Carga de la vista inicial (por hash de URL si existe, o 'inicio' por defecto)
  const hashInicial = window.location.hash.replace('#', '');
  const seccionInicial = hashInicial && document.getElementById(hashInicial) ? hashInicial : 'inicio';
  mostrarSeccion(seccionInicial, false);
}

/**
 * Muestra la sección correspondiente al ID recibido y oculta todas las demás.
 * @param {string} id - Identificador de la sección a mostrar.
 * @param {boolean} [actualizarHistorial=true] - Indica si debe sincronizarse con el historial del navegador.
 */
function mostrarSeccion(id, actualizarHistorial = true) {
  if (!id || typeof id !== 'string') return;

  const secciones = document.querySelectorAll('.section');
  const seccionObjetivo = document.getElementById(id);

  // Evitar errores si el ID no existe en el DOM
  if (!seccionObjetivo) {
    console.warn(`[Navegación] La sección con ID "${id}" no existe.`);
    return;
  }

  /* Un lector de pantalla no se entera de nada: la sección
     anterior y la nueva tienen el mismo rol de landmarks y el
     foco sigue en el link que se acaba de tocar. Se anuncia
     el cambio por un region live y se lleva el foco al titulo
     de la nueva sección. Solo cuando el cambio viene de un
     click, no en la carga inicial, para no robar el foco. */
  const cambioPorClick = actualizarHistorial && document.activeElement &&
    document.activeElement !== document.body;

  // 1. Ocultar todas las secciones agregando la clase .hidden
  secciones.forEach((seccion) => {
    seccion.classList.add('hidden');
  });

  // 2. Mostrar únicamente la sección seleccionada eliminando .hidden
  seccionObjetivo.classList.remove('hidden');

  // 3. Sincronizar el estado activo visual y los atributos ARIA en la navegación
  actualizarNavegacionActiva(id);

  // 4. Sincronizar URL e historial de navegación (sin recargar la página)
  if (actualizarHistorial && window.location.hash !== `#${id}`) {
    window.history.pushState({ sectionId: id }, '', `#${id}`);
  }

  // 5. Desplazamiento suave al inicio de la página para una mejor UX
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // 6. Avisar y mover el foco a la sección nueva (solo si hubo click)
  if (cambioPorClick) {
    anunciarCambioDeSeccion(seccionObjetivo);
  }
}

/* El foco va al encabezado de la sección, no a la sección misma:
   así el siguiente Tab sigue bajando por el contenido y no vuelve
   al header. tabindex="-1" hace que se pueda enfocar sin que el
   elemento entre en el orden de tabulación. */
function anunciarCambioDeSeccion(seccion) {
  const titulo = seccion.querySelector('h1, h2');

  if (titulo && !titulo.hasAttribute('tabindex')) {
    titulo.setAttribute('tabindex', '-1');
  }

  if (titulo) {
    titulo.focus({ preventScroll: true });
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

  const nombre = titulo ? titulo.textContent.trim() : id;
  region.textContent = `Sección ${nombre}`;
}

// Actualiza la clase 'active' y los atributos ARIA (aria-current) en los controles de navegación.
// @param {string} idActivo - Identificador de la sección actualmente visible.
function actualizarNavegacionActiva(idActivo) {
  const controles = document.querySelectorAll('[data-section]');

  controles.forEach((control) => {
    const esActivo = control.getAttribute('data-section') === idActivo;

    // Solo aplicamos la clase active a elementos de navegación 
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
