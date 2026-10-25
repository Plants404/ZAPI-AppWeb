# ZAPI — Frontend

Interfaz web de usuario para el vivero agroecológico ZAPI.

Construida con **HTML5, CSS3 y JavaScript clásico (Vanilla)**, sin necesidad de compiladores, empaquetadores ni frameworks pesados. Los navegadores modernos ejecutan directamente los recursos estáticos.

---

## 📁 Estructura del Frontend

```
frontend/
├── public/
│   ├── css/           # Hojas de estilo estructuradas y tokens de diseño
│   ├── js/            # Lógica cliente (módulos, controladores de UI, carrito, bot)
│   ├── img/           # Imágenes optimizadas y vectoriales (SVG, WebP/JPG)
│   └── data/          # JSONs generados para consumo de la UI (productos, testimonios)
├── productos/         # Fichas estáticas de productos con Schema.org JSON-LD
├── personaje/         # Ilustraciones SVG del asistente interactivo
├── datos/             # Fuentes de autoría de datos (catalogo.js, testimonios.js)
├── tools/             # Servidor estático, verificadores y generadores de build
├── index.html         # Página principal / Landing page
├── catalogo.html      # Catálogo con filtros y modal interactivo
├── carrito.html       # Carrito de compras y checkout (WhatsApp / API)
├── pedidos.html       # Historial de pedidos
├── login.html         # Acceso administrativo y de cuentas
├── admin.html         # Panel de control de e-commerce y moderación
├── 404.html           # Página de error personalizada
├── robots.txt         # Directivas para rastreadores de motores de búsqueda
├── sitemap.xml        # Mapa del sitio optimizado para SEO
├── .env.example       # Plantilla de variables de entorno para el front
└── package.json       # Scripts de ejecución, verificación y generación
```

---

## 🚀 Comandos y Scripts

Desde la carpeta `frontend/`:

```bash
# Iniciar servidor estático local (http://localhost:5500)
npm start

# Ejecutar verificación estática de accesibilidad (ARIA), CSS, IDs y enlaces
npm run verificar

# Comprobar ratios de contraste WCAG en toda la paleta de colores
npm run contraste

# Regenerar fichas HTML de productos y JSON desde datos/catalogo.js
npm run generar

# Regenerar JSON de testimonios desde datos/testimonios.js
npm run generar:testimonios

# Regenerar sitemap.xml y robots.txt
npm run sitemap

# Partir estilos modales desde catalogo.css
npm run css
```

---

## 🔗 Conexión con la API del Backend

La comunicación con el backend se centraliza en `public/js/config.js`:
- **Local:** Detecta automáticamente `localhost` o `127.0.0.1` y apunta a `http://localhost:5501`.
- **Producción:** En despliegues bajo Netlify, utiliza rutas relativas (`/api/*`) que son dirigidas a Netlify Functions.
- **Sobreescritura:** Puedes definir un origen personalizado mediante `<meta name="zapi-api" content="...">` o asignando `window.__ZAPI_API__`.

---

## 🛡️ Seguridad en el Cliente

- No se almacenan contraseñas ni tokens JWT en `localStorage`.
- La autenticación utiliza cookies seguras `HttpOnly` gestionadas exclusivamente por el backend mediante `credentials: "include"`.
- Todas las salidas dinámicas en el DOM se escapan contra ataques XSS mediante `escaparHTML()`.
