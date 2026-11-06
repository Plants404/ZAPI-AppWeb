'use strict';

const { NEGOCIO } = require('../../public/js/negocio.js');
module.exports = {
    archivo: '404.html',
    seccion: '404',
    titulo: '404 | ZAPI Vivero Agroecológico',
    descripcion: 'La página que buscás no existe o cambió de lugar. Volvé al inicio de ZAPI.',
    robots: 'noindex, follow',
    canonical: `${NEGOCIO.sitio}/404.html`,
    contenido: `
<section class="pagina-404">
    <div class="ilustracion-404" aria-hidden="true">
        <span class="digito-404">4</span>
        <svg class="planta-404" viewBox="0 0 200 260" focusable="false">
            <g class="maceta-404">
                <path class="maceta-cuerpo" d="M44 176 L156 176 L140 246 c-2 8 -9 12 -17 12 H77 c-8 0 -15 -4 -17 -12 Z"/>
                <ellipse class="maceta-borde" cx="100" cy="176" rx="58" ry="13"/>
                <ellipse class="maceta-tierra" cx="100" cy="177" rx="48" ry="10"/>
            </g>
            <g class="tallo-404">
                <path class="tallo" d="M100 178 C 93 146, 107 112, 100 82 C 95 58, 104 50, 100 42"/>
                <g transform="translate(100,146) rotate(-34)">
                    <path class="hoja" d="M0 0 C 12 -13, 35 -13, 46 0 C 35 13, 12 13, 0 0 Z"/>
                </g>
                <g transform="translate(100,124) rotate(212) scale(.95)">
                    <path class="hoja" d="M0 0 C 12 -13, 35 -13, 46 0 C 35 13, 12 13, 0 0 Z"/>
                </g>
                <g transform="translate(100,102) rotate(-42) scale(.95)">
                    <path class="hoja" d="M0 0 C 12 -13, 35 -13, 46 0 C 35 13, 12 13, 0 0 Z"/>
                </g>
                <g transform="translate(100,82) rotate(206) scale(.9)">
                    <path class="hoja" d="M0 0 C 12 -13, 35 -13, 46 0 C 35 13, 12 13, 0 0 Z"/>
                </g>
                <g transform="translate(100,42)">
                    <path class="brote-404" d="M0 0 C -10 -12, -8 -28, 0 -34 C 8 -28, 10 -12, 0 0 Z"/>
                </g>
            </g>
        </svg>
        <span class="digito-404">4</span>
    </div>

    <span class="etiqueta">Error 404</span>
    <h1>Esta planta aún no brotó</h1>
    <p>La página que buscás no existe o cambió de lugar. Volvamos a sembrar desde el inicio.</p>

    <div class="acciones-404">
        <a class="boton boton-primario" href="./index.html">Volver al inicio</a>
        <a class="boton boton-secundario" href="./catalogo.html">Explorar catálogo</a>
    </div>
</section>`,
    scripts: []
};
