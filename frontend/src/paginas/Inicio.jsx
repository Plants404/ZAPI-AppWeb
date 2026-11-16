import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProductoCard from '../components/ProductoCard.jsx'
import TestimonioCard from '../components/TestimonioCard.jsx'
import { EstadoCatalogo, useCatalogo } from '../estado/catalogo.jsx'
import { obtenerTestimonios } from '../api.js'
import { TESTIMONIOS } from '../data/testimonios.js'
import { useInterfaz } from '../estado/interfaz.jsx'

function Inicio() {
  const { abrirTestimonio, testimoniosNuevos } = useInterfaz()
  const { productos, cargando, error, recargar } = useCatalogo()
  const [publicados, setPublicados] = useState(TESTIMONIOS)

  // Las opiniones publicadas vienen de la API. Si no hay ninguna o falla, quedan los de ejemplo, como antes.
  useEffect(() => {
    let vigente = true
    obtenerTestimonios().then(lista => { if (vigente && lista.length) setPublicados(lista) }).catch(() => {})
    return () => { vigente = false }
  }, [])

  const testimonios = [...testimoniosNuevos, ...publicados]
  // Los 4 destacados (si no hay ninguno, los primeros 4), como hacía el sitio viejo.
  const destacados = productos.filter(p => p.destacado).slice(0, 4)
  const lista = destacados.length ? destacados : productos.slice(0, 4)

  return (
    <>
        <section className="hero" id="inicio">
          <div className="hero-grid">
            <div className="hero-copy">
              <h1>Transformamos espacios con naturaleza.</h1>
              <p className="hero-lead">En <strong>ZAPI</strong> conectamos a las personas con la naturaleza a través de soluciones agroecológicas integrales.</p>
              <ul className="hero-features hero-beneficios">
                <li>
                  <span aria-hidden="true">✓</span>
                  <span>
                    <strong>Plantas de calidad:</strong> Cuidadosamente seleccionadas.
                  </span>
                </li>
                <li>
                  <span aria-hidden="true">✓</span>
                  <span>
                    <strong>Asesoramiento profesional:</strong> Paso a paso.
                  </span>
                </li>
                <li>
                  <span aria-hidden="true">✓</span>
                  <span>
                    <strong>Cuidado simple:</strong> Para que tu espacio prospere.
                  </span>
                </li>
              </ul>
              <div className="hero-ctas">
                <Link className="boton boton-primario" to="/catalogo">Explorar catálogo</Link>
                <Link className="boton boton-secundario" to="/servicios">Conocer nuestros servicios</Link>
              </div>
            </div>
            <img className="hero-visual" src="/img/plants-hero.opt.jpg" alt="Plantas de interior verdes en un ambiente luminoso" width="1200" height="800" fetchPriority="high" />
          </div>
          <div className="destacados home-products-carousel" role="region" aria-label="Productos destacados">
            <div className="carousel-header">
              <h2>Productos destacados</h2>
            </div>
            <div className="carousel-viewport">
              <div className="carousel-track" id="productosDestacados">
                {cargando || error
                  ? <EstadoCatalogo cargando={cargando} error={error} recargar={recargar} />
                  : lista.map(producto => <ProductoCard key={producto.id} producto={producto} />)}
              </div>
            </div>
          </div>
        </section>
        <section className="section testimonios" id="testimonios" data-parte-de="inicio">
          <div className="testimonios-cabecera">
            <span className="contacto-eyebrow">TESTIMONIOS</span>
            <h2>Lo que dicen nuestros clientes</h2>
            <p>Historias de quienes ya transformaron sus espacios con ZAPI.</p>
          </div>
          <div className="testimonios-grilla" id="testimoniosLista" role="list" aria-label="Testimonios de clientes">
            {testimonios.length
                ? testimonios.map(t => <TestimonioCard key={t.autor + t.texto} testimonio={t} />)
                : <p className="estado-vacio">Todavía no publicamos opiniones. Si compraste con nosotros, nos encantara leer tu experiencia.</p>}
          </div>
          <div className="testimonios-accion">
            <button className="btn-testimonio boton boton-secundario" type="button" onClick={() => abrirTestimonio()}>
              <span className="material-symbols-outlined" aria-hidden="true">rate_review</span> Dejar mi opinion
            </button>
          </div>
        </section>
    </>
  )
}

export default Inicio
