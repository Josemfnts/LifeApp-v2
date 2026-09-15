// Regresiones de la revisión de F2a: reconocimiento de comercios por palabras completas.
import test from 'node:test'
import assert from 'node:assert/strict'
import { matchMerchant, suggestCategory, SEED_MERCHANTS, type Merchant } from './merchants.ts'

test('matchMerchant: no confunde subcadenas con comercios cortos', () => {
  assert.equal(matchMerchant('PELUQUERIA DIANA', SEED_MERCHANTS), null)
  assert.equal(matchMerchant('ZUMO PINEAPPLE', SEED_MERCHANTS), null)
  assert.equal(matchMerchant('TALLER BBPP MOTOR', SEED_MERCHANTS), null)
})

test('matchMerchant: sigue reconociendo literales bancarios reales', () => {
  assert.equal(matchMerchant('COMPRA TARJ. 4589 MERCADONA S.A. 12/03 MADRID', SEED_MERCHANTS)?.id, 'seed:mercadona')
  assert.equal(matchMerchant('SUPERMERCADO DIA 1234 SEVILLA', SEED_MERCHANTS)?.id, 'seed:dia')
  assert.equal(matchMerchant('GASOLINERA BP ALCOBENDAS', SEED_MERCHANTS)?.id, 'seed:bp')
  assert.equal(matchMerchant('UBER EATS PEDIDO', SEED_MERCHANTS)?.id, 'seed:ubereats')
})

test('matchMerchant: override de usuario gana al seed si va primero', () => {
  const user: Merchant[] = [{ id: 'seed:amazon', name: 'Amazon', category: 'Educación', patterns: ['AMAZON'] }]
  const m = matchMerchant('AMAZON MARKETPLACE', [...user, ...SEED_MERCHANTS])
  assert.equal(m?.category, 'Educación')
})

test('seed: todas las categorías existen en la app', () => {
  const validas = new Set(['Nómina', 'Freelance', 'Otros ingresos', 'Vivienda', 'Alimentación', 'Transporte', 'Salud', 'Ocio', 'Ropa', 'Suscripciones', 'Deporte', 'Restaurantes', 'Viajes', 'Educación', 'Ahorro', 'Otros gastos'])
  for (const m of SEED_MERCHANTS) {
    if (m.category) assert.ok(validas.has(m.category), `${m.name}: categoría inexistente "${m.category}"`)
  }
  assert.equal(suggestCategory('IKEA ALCORCON', 'expense', SEED_MERCHANTS), 'Vivienda')
})
