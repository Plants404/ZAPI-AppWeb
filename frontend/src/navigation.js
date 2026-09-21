/**
 * ==========================================================================
 * ZAPI - Sistema de Navegación Profesional por Secciones (SPA Vanilla)
 * ==========================================================================
 * Permite alternar vistas entre secciones sin recargar la página, gestionando
 * clases de visibilidad, estados activos en el menú y accesibilidad.
 */

// Inicialización cuando el DOM está completamente cargado
document.addEventListener('DOMContentLoaded', () => {
  inicializarNavegacion();
});

/**
 * Configura los escuchadores de eventos y determina la sección inicial.
 */
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
}

/**
 * Actualiza la clase 'active' y los atributos ARIA (aria-current) en los controles de navegación.
 * @param {string} idActivo - Identificador de la sección actualmente visible.
 */
function actualizarNavegacionActiva(idActivo) {
  const controles = document.querySelectorAll('[data-section]');

  controles.forEach((control) => {
    const esActivo = control.getAttribute('data-section') === idActivo;

    // Solo aplicamos la clase active a elementos de navegación (dentro del menú o con clase nav-link)
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
