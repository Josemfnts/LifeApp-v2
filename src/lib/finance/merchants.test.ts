import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeConcept,
  matchMerchant,
  merchantLogoUrl,
  suggestCategory,
  learnMerchant,
  SEED_MERCHANTS,
  type Merchant,
} from './merchants.ts'

test('normalizeConcept: literales bancarios reales', () => {
  assert.equal(normalizeConcept('COMPRA TARJ. 4589 MERCADONA S.A. 12/03 MADRID'), 'MERCADONA MADRID')
  assert.equal(normalizeConcept('Recibo Bizum Enviado 12/05'), 'BIZUM ENVIADO')
  assert.equal(normalizeConcept('CARGO RECIBO ENDESA ENERGIA S.A.'), 'ENDESA ENERGIA')
  assert.equal(normalizeConcept('PAGO CONTACTLESS EN MERCADONA'), 'MERCADONA')
  assert.equal(normalizeConcept('COMPRA TARJ ****1234 SPOTIFY 04/04'), 'SPOTIFY')
  assert.equal(normalizeConcept('TRANSFERENCIA BIZUM RECIBIDO'), 'TRANSFERENCIA BIZUM RECIBIDO')
})

test('normalizeConcept: quita sufijos S.A./S.L./S.A.U./S.L.U. sin puntos', () => {
  assert.equal(normalizeConcept('ACME S A'), 'ACME')
  assert.equal(normalizeConcept('ACME S L'), 'ACME')
  assert.equal(normalizeConcept('ACME S A U'), 'ACME')
  assert.equal(normalizeConcept('ACME S L U'), 'ACME')
})

test('normalizeConcept: vacío y entradas inválidas', () => {
  assert.equal(normalizeConcept(''), '')
  assert.equal(normalizeConcept('    '), '')
})

test('normalizeConcept: sin tildes y mayúsculas', () => {
  assert.equal(normalizeConcept('mercádoná'), 'MERCADONA')
  assert.equal(normalizeConcept('MERCAdona'), 'MERCADONA')
})

test('normalizeConcept: fechas dd/mm/yyyy', () => {
  assert.equal(normalizeConcept('compra 12-03-2026 carrefour'), 'CARREFOUR')
  assert.equal(normalizeConcept('compra 12.03.26 carrefour'), 'CARREFOUR')
  assert.equal(normalizeConcept('compra 12/3 carrefour'), 'CARREFOUR')
})

test('normalizeConcept: tarjeta ****XXXX', () => {
  assert.equal(normalizeConcept('PAGO ****1234 SPOTIFY'), 'SPOTIFY')
  assert.equal(normalizeConcept('PAGO *1234 SPOTIFY'), 'SPOTIFY')
  assert.equal(normalizeConcept('PAGO 1234 SPOTIFY'), 'SPOTIFY')
})

test('normalizeConcept: bloque XXXX', () => {
  assert.equal(normalizeConcept('PAGO XXXX1234 SPOTIFY'), 'SPOTIFY')
})

test('matchMerchant: match básico por patrón seed', () => {
  const m = matchMerchant('compra en mercadona', SEED_MERCHANTS)
  assert.ok(m)
  assert.equal(m!.id, 'seed:mercadona')
})

test('matchMerchant: devuelve el patrón más largo', () => {
  const m1: Merchant = { id: 'u:1', name: 'A', patterns: ['MERCADO'] }
  const m2: Merchant = { id: 'u:2', name: 'B', patterns: ['MERCADONA'] }
  const m = matchMerchant('compra mercadona', [m1, m2])
  assert.ok(m)
  assert.equal(m!.id, 'u:2')
})

test('matchMerchant: empate en longitud gana el primero de la lista', () => {
  const m1: Merchant = { id: 'u:1', name: 'A', patterns: ['MERCADO'] }
  const m2: Merchant = { id: 'u:2', name: 'B', patterns: ['MERCADO'] }
  const m = matchMerchant('compra mercado', [m1, m2])
  assert.equal(m!.id, 'u:1')
})

test('matchMerchant: usuario antes que seed', () => {
  const user: Merchant = { id: 'user:1', name: 'Mercadona custom', category: 'Salud', patterns: ['MERCADONA'] }
  const m = matchMerchant('compra mercadona', [user, ...SEED_MERCHANTS])
  assert.equal(m!.id, 'user:1')
})

test('matchMerchant: devuelve null si no hay match', () => {
  const m = matchMerchant('compra en un sitio raro xyz', SEED_MERCHANTS)
  assert.equal(m, null)
})

test('matchMerchant: ignora entradas vacías', () => {
  const m = matchMerchant('', SEED_MERCHANTS)
  assert.equal(m, null)
})

