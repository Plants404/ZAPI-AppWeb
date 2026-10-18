import re
p='index.html'
s=open(p,encoding='utf-8').read()
pattern=re.compile(r'<section class="section call-to-actions-view hidden" id="contacto">.*?</section>', re.S)
new='''    <section class="section call-to-actions-view hidden" id="contacto">
  <div class="contacto-header zapi-hero-banner full-bleed">
    <div class="zapi-hero-content">
      <div class="zapi-hero-badge">
        <span>CONTACTO</span>
      </div>
      <h1 class="zapi-hero-title">
        EMPEZÁ HOY A TRANSFORMAR TUS ESPACIOS
      </h1>
      <p class="zapi-hero-description">
        Descubrí una nueva forma de conectar con la naturaleza mediante soluciones diseñadas para acompañarte en cada etapa del proceso.
      </p>
    </div>
    <div class="zapi-hero-divider"></div>
    <div class="zapi-hero-trust">
      <div class="zapi-hero-trust-heading">ATENCIÓN DIRECTA</div>
      <div class="zapi-hero-trust-item">
        <div class="zapi-hero-trust-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <div class="zapi-hero-trust-text">Presupuesto claro y personalizado</div>
      </div>
      <div class="zapi-hero-trust-item">
        <div class="zapi-hero-trust-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div class="zapi-hero-trust-text">Asesoramiento agroecológico dedicado</div>
      </div>
      <div class="zapi-hero-trust-item">
        <div class="zapi-hero-trust-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <div class="zapi-hero-trust-text">Atención cercana en Montevideo</div>
      </div>
    </div>
  </div>
  <div class="contacto-card-container">
    <div class="contacto-card">
      <div class="contacto-card-header">
        <span class="contacto-card-subtitle">ESCRIBINOS</span>
        <h2 class="contacto-card-title">Contanos qué necesitás y te respondemos a la brevedad.</h2>
      </div>
      <form id="form-contacto" class="contacto-form">
        <div class="form-row">
          <div class="form-group">
            <label for="contacto-nombre">Nombre *</label>
            <input type="text" id="contacto-nombre" name="nombre" placeholder="Tu nombre y apellido" required />
          </div>
          <div class="form-group">
            <label for="contacto-email">Correo electrónico *</label>
            <input type="email" id="contacto-email" name="email" placeholder="tunombre@correo.com" required />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="contacto-asunto">Asunto *</label>
            <input type="text" id="contacto-asunto" name="asunto" placeholder="¿Sobre qué querés escribirnos?" required />
          </div>
          <div class="form-group">
            <label for="contacto-telefono">Teléfono (opcional)</label>
            <input type="tel" id="contacto-telefono" name="telefono" placeholder="098 765 432" />
          </div>
        </div>
        <div class="form-group full-width">
          <label for="contacto-mensaje">Mensaje *</label>
          <textarea id="contacto-mensaje" name="mensaje" rows="4" placeholder="Contanos qué necesitás: una planta para un espacio, un proyecto de jardín, un presupuesto..." required></textarea>
        </div>
        <div class="form-footer">
          <p class="privacy-note">
            Tus datos solo se usan para responderte esta consulta. Los campos con * son obligatorios.
          </p>
          <button type="submit" class="btn-submit">
            Enviar mensaje
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </form>
    </div>
  </div>
</section>'''
s2=pattern.sub(new,s,count=1)
open(p,'w',encoding='utf-8').write(s2)
print('done')
'''
open('fix_contacto.py','w',encoding='utf-8').write(s)
