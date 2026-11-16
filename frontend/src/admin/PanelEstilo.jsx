import { Link } from 'react-router-dom'

function PanelEstilo() {
  return (
      <section className="admin-panel editor-estilo" id="panelEstilo" hidden aria-label="Estilo del sitio">
        <form className="ed-raiz" id="formEstilo" noValidate>
          <header className="ed-barra">
            <button className="ed-boton-barra ed-volver" id="edVolver" type="button">
              <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
              <span className="ed-oculto-movil">Panel</span>
            </button>
            <div className="ed-marca">
              <img src="/img/logo.svg" alt="" width="30" height="30" />
              <span className="ed-marca-nombre">ZAPI</span>
              <span className="ed-marca-seccion" id="edTituloBarra">Estilo del sitio</span>
            </div>
            <div className="ed-dispositivos" id="edDispositivos" role="group" aria-label="Tamaño de la vista previa">
              <button className="ed-dispositivo activo" type="button" data-dispositivo="escritorio" aria-pressed="true">
                <span className="material-symbols-outlined" aria-hidden="true">desktop_windows</span>
                <span className="ed-oculto-movil">Escritorio</span>
              </button>
              <button className="ed-dispositivo" type="button" data-dispositivo="tablet" aria-pressed="false">
                <span className="material-symbols-outlined" aria-hidden="true">tablet_mac</span>
                <span className="ed-oculto-movil">Tablet</span>
              </button>
              <button className="ed-dispositivo" type="button" data-dispositivo="celular" aria-pressed="false">
                <span className="material-symbols-outlined" aria-hidden="true">smartphone</span>
                <span className="ed-oculto-movil">Celular</span>
              </button>
            </div>
            <div className="ed-barra-acciones">
              <span className="ed-estado" id="edEstado" role="status" aria-live="polite">
                <i className="ed-estado-punto" aria-hidden="true"></i>
                <span id="edEstadoTexto">Sin cambios</span>
              </span>
              <button className="ed-boton-barra" id="btnRestablecerMarca" type="button" hidden>Restablecer</button>
              <button className="ed-boton-barra" id="btnGuardarMarca" type="button" hidden>Guardar borrador</button>
              <Link className="ed-boton-barra" id="edVerSitio" to="/" target="_blank" rel="noopener">Ver sitio</Link>
              <button className="ed-boton-primario" id="btnPublicar" type="button">Publicar cambios</button>
            </div>
          </header>
          <div className="ed-cuerpo" id="edEditor">
            <nav className="ed-paginas" id="edPaginas" aria-label="Páginas y secciones"></nav>
            <div className="ed-centro">
              <div className="ed-navegador">
                <div className="ed-navegador-barra">
                  <span className="ed-punto"></span>
                  <span className="ed-punto"></span>
                  <span className="ed-punto"></span>
                  <span className="ed-direccion" id="edDireccion">zapivivero.vercel.app / inicio</span>
                </div>
                <div className="ed-lienzo" id="edLienzo">
                  <iframe className="ed-marco" id="edMarco" name="zapi-vista-previa" title="Vista previa de la página" src="about:blank"></iframe>
                </div>
              </div>
            </div>
            <aside className="ed-inspector" aria-label="Propiedades de la sección">
              <div className="ed-insp-cabecera">
                <div className="ed-etiqueta" id="edEtiqueta"></div>
                <h2 id="edTituloSeccion"></h2>
              </div>
              <div className="ed-tabs" id="edTabs" role="tablist" aria-label="Qué editar">
                <button className="ed-tab activa" type="button" role="tab" aria-selected="true" data-tab="contenido">Contenido</button>
                <button className="ed-tab" type="button" role="tab" aria-selected="false" data-tab="imagenes">Imágenes</button>
                <button className="ed-tab" type="button" role="tab" aria-selected="false" data-tab="diseno">Diseño</button>
              </div>
              <div className="ed-insp-cuerpo" id="edInspector"></div>
              <p className="formulario-estado ed-insp-estado" id="estadoEstilo" role="status" aria-live="polite" hidden></p>
              <div className="ed-insp-pie">
                <button className="ed-boton-sec" id="btnDescartar" type="button">Descartar</button>
                <button className="ed-boton-verde" id="btnGuardarBorrador" type="button">Guardar borrador</button>
              </div>
            </aside>
          </div>
          <div className="ed-cuerpo ed-marca-vista" id="edMarcaVista" hidden>
            <div className="ed-marca-controles">
              <section className="ed-tarjeta">
                <h2>Colores de la marca</h2>
                <p className="ed-ayuda">Cada color muestra si el texto blanco se lee bien encima. Si no alcanza, te avisamos antes de publicar.</p>
                <div className="ed-colores">
                  <div className="ed-color" data-color="primario">
                    <label className="ed-color-muestra" htmlFor="estiloColorPrimario">
                      <span className="ed-color-contraste" id="contrastePrimario"></span>
                    </label>
                    <input className="ed-color-input" id="estiloColorPrimario" name="primario" type="color" defaultValue="#1f3a2e" />
                    <div className="ed-color-datos">
                      <strong>Primario</strong>
                      <span id="hexPrimario">#1F3A2E · botones, títulos</span>
                      <em id="juicioPrimario"></em>
                    </div>
                    <span className="campo-error" id="errorEstiloColorPrimario"></span>
                  </div>
                  <div className="ed-color" data-color="secundario">
                    <label className="ed-color-muestra" htmlFor="estiloColorSecundario">
                      <span className="ed-color-contraste" id="contrasteSecundario"></span>
                    </label>
                    <input className="ed-color-input" id="estiloColorSecundario" name="secundario" type="color" defaultValue="#3d6b4f" />
                    <div className="ed-color-datos">
                      <strong>Secundario</strong>
                      <span id="hexSecundario">#3D6B4F · hover, íconos</span>
                      <em id="juicioSecundario"></em>
                    </div>
                    <span className="campo-error" id="errorEstiloColorSecundario"></span>
                  </div>
                  <div className="ed-color" data-color="acento">
                    <label className="ed-color-muestra" htmlFor="estiloColorAcento">
                      <span className="ed-color-contraste" id="contrasteAcento"></span>
                    </label>
                    <input className="ed-color-input" id="estiloColorAcento" name="acento" type="color" defaultValue="#4a7c59" />
                    <div className="ed-color-datos">
                      <strong>Acento</strong>
                      <span id="hexAcento">#4A7C59 · detalles, foco</span>
                      <em id="juicioAcento"></em>
                    </div>
                    <span className="campo-error" id="errorEstiloColorAcento"></span>
                  </div>
                </div>
                <div className="ed-paletas" id="edPaletas">
                  <span className="ed-paletas-titulo">Paletas listas</span>
                  <button className="ed-paleta" type="button" data-paleta="bosque">
                    <span className="ed-paleta-puntos"><i style={{ background: '#1f3a2e' }}></i><i style={{ background: '#3d6b4f' }}></i><i style={{ background: '#4a7c59' }}></i></span>Bosque · actual
                  </button>
                  <button className="ed-paleta" type="button" data-paleta="tierra">
                    <span className="ed-paleta-puntos"><i style={{ background: '#2c4a3a' }}></i><i style={{ background: '#8a5a3c' }}></i><i style={{ background: '#c98a4b' }}></i></span>Tierra
                  </button>
                  <button className="ed-paleta" type="button" data-paleta="rocio">
                    <span className="ed-paleta-puntos"><i style={{ background: '#1d3b4a' }}></i><i style={{ background: '#2f6f73' }}></i><i style={{ background: '#5aa19a' }}></i></span>Rocío
                  </button>
                </div>
              </section>
              <section className="ed-tarjeta">
                <h2>Tipografía</h2>
                <p className="ed-ayuda">Dos fuentes bien combinadas alcanzan: una para títulos y otra para lectura.</p>
                <div className="ed-tipografias" id="edTipografias">
                  <button className="ed-tipografia activa" type="button" data-tipografia="bebas-inter" aria-pressed="true">
                    <span className="ed-tipografia-titulo ed-tipo-bebas">Plantas con raíz</span>
                    <span className="ed-tipografia-texto">Cuidamos cada planta como si fuera propia, de la semilla a tu casa.</span>
                    <strong>Bebas Neue + Inter · actual</strong>
                  </button>
                  <button className="ed-tipografia" type="button" data-tipografia="serif-inter" aria-pressed="false">
                    <span className="ed-tipografia-titulo ed-tipo-serif">Plantas con raíz</span>
                    <span className="ed-tipografia-texto">Cuidamos cada planta como si fuera propia, de la semilla a tu casa.</span>
                    <strong>Serif clásica + Inter</strong>
                  </button>
                </div>
              </section>
              <section className="ed-tarjeta ed-tarjeta-fila">
                <div>
                  <h2>Botones y esquinas</h2>
                  <p className="ed-ayuda">Un solo estilo en todo el sitio.</p>
                </div>
                <div className="ed-botones-estilo" id="edBotonesEstilo">
                  <button className="ed-forma activa" type="button" data-botones="redondeado" aria-pressed="true">Redondeado</button>
                  <button className="ed-forma ed-forma-suave" type="button" data-botones="suave" aria-pressed="false">Suave</button>
                  <button className="ed-forma ed-forma-recto" type="button" data-botones="recto" aria-pressed="false">Recto</button>
                </div>
              </section>
            </div>
            <div className="ed-marca-previa">
              <div className="ed-etiqueta">VISTA PREVIA EN VIVO</div>
              <div className="ed-lienzo ed-lienzo-marca" id="edLienzoMarca">
                <iframe className="ed-marco" id="edMarcoMarca" name="zapi-vista-previa" title="Vista previa con la marca" src="about:blank"></iframe>
              </div>
            </div>
          </div>
          <input type="file" id="estiloArchivos" accept="image/jpeg,image/png,image/webp" multiple hidden />
        </form>
      </section>
  )
}

export default PanelEstilo
