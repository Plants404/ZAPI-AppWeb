# ZAPI · Vivero agroecológico

Sitio web, tienda y panel de administración de ZAPI, un vivero sostenible de Montevideo que vende plantas ornamentales y hortícolas, kits de huerta y acompañamiento para crear espacios verdes. El proyecto permite que las personas conozcan el catálogo, armen un pedido y consulten al asistente del sitio, y que el equipo gestione productos, pedidos, mensajes, opiniones, analítica y hasta el aspecto del sitio desde un panel propio.

Sitio publicado: https://zapivivero.vercel.app

## Qué incluye

El sitio público tiene inicio, catálogo con ficha de producto, carrito y pedidos, servicios, nosotros, contacto, política de privacidad y un chat con asistente (opcional, usa Gemini). El panel de administración, en `/admin`, ofrece resumen de ventas con gráfico semanal, gestión de pedidos y ventas presenciales, catálogo con control de stock, bandeja de mensajes, moderación de testimonios, analítica de visitas, auditoría de acciones, y gestión de accesos. El diseño es responsive y se probó desde 320 px (celulares) hasta pantallas de escritorio.

## Arquitectura

ZAPI es un monorepo con dos aplicaciones independientes que se comunican por HTTP: un frontend de página única (SPA) y una API REST. No comparten código en tiempo de ejecución más allá de unos pocos módulos de datos del negocio (catálogo, precios y esquema de contenido editable) que existen una vez en `backend/compartido/` y se reflejan en el cliente, de modo que ambos lados hablan el mismo idioma.

```
Navegador ──► Vercel (frontend React, archivos estáticos)
                │
                │  /api/*  (reescritura en vercel.json: un solo dominio, cookies de sesión válidas)
                ▼
            Render (backend Express 5) ──► MongoDB Atlas
                ▲
                └── GitHub Actions (tarea diaria que anonimiza pedidos viejos)
```

El **frontend** sigue una arquitectura de componentes con enrutamiento del lado del cliente. React Router define una página por ruta, y el estado compartido (sesión, catálogo, carrito, avisos e interfaz) vive en proveedores de React Context anidados, sin librerías de estado externas. Todas las llamadas al servidor pasan por un único módulo, `api.js`, con una función por endpoint, y cada página tiene su propia hoja de estilos. El panel de administración es una sección cargada aparte, con un componente por panel.

El **backend** es una API REST en capas. `app.js` arma la aplicación como una fábrica que recibe sus dependencias (por ejemplo la conexión a la base y la función del chat), lo que permite probar toda la API sin conectarse a Atlas. Las rutas (`routes/`) solo reciben y responden; la lógica de validación, sesiones, analítica, auditoría y contenido vive en `lib/`; y `db.js` concentra el acceso a MongoDB. Los errores se tratan con una clase propia (`HttpError`) y un manejador central. La autenticación usa cookie de sesión y contraseñas con `scrypt`, y la API limita el tamaño de las peticiones y la cantidad de intentos por cliente.

El **despliegue** separa responsabilidades: Vercel sirve el frontend y reenvía `/api/*` a Render, y así el navegador ve un único dominio. Una tarea programada de GitHub Actions llama una vez por día al backend para anonimizar pedidos antiguos, y de ese modo no se guardan datos personales más tiempo del necesario.

## Tecnologías

| Capa | Tecnología |
| --- | --- |
| Frontend | React 19, React Router 7, Vite 8, JavaScript, oxlint |
| Backend | Node.js 24, Express 5, driver oficial de MongoDB, ESLint |
| Base de datos | MongoDB Atlas |
| Pruebas | Ejecutor nativo de Node (`node --test`) |
| Publicación | Vercel (frontend), Render (backend), GitHub Actions (tarea diaria) |
| Servicios opcionales | Gemini (chat del sitio), EmailJS (avisos por correo) |

## Estructura del repositorio

```
backend/
  server.js         arranque del servidor
  app.js            fábrica de la app: middleware y montaje de rutas
  db.js, conectar.js, indices.js   conexión e índices de MongoDB
  routes/           endpoints (auth, productos, pedidos, admin, chat…)
  lib/              validación, sesiones, analítica, auditoría, contenido, límites
  compartido/       catálogo, datos del negocio y esquema editable
  test/             pruebas de la API
  seed.js, crear-admin.js, depurar.js   utilidades de datos
frontend/
  src/paginas/      una página por ruta
  src/components/   piezas reutilizables (cabecera, tarjetas, modales, chat…)
  src/estado/       Context: sesión, catálogo, carrito, avisos, interfaz
  src/admin/        el panel de administración completo
  src/estilos/      una hoja de estilos por página
  src/api.js        cliente de la API
  public/img/       imágenes del sitio
.github/workflows/  tarea diaria de depuración de pedidos
render.yaml, vercel.json   configuración de publicación
```

