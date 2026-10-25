# Guía de Despliegue de ZAPI

La arquitectura separada de ZAPI permite dos estrategias de despliegue principales:
1. **Despliegue unificado en Netlify** (Frontend estático en CDN + Backend en Netlify Functions).
2. **Despliegue independiente** (Frontend en CDN / Vercel / Cloudflare Pages + Backend en un servicio Node.js como Render, Railway, Fly.io o VPS con Nginx).

---

## Opción 1: Despliegue en Netlify (Recomendado para la configuración actual)

Netlify aloja el frontend estático y ejecuta el backend Express a través de Netlify Functions bajo el mismo dominio (`https://tudominio.netlify.app`), eliminando complejidades de CORS en producción.

### 1. Configuración de `netlify.toml`
El archivo `netlify.toml` en la raíz ya está configurado para publicar únicamente el frontend:
```toml
[build]
  publish = "frontend"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "24"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/api/:splat"
  status = 200
  force = true
```

### 2. Variables de entorno en Netlify
Configura en **Netlify Dashboard → Site Configuration → Environment variables**:
- `NODE_ENV=production`
- `MONGODB_URI`: Cadena de conexión de MongoDB Atlas.
- `JWT_SECRET`: Secreto criptográfico aleatorio de al menos 32 caracteres.
- `FRONTEND_ORIGINS=https://tudominio.netlify.app`
- `COOKIE_SAME_SITE=lax`
- `COOKIE_SECURE=true`
- `TRUST_PROXY=1`
- `REQUIERE_CUENTA=true`
- `REGISTRO_PUBLICO=false`

### 3. Configuración en MongoDB Atlas
- En **Network Access**, permite el acceso saliente dinámico de Netlify agregando `0.0.0.0/0` o los rangos de IP de tu región de Netlify.
- Asegúrate de que el cluster sea un **Replica Set** (Atlas lo habilita por defecto).

---

## Opción 2: Despliegue Independiente (Frontend y Backend Separados)

### Backend (Render, Railway, Fly.io o Docker)
1. **Directorio raíz del servicio:** Apuntar al directorio `backend/`.
2. **Comando de instalación:** `npm install`
3. **Comando de inicio:** `npm start` (ejecuta `node server.js`).
4. **Variables de entorno:** Configurar las variables del backend indicando en `FRONTEND_ORIGINS` la URL exacta de tu frontend (ej. `https://tienda.zapi.uy`).
5. **Cookies entre dominios diferentes:** Si frontend y backend están en dominios completamente distintos, configura `COOKIE_SAME_SITE=none` y `COOKIE_SECURE=true`.

### Frontend (Cloudflare Pages, Vercel, S3/CloudFront)
1. **Directorio raíz:** Apuntar a `frontend/`.
2. **Punto de compilación / Publish directory:** `.` (la raíz de `frontend/`).
3. **Configuración de API:** Inyectar la URL del backend remoto en el HTML o mediante la etiqueta:
   ```html
   <meta name="zapi-api" content="https://api.zapi.uy">
   ```
   o asignando `window.__ZAPI_API__ = "https://api.zapi.uy";`.
