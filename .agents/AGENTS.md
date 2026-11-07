# Instrucciones compartidas para el proyecto ZAPI

## Contexto

ZAPI es el sitio estático del vivero agroecológico ZAPI, sin backend, sin
autenticación y sin panel de administración. El catálogo, el stock, los
pedidos, el contacto y los testimonios funcionan enteramente en el navegador.
No asumas que una funcionalidad existe sin comprobar el código.

## Principios generales

- Inspecciona el repositorio y lee su documentación antes de cambiar archivos.
- Conserva el stack estático y las funcionalidades existentes cuando sean
  adecuados.
- No inventes archivos, servicios ni resultados de pruebas.
- Realiza cambios pequeños, coherentes y verificables.
- Evita dependencias, servicios y complejidad que no aporten un beneficio claro.
- Explica en español qué cambiaste, por qué y cómo verificaste el resultado.
- No afirmes haber ejecutado pruebas si no las ejecutaste.

## Arquitectura

- `frontend/` es la raíz publicada. El HTML público se genera desde
  `frontend/fuentes/paginas/` con `frontend/tools/construir.js`; no edites los
  HTML generados a mano.
- `frontend/tools/lib/plantilla.js` define la cabecera, el pie, los diálogos,
  el orden de estilos y scripts. No dupliques esa estructura en las páginas.
- `frontend/datos/catalogo.js` es la única fuente de productos, precios,
  slugs y stock. El stock se mantiene a mano y nunca se descuenta desde el
  navegador.
- `frontend/datos/testimonios.js` es la lista manual de testimonios publicados
  (puede estar vacía).
- El carrito vive en `localStorage`. Los pedidos se validan en el cliente, se
  guardan en `localStorage` (“Mis pedidos”) y se envían por WhatsApp.
- El contacto y los testimonios usan EmailJS con marcadores `PEGAR_*`; si falta
  configuración o falla el envío, se abre WhatsApp precargado como respaldo.
- Mantén una hoja de tokens (`tokens.css`), una base de componentes
  compartidos (`base.css`, `estructura.css`) y una hoja por página.
- No agregues frameworks, bundlers ni dependencias de ejecución sin una
  justificación concreta. ESLint es solo una herramienta de desarrollo.

## Datos y seguridad

- Nunca expongas secretos ni credenciales en el repositorio.
- Escapa el contenido dinámico antes de insertarlo como HTML y valida los
  formularios en el navegador.
- No hay sesión ni autenticación; no hay referencias internas a `/api`,
  `login`, `admin` ni `mongo`.
- Antes de eliminar código, comprueba referencias directas, dinámicas e
  indirectas.

## Interfaz y marca

- Conserva la identidad visual de ZAPI salvo que el usuario solicite cambiarla.
- Usa los tokens de `frontend/public/css/tokens.css` para colores, tipografías,
  radios, sombras y medidas.
- Los breakpoints CSS son solo 600, 768 y 1024 px. `!important` solo se usa
  para `[hidden]`.
- Cabecera y pie idénticos en todas las páginas; la portada tiene solo hero,
  destacados y testimonios; `index.html` debe tener menos de 350 líneas.

## Proceso de trabajo

1. Comprender el objetivo.
2. Inspeccionar archivos y arquitectura.
3. Identificar riesgos y dependencias.
4. Proponer un plan breve para tareas complejas.
5. Implementar el cambio.
6. Ejecutar `npm run lint` y `npm run verificar`.
7. Informar archivos modificados, pruebas ejecutadas y pendientes.

Pregunta antes de acciones destructivas, irreversibles, con costos, que
publiquen información o que afecten producción. No hagas preguntas cuya
respuesta pueda obtenerse inspeccionando el proyecto.

## Colaboración entre agentes

- El agente principal coordina el trabajo y evita que dos agentes editen
  simultáneamente los mismos archivos.
- Usa especialistas solo cuando aporten valor.
- Trata las recomendaciones de los subagentes como hallazgos que deben
  verificarse contra el repositorio.
- Antes de cerrar una tarea, revisa la integración y los posibles efectos
  secundarios.