## Requisitos

Hace falta Node.js 24 o superior con npm y una base MongoDB, por ejemplo un clúster gratuito de MongoDB Atlas. La clave de Gemini es opcional: sin ella el resto del sitio funciona igual y solo el chat queda inactivo.

## Instalación

Cada carpeta tiene sus propias dependencias, así que se instalan por separado.

```bash
git clone https://github.com/Plants404/ZAPI-AppWeb.git
cd ZAPI-AppWeb
cd backend && npm install
cd ../frontend && npm install
```

## Configuración

En el backend, copiá `backend/.env.example` a `backend/.env` y completá al menos `MONGODB_URI` con la cadena de conexión de Atlas. Las demás variables traen valores listos para trabajar en local.

| Variable | Para qué sirve |
| --- | --- |
| `MONGODB_URI` | Cadena de conexión de Atlas (obligatoria) |
| `MONGODB_DB` | Nombre de la base (por defecto `zapi-api2`) |
| `PORT` | Puerto de la API (por defecto `5501`) |
| `FRONTEND_ORIGINS` | Orígenes permitidos por CORS (en local ya acepta `http://localhost:5173`) |
| `TRUST_PROXY` | Cantidad de proxies de confianza delante de la API |
| `CRON_SECRET` | Clave de la tarea diaria de depuración |
| `GEMINI_API_KEY` | Clave del chat (opcional) |

En el frontend, copiá `frontend/.env.example` a `frontend/.env`. Tiene una sola variable, `VITE_API_URL`, con la dirección del backend (en local, `http://localhost:5501`). Los archivos `.env` no se suben al repositorio.

## Uso en local

Se necesitan dos terminales abiertas a la vez. En la primera se levanta la API y en la segunda el sitio.

```bash
cd backend && npm run dev      # API en http://localhost:5501
cd frontend && npm run dev     # sitio en http://localhost:5173
```

Para cargar los productos iniciales usá `npm run seed` dentro de `backend/`, y para crear una cuenta de administrador `npm run crear-admin`. Después entrá a `http://localhost:5173/admin`.

## Scripts disponibles

| Dónde | Comando | Qué hace |
| --- | --- | --- |
| `backend/` | `npm run dev` | API con recarga automática |
| `backend/` | `npm start` | API en modo producción |
| `backend/` | `npm test` | Pruebas de la API (no requieren Atlas) |
| `backend/` | `npm run lint` | Revisión de código con ESLint |
| `frontend/` | `npm run dev` | Servidor de desarrollo de Vite |
| `frontend/` | `npm run build` | Versión de producción en `dist/` |
| `frontend/` | `npm run preview` | Sirve localmente la versión compilada |
| `frontend/` | `npm run lint` | Revisión de código con oxlint |
| `frontend/` | `npm run lint:iconos` | Verifica que cada ícono Material Symbols usado exista (un nombre inválido se vería como texto) |

## Pruebas

La API cuenta con pruebas automáticas de autenticación, validación, pedidos, catálogo, publicación de contenido, analítica, límites de uso, CORS y depuración de datos. Se ejecutan con `npm test` dentro de `backend/` y usan una base simulada, por lo que no necesitan conexión a Atlas.

## Publicación

El frontend se publica en Vercel: `vercel.json` compila `frontend/`, reenvía `/api/*` al backend y devuelve `index.html` en el resto de las rutas para que funcione el enrutador. En Vercel no hace falta definir `VITE_API_URL`. El backend se publica en Render con `render.yaml` (verificación de salud en `/api/health`); las variables secretas, como `MONGODB_URI`, `CRON_SECRET` y `GEMINI_API_KEY`, se cargan desde el panel de Render. El flujo `depurar.yml` de GitHub Actions necesita el secreto `CRON_SECRET` en el repositorio y, opcionalmente, la variable `RENDER_API_URL`.

## Seguridad y privacidad

Las contraseñas se guardan con `scrypt`, las sesiones viajan en cookies y se guardan en MongoDB con vencimiento automático (8 horas para administradores), las rutas de administración exigen sesión con rol de administrador, las peticiones tienen límite de tamaño y de frecuencia, y los pedidos antiguos se anonimizan automáticamente cada día. Las claves nunca se versionan: viven en variables de entorno.

## Historial de cambios

El sitio nació como una versión en HTML, CSS y JavaScript puros y se migró a React y Express manteniendo el mismo aspecto. Los detalles, incluida la comparación visual y la revisión responsive, están en [`CAMBIOS.md`](CAMBIOS.md).

## Equipo

Proyecto de ZAPI, vivero sostenible de Montevideo, Uruguay.
