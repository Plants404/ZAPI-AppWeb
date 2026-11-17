/* Cada hoja de estilos se importa como texto (?inline) para poder activarla solo
   mientras la página que la usa está en pantalla, como en el sitio viejo. */
import hoja_404 from './404.css?inline'
import hoja_admin from './admin.css?inline'
import hoja_ajustesEstilo from './ajustes-estilo.css?inline'
import hoja_base from './base.css?inline'
import hoja_carrito from './carrito.css?inline'
import hoja_catalogoCatalogo from './catalogo-catalogo.css?inline'
import hoja_catalogoModal from './catalogo-modal.css?inline'
import hoja_contacto from './contacto.css?inline'
import hoja_estilosProducto from './estilos-producto.css?inline'
import hoja_estructura from './estructura.css?inline'
import hoja_inicio from './inicio.css?inline'
import hoja_login from './login.css?inline'
import hoja_nosotros from './nosotros.css?inline'
import hoja_pedidos from './pedidos.css?inline'
import hoja_privacidad from './privacidad.css?inline'
import hoja_servicios from './servicios.css?inline'
import hoja_styles from './styles.css?inline'
import hoja_tokens from './tokens.css?inline'
import hoja_zapiBot from './zapi-bot.css?inline'

export const HOJAS = {
  '404': hoja_404,
  'admin': hoja_admin,
  'ajustes-estilo': hoja_ajustesEstilo,
  'base': hoja_base,
  'carrito': hoja_carrito,
  'catalogo-catalogo': hoja_catalogoCatalogo,
  'catalogo-modal': hoja_catalogoModal,
  'contacto': hoja_contacto,
  'estilos-producto': hoja_estilosProducto,
  'estructura': hoja_estructura,
  'inicio': hoja_inicio,
  'login': hoja_login,
  'nosotros': hoja_nosotros,
  'pedidos': hoja_pedidos,
  'privacidad': hoja_privacidad,
  'servicios': hoja_servicios,
  'styles': hoja_styles,
  'tokens': hoja_tokens,
  'zapi-bot': hoja_zapiBot,
}