test('merchantLogoUrl: devuelve URL de favicon', () => {
  assert.equal(merchantLogoUrl('mercadona.es'), 'https://www.google.com/s2/favicons?domain=mercadona.es&sz=64')
  assert.equal(merchantLogoUrl(), null)
})

test('suggestCategory: expense encaja con la categoría del comercio', () => {
  const cat = suggestCategory('compra en mercadona', 'expense', SEED_MERCHANTS)
  assert.equal(cat, 'Alimentación')
})

test('suggestCategory: income sin categoría válida cae a Otros ingresos', () => {
  const cat = suggestCategory('compra en mercadona', 'income', SEED_MERCHANTS)
  assert.equal(cat, 'Otros ingresos')
})

test('suggestCategory: expense sin match cae a Otros gastos', () => {
  const cat = suggestCategory('compra en sitio sin nombre', 'expense', SEED_MERCHANTS)
  assert.equal(cat, 'Otros gastos')
})

test('suggestCategory: Bizum no fuerza categoría (su categoría es undefined)', () => {
  const cat = suggestCategory('bizum recibido', 'expense', SEED_MERCHANTS)
  assert.equal(cat, 'Otros gastos')
})

test('suggestCategory: farmacia → Salud', () => {
  const cat = suggestCategory('compra farmacia', 'expense', SEED_MERCHANTS)
  assert.equal(cat, 'Salud')
})

test('learnMerchant: crea un nuevo merchant de usuario para nombre desconocido', () => {
  const out = learnMerchant([], { name: 'Mi tienda local', concept: 'compra en mi tienda local', category: 'Ocio' })
  assert.equal(out.length, 1)
  assert.ok(out[0].id.startsWith('user:'))
  assert.equal(out[0].category, 'Ocio')
  assert.ok(out[0].patterns.length > 0)
})

test('learnMerchant: nombre existente en usuario actualiza categoría y añade patrón', () => {
  const prev: Merchant[] = [{ id: 'user:abc', name: 'Mercadona', category: 'Ropa', patterns: ['MERCADO'] }]
  const out = learnMerchant(prev, { name: 'Mercadona', concept: 'compra mercadona local', category: 'Alimentación' })
  assert.equal(out.length, 1)
  assert.equal(out[0].id, 'user:abc')
  assert.equal(out[0].category, 'Alimentación')
  assert.ok(out[0].patterns.includes('MERCADO'))
})

test('learnMerchant: override de seed usa el mismo id del seed', () => {
  const prev: Merchant[] = []
  const out = learnMerchant(prev, { name: 'Mercadona', concept: 'compra mercadona', category: 'Salud' })
  const m = out[0]
  assert.equal(m.id, 'seed:mercadona')
  assert.equal(m.category, 'Salud')
  assert.ok(m.patterns.length > 0)
})

test('learnMerchant: dominio se guarda si llega', () => {
  const out = learnMerchant([], { name: 'Mi tienda', concept: 'compra en mi tienda', category: 'Ocio', domain: 'mitienda.es' })
  assert.equal(out[0].domain, 'mitienda.es')
})

test('SEED_MERCHANTS: tiene al menos los 60 comercios de la spec', () => {
  const required = [
    'Mercadona', 'Carrefour', 'Lidl', 'Aldi', 'Dia', 'Eroski', 'Alcampo', 'Consum',
    'Hipercor', 'El Corte Inglés', 'Amazon', 'AliExpress', 'Zara', 'Primark', 'H&M',
    'Decathlon', 'IKEA', 'Leroy Merlin', 'MediaMarkt', 'PcComponentes', 'Netflix',
    'Spotify', 'HBO Max', 'Disney+', 'Prime Video', 'Apple', 'Google', 'YouTube',
    'Movistar', 'Vodafone', 'Orange', 'Digi', 'MásMóvil', 'Iberdrola', 'Endesa',
    'Naturgy', 'Holaluz', 'Repsol', 'Cepsa', 'BP', 'Galp', 'Renfe', 'Uber',
    'Cabify', 'Bolt', 'FREE NOW', 'Glovo', 'Just Eat', 'Uber Eats', "McDonald's",
    'Burger King', 'Telepizza', 'Starbucks', 'Ryanair', 'Vueling', 'Iberia',
    'Booking', 'Airbnb', 'Basic-Fit', 'Mapfre', 'Mutua Madrileña', 'Farmacia', 'Bizum',
  ]
  const names = SEED_MERCHANTS.map(m => m.name)
  for (const req of required) {
    assert.ok(names.includes(req), `Falta ${req} en SEED_MERCHANTS`)
  }
})
