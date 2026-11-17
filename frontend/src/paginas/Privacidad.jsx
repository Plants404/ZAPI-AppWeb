import { useState } from 'react'

// Secciones de la página: el índice lateral y los bloques salen de esta lista.
const SECCIONES = [
  { id: 'responsable', titulo: 'Responsable' },
  { id: 'cookies', titulo: 'Cookies y almacenamiento' },
  { id: 'analitica', titulo: 'Analítica de navegación' },
  { id: 'pedidos', titulo: 'Pedidos y consultas' },
  { id: 'terceros', titulo: 'Servicios de terceros' },
  { id: 'conservacion', titulo: 'Conservación y tus derechos' }
]

const ALMACENAMIENTO = [
  { nombre: 'sessionId', tipo: 'Cookie técnica', para: 'Mantenerte conectado cuando iniciás sesión.', dura: 'Hasta 8 horas o hasta que cierres sesión' },
  { nombre: 'zapiCarrito', tipo: 'Almacenamiento local', para: 'Recordar los productos de tu carrito.', dura: 'Hasta que lo vacíes o borres los datos del sitio' },
  { nombre: 'zapiPedidos', tipo: 'Almacenamiento local', para: 'Mostrar tu historial en "Mis pedidos".', dura: 'Hasta que lo borres (se guardan los últimos 40)' },
  { nombre: 'zapiSesion', tipo: 'Almacenamiento de pestaña', para: 'Identificador aleatorio para la analítica anónima.', dura: 'Hasta que cierres la pestaña' }
]

