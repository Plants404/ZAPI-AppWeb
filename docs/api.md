# Referencia de la API REST de ZAPI

La API expone endpoints bajo el prefijo `/api`. Todas las respuestas y peticiones utilizan formato JSON con codificación UTF-8.

---

## 🔐 Autenticación (`/api/auth`)

### 1. `POST /api/auth/login`
Inicia sesión y genera una cookie de sesión `HttpOnly` (`zapi_session`).

**Cuerpo de la petición:**
```json
{
  "email": "usuario@ejemplo.com",
  "clave": "ContraseñaSegura123!"
}
```

**Respuestas:**
- `200 OK`: Sesión creada.
  ```json
  {
    "usuario": {
      "id": "653b...",
      "nombre": "Ana",
      "email": "ana@ejemplo.com",
      "role": "admin"
    }
  }
  ```
- `400 Bad Request`: Formato de email o contraseña inválido.
- `401 Unauthorized`: Credenciales erróneas.

---

### 2. `POST /api/auth/registro`
Crea una nueva cuenta de usuario (activo cuando `REGISTRO_PUBLICO=true` o en entorno de tests).

**Cuerpo de la petición:**
```json
{
  "nombre": "Ana López",
  "email": "ana@ejemplo.com",
  "clave": "MiClaveSegura2026!"
}
```

**Respuestas:**
- `201 Created`: Cuenta creada y sesión iniciada.
- `403 Forbidden`: Registro público desactivado (sitio en modo solo administrador).
- `409 Conflict`: Ya existe un usuario con ese correo electrónico.

---

### 3. `GET /api/auth/yo`
Obtiene los datos del usuario autenticado actualmente. Requiere cookie de sesión.

**Respuestas:**
- `200 OK`: Datos del usuario.
- `401 Unauthorized`: No hay sesión activa o el token expiró.

---

### 4. `POST /api/auth/logout`
Cierra la sesión y elimina la cookie `zapi_session`.

**Respuestas:**
- `204 No Content`: Sesión cerrada exitosamente.

---

## 📦 Stock y Catálogo (`/api/stock`)

### 1. `GET /api/stock`
Obtiene las unidades disponibles de todos los productos. Endpoint público.

**Respuestas:**
- `200 OK`:
  ```json
  {
    "stock": {
      "1": 15,
      "2": 8
    }
  }
  ```

---

### 2. `PUT /api/stock/:id`
Actualiza el stock de un producto específico. Requiere rol `admin`.

**Cuerpo de la petición:**
```json
{
  "unidades": 20
}
```

**Respuestas:**
- `200 OK`: `{ "ok": true }`
- `403 Forbidden`: Usuario sin permisos administrativos.

---

## 🛒 Pedidos (`/api/pedidos`)

### 1. `POST /api/pedidos`
Crea un nuevo pedido. Requiere sesión (si `REQUIERE_CUENTA=true`). Calcula los importes en el servidor y descuenta el stock de forma atómica.

**Cuerpo de la petición:**
```json
{
  "nombre": "Carlos Gómez",
  "telefono": "099123456",
  "zona": "Montevideo",
  "notas": "Dejar en portería",
  "items": [
    { "id": 1, "cantidad": 2 },
    { "id": 4, "cantidad": 1 }
  ]
}
```

**Respuestas:**
- `201 Created`: Pedido registrado con éxito y stock descontado.
- `400 Bad Request`: Formato de datos o cantidad de items inválida.
- `401 Unauthorized`: No hay sesión activa.
- `409 Conflict`: Stock insuficiente para uno o más productos.

---

### 2. `GET /api/pedidos`
Devuelve el historial de pedidos del usuario autenticado (hasta 50 pedidos recientes).

**Respuestas:**
- `200 OK`: Lista de pedidos.
- `401 Unauthorized`: Sesión requerida.

---

### 3. `POST /api/pedidos/:id/ocultar`
Permite a un usuario remover un pedido de su historial visible sin eliminarlo de la base de datos.

---

## 💬 Testimonios y Moderación (`/api/testimonios`)

### 1. `GET /api/testimonios`
Devuelve todas las opiniones verificadas y autorizadas para mostrar en el carrusel de la página de inicio. Endpoint público.

---

### 2. `POST /api/testimonios`
Envía una nueva opinión. Se crea en estado pendiente de moderación (`verificado: false`, `autorizado: false`). Requiere sesión.

**Cuerpo de la petición:**
```json
{
  "autor": "Sofía Pérez",
  "lugar": "Canelones",
  "texto": "Excelente atención y la albahaca llegó hermosa.",
  "estrellas": 5
}
```

---

### 3. `PATCH /api/testimonios/:id/aprobar`
Aprueba y publica una opinión. Requiere rol `admin`.

---

## 📬 Contacto (`/api/contacto`)

### 1. `POST /api/contacto`
Registra un mensaje desde el formulario de contacto. Incluye protección honeypot en el campo `sitio_web`.

---

## 📊 Panel de Administración (`/api/admin`)

Todos los endpoints bajo `/api/admin` exigen rol `admin`:
- `GET /api/admin/dashboard`: Métricas de ventas, usuarios, opiniones pendientes y productos con bajo stock.
- `GET /api/admin/pedidos`: Lista paginada y filtrable de todos los pedidos del vivero.
- `PATCH /api/admin/pedidos/:id/estado`: Cambio de estado (`pendiente`, `confirmado`, `preparando`, `enviado`, `entregado`, `cancelado`).
- `GET /api/admin/usuarios`: Gestión de cuentas registradas.
- `PATCH /api/admin/usuarios/:id/rol`: Modificación de rol (`user` o `admin`).
- `GET /api/admin/testimonios`: Bandeja de opiniones pendientes de moderación.
- `DELETE /api/admin/testimonios/:id`: Eliminación de opiniones inapropiadas o rechazadas.

---

## 🩺 Disponibilidad (`/api/health`)

### `GET /api/health`
Comprueba la salud operativa del servidor. Devuelve `{ "estado": "ok" }`.
