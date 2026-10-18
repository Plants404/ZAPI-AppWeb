import re
p='index.html'
s=open(p,encoding='utf-8').read()
pattern=re.compile(r'        <!-- 1\. Propuesta de valor -->\s*\n\s*<div class="nosotros-hero">.*?</div>\s*\n\s*\n        <!-- 2\. El problema vs la solucion -->', re.S)
new='''        <!-- 1. Propuesta de valor -->
        <div class="nosotros-header zapi-hero-banner full-bleed">
          <div class="zapi-hero-content">
            <div class="zapi-hero-badge">
              <span>QUIÉNES SOMOS</span>
            </div>
            <h1 class="zapi-hero-title">
              HACEMOS QUE EMPEZAR TU HUERTA O JARDÍN SEA TAN SIMPLE COMO ABRIR UNA CAJA.
            </h1>
            <p class="zapi-hero-description">
              NO VENDEMOS PLANTAS, VENDEMOS EL PRIMER RINCÓN VERDE PROPIO.
            </p>
          </div>
          <div class="zapi-hero-divider"></div>
          <div class="zapi-hero-trust">
            <div class="zapi-hero-trust-item">
              <div class="zapi-hero-trust-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 11 12 14 22 4"/></svg>
              </div>
              <div class="zapi-hero-trust-text">PAGO SEGURO, GARANTIZADO</div>
            </div>
            <div class="zapi-hero-trust-item">
              <div class="zapi-hero-trust-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="22" height="13" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              </div>
              <div class="zapi-hero-trust-text">ENVÍO GRATUITO EN MONTEVIDEO</div>
            </div>
            <div class="zapi-hero-trust-item">
              <div class="zapi-hero-trust-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 10a6 6 0 0 0-6-6H3v3a6 6 0 0 0 6 6h3"/><path d="M12 10a6 6 0 0 1 6-6h3v3a6 6 0 0 1-6 6h-3"/><path d="M12 10v10"/></svg>
              </div>
              <div class="zapi-hero-trust-text">GARANTÍA DE CRECIMIENTO</div>
            </div>
          </div>
        </div>

        <!-- 2. El problema vs la solucion -->'''
s2=pattern.sub(new,s,count=1)
open(p,'w',encoding='utf-8').write(s2)
print('done')
'''
open('fix_nosotros.py','w',encoding='utf-8').write(s)
