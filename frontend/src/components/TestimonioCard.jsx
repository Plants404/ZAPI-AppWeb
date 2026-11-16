// Tarjeta de una opinión de cliente.
function TestimonioCard({ testimonio }) {
  const n = Math.min(5, Math.max(1, Number(testimonio.estrellas) || 5))
  return (
    <article className="resena-tarjeta" role="listitem">
      <p className="resena-estrellas" role="img" aria-label={`${n} de 5 estrellas`}>{'★'.repeat(n) + '☆'.repeat(5 - n)}</p>
      <blockquote className="resena-texto">{testimonio.texto}</blockquote>
      <footer className="resena-autor"><strong>{testimonio.autor}</strong><span>{[testimonio.lugar, testimonio.producto].filter(Boolean).join(' · ')}</span></footer>
    </article>
  )
}

export default TestimonioCard
