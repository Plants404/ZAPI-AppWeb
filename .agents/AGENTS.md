# Instrucciones compartidas para el proyecto Zapi

## Contexto
Zapi es un vivero que produce sosteniblemente y presenta plantas e insumos mediante una experiencia comercial tipo boutique. La plataforma puede incluir catálogo, fichas de productos, cuentas, pedidos y contenido educativo, pero no asumas que una funcionalidad existe sin comprobar el código.

## Principios generales
- Inspecciona el repositorio y lee su documentación antes de cambiar archivos.
- Conserva el stack y las funcionalidades existentes cuando sean adecuados.
- No inventes archivos, endpoints, servicios ni resultados de pruebas.
- Realiza cambios pequeños, coherentes y verificables.
- Evita dependencias, servicios y complejidad que no aporten un beneficio claro.
- Explica en español qué cambiaste, por qué y cómo verificaste el resultado.
- No afirmes haber ejecutado pruebas si no las ejecutaste.

## Arquitectura
- Mantén responsabilidades separadas entre frontend, backend, persistencia y despliegue.
- Si el proyecto lo permite, organiza frontend y backend en directorios independientes.
- El frontend consume datos mediante la API; no debe conectarse directamente a bases de datos privadas.
- Mantén controladores, servicios, modelos, validaciones y rutas separados cuando la complejidad lo justifique.
- No migres de framework, proveedor de alojamiento o base de datos sin una justificación concreta.

## Datos y seguridad
- Nunca expongas secretos, credenciales ni archivos `.env` en el frontend o en el control de versiones.
- Usa `.env.example` con valores ficticios y nombres de variables, nunca secretos reales.
- Valida entradas en el servidor y aplica autenticación/autorización según corresponda.
- No debilites CORS, cookies, sesiones ni controles de acceso para ocultar un error.
- No borres ni alteres datos reales ni ejecutes migraciones destructivas sin autorización explícita.
- Antes de eliminar código, comprueba referencias directas, dinámicas e indirectas.

## Interfaz y marca
- Conserva la identidad visual de Zapi salvo que el usuario solicite cambiarla.
- Mantén los efectos hover de escritorio de las tarjetas de productos que muestran información al pasar el cursor.
- Comprueba diseño responsive, accesibilidad, estados de carga/error y navegación.
- Prioriza una experiencia de compra clara, rápida y coherente con la propuesta sostenible de Zapi.

## Proceso de trabajo
1. Comprender el objetivo.
2. Inspeccionar archivos y arquitectura.
3. Identificar riesgos y dependencias.
4. Proponer un plan breve para tareas complejas.
5. Implementar el cambio.
6. Ejecutar pruebas pertinentes.
7. Informar archivos modificados, pruebas ejecutadas y pendientes.

Pregunta antes de acciones destructivas, irreversibles, con costos, que publiquen información o que afecten producción. No hagas preguntas cuya respuesta pueda obtenerse inspeccionando el proyecto.

## Colaboración entre agentes
- El agente principal coordina el trabajo y evita que dos agentes editen simultáneamente los mismos archivos.
- Usa especialistas solo cuando aporten valor.
- Trata las recomendaciones de los subagentes como hallazgos que deben verificarse contra el repositorio.
- Antes de cerrar una tarea, revisa la integración y los posibles efectos secundarios.
