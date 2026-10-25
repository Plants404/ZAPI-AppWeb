# Arquitectura del Sistema ZAPI

Este documento describe la arquitectura técnica, la separación de responsabilidades y el flujo de datos entre el Frontend y el Backend del proyecto ZAPI.

---

## 🏛️ Visión General

El sistema ZAPI adopta una arquitectura desacoplada organizada como un monorepo modular:

```
┌─────────────────────────────────┐           ┌─────────────────────────────────┐
│            FRONTEND             │           │             BACKEND             │
│   (HTML5, CSS3, Vanilla JS)     │  HTTP/REST│     (Node.js, Express, JWT)     │
│                                 │──────────>│                                 │
│ - Renderizado de vistas         │  JSON     │ - Controladores y Rutas API     │
│ - Gestión de carrito (local)    │<──────────│ - Autenticación y Autorización  │
│ - Validación de formularios     │  Cookies  │ - Validación de Reglas Negocio  │
│ - Asistente Zapi-Bot (reglas)   │  HttpOnly │ - Transacciones de Inventario   │
└─────────────────────────────────┘           └─────────────────────────────────┘
                                                               │
                                                               ▼
                                              ┌─────────────────────────────────┐
                                              │            DATABASE             │
                                              │         (MongoDB Atlas)         │
                                              │                                 │
                                              │ - Users, Orders, Stock, Reviews │
                                              └─────────────────────────────────┘
```

---

## 📂 Organización de Directorios

### 1. `frontend/`
Dedicado exclusivamente a la capa de presentación y experiencia de usuario:
- **`public/`**: Recursos estáticos servidos sin procesar (`css`, `js`, `img`, `data`).
- **`productos/`**: Páginas estáticas optimizadas para SEO, indexables y con marcado estructurado Schema.org JSON-LD.
- **`datos/`**: Fuentes de autoría de catálogo y opiniones en formato CommonJS (`catalogo.js`, `testimonios.js`), consumidas por generadores fuera del navegador.
- **`tools/`**: Herramientas de soporte de compilación estática, verificación ARIA/contraste y servidor local de desarrollo (`servir.js`).

### 2. `backend/`
Responsable del procesamiento de negocio, persistencia y seguridad de la información:
- **`src/config/`**: Gestión centralizada y validación estricta de variables de entorno y reglas de orígenes CORS.
- **`src/database/`**: Inicialización resiliente y reutilización de conexiones de base de datos para entornos tradicionales y serverless.
- **`src/middleware/`**: Interceptores de autenticación JWT (`authenticate.js`), control de privilegios (`requireAdmin.js`) y sanitización.
- **`src/models/`**: Esquemas de persistencia Mongoose (`User`, `Order`, `Stock`, `ContactForm`, `Testimonio`).
- **`src/routes/`**: Controladores HTTP modulares segmentados por recurso (`auth`, `pedidos`, `stock`, `admin`, `contacto`, `testimonios`).
- **`src/data/`**: Fuente de referencia local de productos para verificación de precios en el servidor sin delegar en el cliente.
- **`tests/`**: Suite de pruebas con base de datos en memoria (`mongodb-memory-server`) y assertions nativas de Node.js.

### 3. `docs/`
Documentación exhaustiva de arquitectura, contratos de API y procedimientos de despliegue.

### 4. `scripts/`
Scripts de orquestación para desarrollo simultáneo de ambos entornos (`dev.js`).

---

## 🔒 Principios de Seguridad Aplicados

1. **Sin secretos en el frontend:** El frontend no contiene credenciales de base de datos ni llaves privadas.
2. **Cookies `HttpOnly` y `SameSite`:** Las credenciales de sesión se gestionan mediante tokens JWT contenidos en cookies seguras no accesibles desde JavaScript.
3. **Cálculo de importes del lado del servidor:** Los precios y totales de los pedidos se calculan exclusivamente en el backend; cualquier valor enviado por el navegador es ignorado.
4. **Descuento atómico de inventario:** Se utilizan actualizaciones condicionales sobre MongoDB para prevenir condiciones de carrera y sobreventa.
5. **Aislamiento de despliegue:** La configuración de Netlify (`publish = "frontend"`) garantiza que el código fuente del backend, scripts y dependencias no queden expuestos como archivos estáticos.
