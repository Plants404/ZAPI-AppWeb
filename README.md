# ZAPI — Vivero Agroecológico

Plataforma web de e-commerce y catálogo para el vivero ZAPI: catálogo interactivo con fichas de producto optimizadas para SEO, carrito de compras con checkout por WhatsApp y API, gestión de inventario, panel de administración, autenticación con JWT en cookies HttpOnly y asistente interactivo por reglas.

La arquitectura del proyecto está desacoplada en dos aplicaciones independientes organizadas en un monorepo modular: **Frontend** y **Backend**.

---

## 🏛️ Arquitectura del Proyecto

```
ZAPI-AppWeb/
├── frontend/                  # Aplicación de cliente (HTML5, CSS3, Vanilla JS)
│   ├── public/                # Estilos, scripts, imágenes y datos estáticos
│   ├── productos/             # Fichas estáticas de productos con JSON-LD
│   ├── personaje/             # Recursos gráficos y SVGs del asistente ZAPI
│   ├── datos/                 # Fuentes de autoría (catalogo.js, testimonios.js)
│   ├── tools/                 # Servidor local de pruebas, generadores y linters
│   ├── index.html             # Landing page y tienda principal
│   ├── catalogo.html          # Catálogo con filtros y modal interactivo
│   ├── carrito.html           # Carrito y pasarela de checkout
│   ├── pedidos.html           # Historial de compras
│   ├── login.html             # Acceso de usuarios y administradores
│   ├── admin.html             # Panel de administración de e-commerce
│   ├── 404.html               # Página de error personalizada
│   ├── .env.example           # Configuración del frontend
│   ├── package.json           # Scripts independientes del frontend
│   └── README.md              # Documentación técnica del frontend
│
├── backend/                   # API REST modular (Node.js, Express, MongoDB)
│   ├── src/
│   │   ├── config/            # Carga y validación de variables de entorno y CORS
│   │   ├── database/          # Gestor de conexión y reconexión Mongoose
│   │   ├── middleware/        # Autenticación JWT por cookie y autorización admin
│   │   ├── models/            # Modelos de datos (User, Order, Stock, etc.)
│   │   ├── routes/            # Endpoints modulares (auth, pedidos, stock, admin)
│   │   ├── data/              # Catálogo local para validación y cálculo de precios
│   │   └── app.js             # Factoría y configuración de la aplicación Express
│   ├── scripts/               # Scripts administrativos (crear-admin, sembrar-stock)
│   ├── tests/                 # Suite de pruebas automatizadas con MongoDB en memoria
│   ├── server.js              # Punto de entrada HTTP del backend
│   ├── .env.example           # Variables de entorno requeridas
│   ├── package.json           # Dependencias y scripts del backend
│   └── README.md              # Documentación técnica del backend
│
├── docs/                      # Documentación detallada
│   ├── architecture.md        # Arquitectura técnica y flujo de datos
│   ├── api.md                 # Contrato completo de la API REST
│   └── deployment.md          # Guía de despliegue (Netlify y servidores independientes)
│
├── netlify/                   # Adaptador serverless para Netlify Functions
│   └── functions/api.js       # Handler serverless de la API Express
│
├── scripts/                   # Orquestación de desarrollo
│   └── dev.js                 # Ejecución concurrente de frontend y backend
│
├── netlify.toml               # Configuración de despliegue en Netlify
├── eslint.config.js           # Reglas de linting unificadas
├── .gitignore                 # Exclusiones de Git y protección de secretos
├── package.json               # Monorepo y orquestación de comandos
└── README.md                  # Este documento
```

---

## 📋 Requisitos

- **Node.js**: versión `>= 24.0.0`
- **npm**: versión `>= 10.0.0`
- **MongoDB**: instancia local (configurada como Replica Set para transacciones de pedidos) o cluster en **MongoDB Atlas**.

---

## ⚡ Instalación Rápida

Instala las dependencias del monorepo y de cada aplicación:

```bash
npm install
```

Configura las variables de entorno del backend copiando la plantilla:

```bash
# Windows PowerShell:
Copy-Item backend/.env.example backend/.env

# Linux / macOS:
cp backend/.env.example backend/.env
```

Edita `backend/.env` con tu cadena `MONGODB_URI` y genera un secreto para `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🚀 Ejecución en Desarrollo

Puedes ejecutar ambas aplicaciones simultáneamente o de forma individual:

### 1. Iniciar Frontend y Backend simultáneamente
```bash
npm run dev
```
Inicia el backend en `http://localhost:5501` y el frontend en `http://localhost:5500`.

### 2. Iniciar aplicaciones por separado

**Solo Frontend:**
```bash
npm run start:frontend
# O directamente dentro del directorio:
cd frontend && npm start
```
Disponible en: `http://localhost:5500`

**Solo Backend:**
```bash
npm run start:backend
# O directamente dentro del directorio:
cd backend && npm start
```
Disponible en: `http://localhost:5501`

---

## 🧪 Pruebas y Verificación de Calidad

El proyecto cuenta con suites automatizadas de pruebas y comprobación estática:

```bash
# Ejecutar todas las pruebas unitarias y de integración de la API (32 tests):
npm test

# Ejecutar el linter en todo el proyecto:
npm run lint

# Ejecutar la verificación estática de accesibilidad, ARIA, CSS, XSS y enlaces:
npm run verificar

# Ejecutar linter + verificación estática de forma combinada:
npm run check

# Comprobar ratios de contraste WCAG en todos los estilos:
npm run contraste
```

---

## 🛠️ Tareas Administrativas y Generadores

```bash
# Crear o actualizar el usuario administrador inicial en MongoDB:
npm run admin:crear

# Poblar el inventario inicial de productos en la base de datos:
npm run stock:sembrar

# Regenerar fichas de productos HTML y catálogo JSON tras editar datos/catalogo.js:
npm run generar

# Regenerar sitemap.xml y robots.txt:
npm run sitemap
```

---

## 📚 Documentación Técnica Detallada

- [Arquitectura del Sistema](docs/architecture.md)
- [Referencia y Endpoints de la API REST](docs/api.md)
- [Guía de Despliegue en Producción](docs/deployment.md)
- [Documentación del Frontend](frontend/README.md)
- [Documentación del Backend](backend/README.md)
