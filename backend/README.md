# ZAPI — Backend API

API REST robusta, segura y modular construida con **Node.js, Express y MongoDB / Mongoose**.

---

## 📁 Estructura del Backend

```
backend/
├── src/
│   ├── config/            # Carga y validación estricta de variables de entorno y CORS
│   ├── database/          # Gestor de conexiones Mongoose y reconexión resiliente
│   ├── middleware/        # Autenticación JWT por cookie, requireAdmin, validadores
│   ├── models/            # Esquemas de persistencia Mongoose (User, Order, Stock, etc.)
│   ├── routes/            # Endpoints modulares (auth, pedidos, stock, admin, etc.)
│   ├── data/              # Catálogo de productos para cálculo de precios en servidor
│   └── app.js             # Factoría principal de la aplicación Express
├── scripts/
│   ├── crear-admin.js     # Script de inicialización de usuarios administradores
│   └── sembrar-stock.js   # Script para poblar inventario inicial desde el catálogo
├── tests/                 # Suite de pruebas automatizadas con node:test y Supertest
├── server.js              # Punto de entrada para el servidor HTTP independiente
├── .env.example           # Plantilla de variables de entorno del servidor
└── package.json           # Dependencias y scripts de backend
```

---

## ⚙️ Configuración y Variables de Entorno

Copia el archivo `.env.example` a `.env`:

```bash
cp .env.example .env     # Linux / macOS
copy .env.example .env   # Windows PowerShell
```

Variables clave requeridas:

| Variable | Descripción | Valor recomendado / Ejemplo |
|---|---|---|
| `NODE_ENV` | Entorno de ejecución | `development` o `production` |
| `PORT` | Puerto de escucha HTTP | `5501` |
| `MONGODB_URI` | Cadena de conexión (Replica Set obligatorio) | `mongodb://127.0.0.1:27017/zapi?replicaSet=rs0` |
| `JWT_SECRET` | Clave criptográfica para firmas JWT | Mínimo 32 caracteres aleatorios |
| `FRONTEND_ORIGINS`| Orígenes autorizados para CORS | `http://localhost:5500,http://127.0.0.1:5500` |
| `COOKIE_SECURE` | Marcar cookies con flag `Secure` | `false` en local, `true` en producción HTTPS |
| `COOKIE_SAME_SITE`| Política SameSite para cookies | `lax` |
| `REQUIERE_CUENTA`| Exigir sesión para crear pedidos | `true` |
| `REGISTRO_PUBLICO`| Permitir registro público | `false` (solo admin vía script) |

---

## 🚀 Comandos y Scripts

Desde la carpeta `backend/`:

```bash
# Iniciar la API en desarrollo
npm start

# Ejecutar la suite completa de pruebas unitarias y de integración
npm test

# Crear o actualizar el usuario administrador inicial
npm run admin:crear

# Poblar el inventario inicial en MongoDB
npm run stock:sembrar
```

---

## 🛡️ Seguridad y Buenas Prácticas

- **Protección contra ataques:** Encabezados de seguridad reforzados con `Helmet`, limitación de tasa de solicitudes con `express-rate-limit`, y sanitización de cargas útiles JSON limitadas a 16 KB.
- **Sesiones seguras:** JWT firmado con algoritmo `HS256`, alojado en cookie `HttpOnly`, con `SameSite=Lax` y sin exposición en JavaScript del cliente.
- **Transacciones ACID:** Los pedidos descuentan stock de forma atómica y condicional sobre réplicas de MongoDB, asegurando consistencia incluso en compras concurrentes.
- **CORS Estricto:** Validación dinámica de orígenes basada en lista blanca y control de hostnames en desarrollo.
