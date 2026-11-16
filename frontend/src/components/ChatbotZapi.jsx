import { Link } from 'react-router-dom'

// Marcador del chat "Brotecito" (lo que se ve); la conversación se conecta en la Fase 4.
function ChatbotZapi() {
  return (
    <>
        <button className="zapi-toggle" id="zapiToggle" type="button" aria-label="Abrir chat con Brotecito" aria-expanded="false">
          <span className="material-symbols-outlined zapi-chat-icon">forum</span>
          <span className="material-symbols-outlined zapi-close">close</span>
          <span className="zapi-badge" id="zapiBadge">1</span>
        </button>
        <section className="zapi-panel" id="zapiPanel" role="dialog" aria-label="Chat con Brotecito" aria-modal="false">
          <header className="zapi-header">
            <div className="zapi-avatar">
              <svg className="zapi-sprout" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path className="zapi-sprout-stem" d="M12 19v-7.5"></path>
                <path className="zapi-sprout-leaf" d="M12 11.5c0-3.3-2.5-5.5-6-5.5 0 3.3 2.5 5.5 6 5.5z"></path>
                <path className="zapi-sprout-leaf" d="M12 11.5c0-3.3 2.5-5.5 6-5.5 0 3.3-2.5 5.5-6 5.5z"></path>
              </svg>
            </div>
            <div className="zapi-header-text">
              <h4>Brotecito</h4>
              <span className="zapi-status">
                <span className="material-symbols-outlined zapi-status-dot">circle</span> Asistente virtual de ZAPI
              </span>
            </div>
            {/* La acción "ver carrito" se mudó de los atajos a acá, para que la fila de botones sea solo de temas. aria-label porque el ícono solo no dice nada por sí mismo. */}
            <Link className="zapi-header-accion" to="/carrito" aria-label="Ver el carrito">
              <span className="material-symbols-outlined">shopping_cart</span>
            </Link>
            <button className="zapi-header-close" id="zapiClose" type="button" aria-label="Cerrar chat">
              <span className="material-symbols-outlined">close</span>
            </button>
          </header>
          <div className="zapi-messages" id="zapiMessages" role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversación con Brotecito" tabIndex="0"></div>
          <div className="zapi-chips" id="zapiChips"></div>
          {/* El bot resuelve lo que puede, pero siempre tiene que quedar una salida a una persona. Va siempre visible, arriba del campo, para no depender de acertar la pregunta. */}
          <div className="zapi-humano">
            <span>¿Preferís hablar con una persona?</span>
            <a className="zapi-humano-link" href="https://wa.me/59898268560?text=Hola%20ZAPI%2C%20necesito%20ayuda%20con%20un%20pedido" target="_blank" rel="noopener">
              <span className="material-symbols-outlined" aria-hidden="true">support_agent</span> Hablar con el equipo
            </a>
          </div>
          <form className="zapi-input-area" id="zapiForm">
            <input type="text" id="zapiInput" placeholder="Escribí tu consulta..." autoComplete="off" aria-label="Escribir mensaje" />
            <button className="zapi-send" type="submit" aria-label="Enviar mensaje">
              <span className="material-symbols-outlined">send</span>
            </button>
          </form>
        </section>
    </>
  )
}

export default ChatbotZapi
