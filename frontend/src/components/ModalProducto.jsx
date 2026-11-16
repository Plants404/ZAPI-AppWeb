function ModalProducto() {
  return (
      <dialog className="modal-producto" id="modalProducto" aria-labelledby="modalTitulo">
        <div className="modal-fondo" data-cerrar-modal=""></div>
        <div className="modal-caja" role="dialog" aria-modal="true" aria-labelledby="modalTitulo" tabIndex="-1">
          <button className="icono-boton modal-cerrar" type="button" data-cerrar-modal="" aria-label="Cerrar detalle del producto">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
          <div className="modal-carrusel modal-galeria" id="modalCarrusel">
            <div className="carrusel-marco modal-foto">
              <img className="carrusel-img" id="carruselImg" src="" alt="" />
              <button className="carrusel-flecha carrusel-prev" type="button" aria-label="Foto anterior">
                <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
              </button>
              <button className="carrusel-flecha carrusel-next" type="button" aria-label="Foto siguiente">
                <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
              </button>
              <span className="carrusel-contador" id="carruselContador" aria-live="polite"></span>
            </div>
            <div className="carrusel-miniaturas" id="carruselMiniaturas" aria-label="Miniaturas del producto"></div>
          </div>
          <div className="modal-detalle">
            <span className="modal-categoria etiqueta" id="modalCategoria"></span>
            <h2 className="modal-titulo" id="modalTitulo"></h2>
            <p className="modal-descripcion" id="modalDescripcion"></p>
            <ul className="modal-info lista-ventajas" id="modalInfo"></ul>
            <p className="modal-precio">
              <span className="current" id="modalPrecio"></span>
            </p>
            <p className="modal-stock stock" id="modalStock"></p>
            <button className="modal-agregar add-cart boton boton-primario" type="button" id="modalAgregar" data-id="">
              <span className="material-symbols-outlined" aria-hidden="true">add_shopping_cart</span> Agregar al carrito
            </button>
            <a className="modal-ficha enlace-flecha" id="modalFicha" hidden>Ver la ficha completa <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></a>
          </div>
        </div>
      </dialog>
  )
}

export default ModalProducto