// Privacidad y cookies: índice lateral fijo en escritorio y bloques de lectura.
function Privacidad() {
  const [activa, setActiva] = useState(SECCIONES[0].id)

  return (
    <>
      <section className="priv-hero">
        <div className="priv-hero-interno">
          <span className="etiqueta">Privacidad y cookies</span>
          <h1>Tus datos, claros y a mano</h1>
          <p>Qué registramos, para qué lo usamos y cuánto tiempo lo guardamos. Sin letra chica.</p>
        </div>
      </section>

      <div className="priv-layout">
        <nav className="priv-indice" aria-label="En esta página">
          <p className="priv-indice-titulo">En esta página</p>
          <ul>
            {SECCIONES.map(s => (
              <li key={s.id}>
                <a href={'#' + s.id} aria-current={activa === s.id ? 'true' : undefined} onClick={() => setActiva(s.id)}>{s.titulo}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="priv-contenido">
          <section className="priv-bloque" id="responsable" aria-labelledby="t-responsable">
            <h2 id="t-responsable">Responsable</h2>
            <dl className="priv-datos">
              <div><dt>Nombre</dt><dd>ZAPI · Vivero Agroecológico</dd></div>
              <div><dt>Dirección</dt><dd>Congreso de Abril, Montevideo, Uruguay</dd></div>
              <div><dt>Correo</dt><dd><a href="mailto:zapi.vivero@gmail.com">zapi.vivero@gmail.com</a></dd></div>
              <div><dt>WhatsApp</dt><dd>098 268 560</dd></div>
              <div><dt>Sitio</dt><dd>https://zapi.uy</dd></div>
            </dl>
          </section>

          <section className="priv-bloque" id="cookies" aria-labelledby="t-cookies">
            <h2 id="t-cookies">Cookies y almacenamiento</h2>
            <p>No usamos cookies de publicidad ni de seguimiento. La única cookie es una cookie técnica de sesión, necesaria para mantenerte conectado; no se usa para analítica. Además, el sitio guarda algunos datos en tu navegador para que funcione mejor:</p>
            <div className="priv-tabla-caja">
              <table className="priv-tabla">
                <thead>
                  <tr><th scope="col">Nombre</th><th scope="col">Tipo</th><th scope="col">Para qué sirve</th><th scope="col">Cuánto dura</th></tr>
                </thead>
                <tbody>
                  {ALMACENAMIENTO.map(fila => (
                    <tr key={fila.nombre}>
                      <th scope="row" data-etiqueta="Nombre"><code>{fila.nombre}</code></th>
                      <td data-etiqueta="Tipo">{fila.tipo}</td>
                      <td data-etiqueta="Para qué sirve">{fila.para}</td>
                      <td data-etiqueta="Cuánto dura">{fila.dura}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>Podés borrar todo esto cuando quieras desde los ajustes de tu navegador (datos del sitio y cookies). Si lo hacés, se cierra tu sesión y se vacía el carrito.</p>
          </section>

          <section className="priv-bloque" id="analitica" aria-labelledby="t-analitica">
            <h2 id="t-analitica">Analítica de navegación</h2>
            <p>Registramos eventos anónimos para mejorar la tienda y el panel de administración. Se envían a los servidores de ZAPI y no incluyen tu nombre, correo ni teléfono.</p>
            <h3>Lo que se registra</h3>
            <ul className="priv-lista">
              <li>Tipo de evento, de una lista cerrada: vista de página, clic en un elemento clave, agregar al carrito, inicio de pedido y clic a WhatsApp.</li>
              <li>Un identificador aleatorio de la pestaña del navegador.</li>
              <li>La página visitada y el elemento clickeado.</li>
              <li>El tipo de dispositivo: computadora o móvil.</li>
              <li>La fecha y la hora del evento.</li>
            </ul>
            <p>La dirección IP no se guarda en la base de datos. El servidor la usa un instante, solo para limitar abusos, y el servicio de alojamiento puede registrar sus propios datos técnicos. Los eventos se borran solos a los 90 días.</p>
          </section>

          <section className="priv-bloque" id="pedidos" aria-labelledby="t-pedidos">
            <h2 id="t-pedidos">Pedidos y consultas</h2>
            <div className="priv-tarjetas">
              <article>
                <h3>Pedidos</h3>
                <p>Para armar un pedido te pedimos nombre, teléfono, correo (opcional), zona y notas. Es necesario iniciar sesión. El pedido se registra en nuestro sistema para gestionarlo y reservar el stock, y queda una copia en tu navegador, en "Mis pedidos". Después se abre WhatsApp con el mensaje listo para que lo envíes.</p>
              </article>
              <article>
                <h3>Consultas</h3>
                <p>Te pedimos nombre, correo, asunto, mensaje y, si querés, teléfono. Los usamos solo para responderte. También se abre WhatsApp con tu mensaje listo; si lo enviás, queda en la cuenta de WhatsApp de ZAPI.</p>
              </article>
              <article>
                <h3>Opiniones</h3>
                <p>Te pedimos nombre, lugar (opcional), texto y puntaje. Se tratan igual que una consulta y se publican solo si las aprobamos.</p>
              </article>
            </div>
          </section>

          <section className="priv-bloque" id="terceros" aria-labelledby="t-terceros">
            <h2 id="t-terceros">Servicios de terceros</h2>
            <ul className="priv-lista">
              <li><strong>Google Fonts:</strong> las tipografías y los íconos se cargan desde Google, que recibe los datos técnicos habituales de toda conexión, como tu dirección IP.</li>
              <li><strong>Asistente con IA:</strong> los mensajes que escribís en el chat se envían a nuestro servidor y a un servicio de inteligencia artificial de Google para generar la respuesta. No escribas datos personales en el chat.</li>
              <li><strong>WhatsApp:</strong> si enviás un mensaje, se rige por las condiciones de WhatsApp.</li>
              <li><strong>Correo:</strong> algunas consultas se envían por un servicio de correo para que nos lleguen.</li>
            </ul>
          </section>

          <section className="priv-bloque" id="conservacion" aria-labelledby="t-conservacion">
            <h2 id="t-conservacion">Conservación y tus derechos</h2>
            <p>Lo que queda en tu navegador lo borrás vos cuando quieras. Las consultas y las opiniones rechazadas se eliminan automáticamente al año. En los pedidos, al año se borran tus datos personales (nombre, teléfono, correo, zona y notas) y se conservan solo montos, fechas y productos para estadísticas del negocio. Las conversaciones de WhatsApp las conservamos hasta 1 año, salvo que nos pidas eliminarlas antes.</p>
            <p>Podés pedirnos acceso, corrección o eliminación de tus datos escribiendo a <a href="mailto:zapi.vivero@gmail.com">zapi.vivero@gmail.com</a> o por WhatsApp al 098 268 560.</p>
          </section>
        </div>
      </div>
    </>
  )
}

export default Privacidad
