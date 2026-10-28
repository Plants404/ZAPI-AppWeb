# Agentes de OpenCode para Zapi

Este paquete contiene ocho agentes personalizados para OpenCode y un archivo `AGENTS.md` con reglas comunes del proyecto.

## Contenido

- `AGENTS.md`: reglas compartidas para todos los agentes.
- `.opencode/agents/fullstack-architect.md`: agente principal de arquitectura y coordinación.
- `.opencode/agents/frontend-ux-ui.md`: frontend y experiencia de usuario.
- `.opencode/agents/backend-api.md`: backend y APIs.
- `.opencode/agents/database-specialist.md`: bases de datos.
- `.opencode/agents/security-auditor.md`: auditoría de seguridad de solo lectura.
- `.opencode/agents/testing-qa.md`: pruebas y calidad.
- `.opencode/agents/devops-deploy.md`: despliegue e infraestructura.
- `.opencode/agents/ecommerce-seo.md`: comercio electrónico y SEO.

## Instalación en un proyecto existente

1. Haz una copia de seguridad o crea una rama Git antes de modificar el proyecto.
2. Descomprime el paquete.
3. Copia la carpeta `.opencode/` a la raíz del repositorio Zapi.
4. Copia `AGENTS.md` a la raíz del repositorio. Si ya existe, no lo sobrescribas sin revisar y combinar las instrucciones.
5. Copia `README-INSTALACION.md` o incorpora sus instrucciones al README principal.
6. Abre una terminal en la raíz del proyecto y ejecuta:

   ```bash
   opencode agent list
   ```

7. Inicia OpenCode:

   ```bash
   opencode
   ```

8. Usa `@frontend-ux-ui`, `@backend-api`, `@database-specialist`, `@security-auditor`, `@testing-qa`, `@devops-deploy` o `@ecommerce-seo` para solicitar un especialista. Para una tarea general, selecciona el agente principal `fullstack-architect` mediante el selector de agentes.

## Uso sugerido

- Arquitectura y tareas generales: `fullstack-architect`
- Mejorar tarjetas de producto sin perder el hover de escritorio: `@frontend-ux-ui`
- API o lógica del servidor: `@backend-api`
- Modelos o consultas: `@database-specialist`
- Auditoría antes de publicar: `@security-auditor`
- Verificación de cambios: `@testing-qa`
- Configuración de publicación: `@devops-deploy`
- Catálogo y SEO: `@ecommerce-seo`

## Notas importantes

- Los agentes no ejecutan tareas por sí solos en segundo plano: se invocan desde OpenCode o los coordina el agente principal si las capacidades y permisos de la instalación lo permiten.
- Los agentes heredan el modelo de la sesión cuando no se configura un modelo específico.
- La disponibilidad de herramientas y el comportamiento de permisos pueden variar según la versión de OpenCode. Verifica con `opencode agent list`.
- No se incluye un `opencode.json` para evitar sobrescribir la configuración actual del usuario.
- El auditor de seguridad tiene permiso de edición denegado para mantenerlo en modo de revisión.
- Revisa los cambios y ejecuta pruebas antes de desplegar.
