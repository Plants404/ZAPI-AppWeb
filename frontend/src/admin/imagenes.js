// Reduce una foto (lado más largo = "lado" px) y la devuelve como JPEG: livianas para el sitio y para la base.
export async function reducirImagen(archivo, lado = 1200) {
  const bitmap = await createImageBitmap(archivo)
  const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height))
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.max(1, Math.round(bitmap.width * escala))
  lienzo.height = Math.max(1, Math.round(bitmap.height * escala))
  const contexto = lienzo.getContext('2d')
  contexto.fillStyle = '#ffffff'
  contexto.fillRect(0, 0, lienzo.width, lienzo.height)
  contexto.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height)
  bitmap.close()
  return new Promise((resolver, rechazar) => {
    lienzo.toBlob(blob => (blob ? resolver(blob) : rechazar(new Error('No se pudo procesar la imagen.'))), 'image/jpeg', 0.85)
  })
}
