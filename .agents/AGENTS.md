# Instrucciones compartidas para el proyecto ZAPI

## Contexto

ZAPI es el sitio, la API y el panel de administración de un vivero
agroecológico. El catálogo, el stock, los pedidos, las ventas presenciales,
los testimonios y el contenido editable viven en MongoDB. Hay dos roles:
`cliente` y `superadmin`. No asumas que una funcionalidad existe sin
comprobar el código.

## Principios generales

- Inspecciona el repositorio y lee su documentación antes de cambiar archivos.
- Conserva el stack y las funcionalidades existentes cuando sean adecuados.
- No inventes archivos, servicios ni resultados de pruebas.
- Realiza cambios pequeños, coherentes y verificables.
- Evita dependencias, servicios y complejidad que no aporten un beneficio claro.
- Explica en español qué cambiaste, por qué y cómo verificaste el resultado.
- No afirmes haber ejecutado pruebas si no las ejecutaste.

## Arquitectura

- `frontend/` es la raíz publicada. El HTML público y el del panel se generan
  desde `frontend/fuentes/` con `frontend/tools/construir.js`; no edites los
  HTML generados a mano.
- `frontend/tools/lib/plantilla.js` define la cabecera, el pie, los diálogos,
  el orden de estilos y scripts y el layout del panel. No dupliques esa
  estructura en las páginas.
- `backend/` es una API Express. `createApp(config)` no se conecta a Mongo:
  la conexión la hacen `server.js` y la función de Netlify.
- `backend/src/routes/` contiene la API pública y `backend/src/routes/admin/`
  el panel. Toda ruta del panel exige rol `superadmin`.
- `frontend/datos/catalogo.js` es solo la semilla del catálogo. La fuente de
  verdad es la colección `productos`.
- El carrito vive en `localStorage`, pero precios, stock y totales se
  recalculan siempre en el servidor.
- Mantén una sola hoja de tokens, una base de componentes compartidos, una
  hoja por página y `admin.css` para el panel.
- No agregues frameworks, bundlers ni dependencias de ejecución sin una
  justificación concreta.

## Datos y seguridad

- Nunca expongas secretos ni credenciales en el repositorio.
- La sesión es una cookie HttpOnly; el rol se decide en el servidor. No
  implementes autorización solo en el navegador.
- Escapa el contenido dinámico antes de insertarlo como HTML y valida los
  formularios en el navegador y en la API.
- El contenido editable usa campos fijos y rechaza HTML libre.
- No borres ni alteres datos reales ni ejecutes operaciones destructivas sin
  autorización explícita.
- Antes de eliminar código, comprueba referencias directas, dinámicas e
  indirectas.
- Las operaciones de stock deben ejecutarse dentro de una transacción.

## Interfaz y marca

- Conserva la identidad visual de ZAPI salvo que el usuario solicite cambiarla.
- Mantén los efectos hover de escritorio de las tarjetas de productos que
  muestran información al pasar el cursor.
- Comprueba diseño responsive, accesibilidad, estados de carga y error y
  navegación.
- Usa los tokens de `frontend/public/css/tokens.css` para colores,
  tipografías, radios, sombras y medidas.

## Proceso de trabajo

1. Comprender el objetivo.
2. Inspeccionar archivos y arquitectura.
3. Identificar riesgos y dependencias.
4. Proponer un plan breve para tareas complejas.
5. Implementar el cambio.
6. Ejecutar `npm test`, `npm run lint` y `npm run verificar`.
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
