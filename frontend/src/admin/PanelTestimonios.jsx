function PanelTestimonios() {
  return (
      <section className="admin-panel gestion-panel" id="panelTestimonios" hidden aria-label="Testimonios">
        <div className="gestion-encabezado">
          <div>
            <h1>Testimonios</h1>
            <p>Revisá lo que escriben tus clientes y elegí qué se muestra en el sitio.</p>
          </div>
          <div className="gestion-resumen" id="resumenTestimonios"></div>
        </div>
        <div className="gestion-filtros" id="filtrosTestimonios" role="group" aria-label="Filtrar por estado"></div>
        <div className="gestion-grilla" id="adminCuerpoTestimonios"></div>
        <p id="adminTestimoniosVacio" className="estado-vacio" hidden>No hay testimonios.</p>
      </section>
  )
}

export default PanelTestimonios
