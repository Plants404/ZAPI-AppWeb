// Verifica que cada ícono Material Symbols usado en el código exista en la fuente.
// Un nombre inválido se vería como texto suelto en pantalla. Uso: npm run lint:iconos
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const tipos = readFileSync(new URL('../node_modules/material-symbols/index.d.ts', import.meta.url), 'utf8')
const validos = new Set([...tipos.matchAll(/"([a-z0-9_]+)"/g)].map(m => m[1]))

function archivos(dir) {
  return readdirSync(dir).flatMap(nombre => {
    const ruta = join(dir, nombre)
    if (statSync(ruta).isDirectory()) return archivos(ruta)
    return /\.(jsx?|html)$/.test(nombre) ? [ruta] : []
  })
}

const patron = /material-symbols-outlined[^>]*>\s*([a-z0-9_]+)\s*</g
const malos = []
let total = 0
for (const ruta of archivos(new URL('../src', import.meta.url).pathname)) {
  const texto = readFileSync(ruta, 'utf8')
  for (const m of texto.matchAll(patron)) {
    total += 1
    if (!validos.has(m[1])) malos.push(`${ruta}: "${m[1]}"`)
  }
}
if (malos.length) {
  console.error('Íconos inexistentes:\n' + malos.join('\n'))
  process.exit(1)
}
console.log(`Íconos revisados: ${total}, todos válidos.`)
