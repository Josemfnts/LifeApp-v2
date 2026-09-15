export interface Merchant {
  id: string
  name: string
  domain?: string
  category?: string
  patterns: string[]
}

const STOP_WORDS = new Set([
  'COMPRA', 'TARJ', 'TARJETA', 'RECIBO', 'PAGO', 'CARGO', 'ADEUDO',
  'TRANSACCION', 'CONTACTLESS', 'EN', 'DE', 'CON', 'NUM',
])

const SOCIETARY_SUFFIXES = ['S.A.U.', 'S.L.U.', 'S.A.', 'S.L.', 'SAU', 'SA', 'SL']

const INCOME_CATEGORIES = new Set(['Nómina', 'Freelance', 'Otros ingresos'])
const EXPENSE_CATEGORIES = new Set([
  'Vivienda', 'Alimentación', 'Transporte', 'Salud', 'Ocio', 'Ropa',
  'Suscripciones', 'Deporte', 'Restaurantes', 'Viajes', 'Educación',
  'Ahorro', 'Otros gastos',
])

function noDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function collapseSpaces(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

function stripSocietary(tokens: string[]): string[] {
  const out: string[] = []
  let i = 0
  while (i < tokens.length) {
    const a = tokens[i]
    const b = tokens[i + 1]
    if (b !== undefined && SOCIETARY_SUFFIXES.includes(`${a}.${b}`)) {
      i += 2
      continue
    }
    if (b !== undefined && a === 'S' && (b === 'A' || b === 'L')) {
      const c = tokens[i + 2]
      if (c === 'U') {
        i += 3
        continue
      }
      i += 2
      continue
    }
    if (SOCIETARY_SUFFIXES.includes(a)) {
      i += 1
      continue
    }
    out.push(a)
    i += 1
  }
  return out
}

export function normalizeConcept(raw: string): string {
  if (!raw) return ''
  let s = noDiacritics(raw).toUpperCase()
  s = s.replace(/\d{1,2}[/.-]\d{1,2}([/.-]\d{2,4})?/g, ' ')
  s = s.replace(/\*{0,4}\d{4}/g, ' ')
  s = s.replace(/X{4,}/g, ' ')
  s = s.replace(/[^A-Z0-9\s]/g, ' ')
  const tokens = collapseSpaces(s).split(' ').filter(Boolean)
  const filtered = stripSocietary(tokens).filter(t => !STOP_WORDS.has(t))
  return collapseSpaces(filtered.join(' '))
}

interface Seed {
  id: string
  name: string
  domain?: string
  category?: string
  patterns: string[]
}

const SEED_RAW: Seed[] = [
  { id: 'seed:mercadona',     name: 'Mercadona',     domain: 'mercadona.es',     category: 'Alimentación',    patterns: ['MERCADONA'] },
  { id: 'seed:carrefour',      name: 'Carrefour',     domain: 'carrefour.es',     category: 'Alimentación',    patterns: ['CARREFOUR'] },
  { id: 'seed:lidl',           name: 'Lidl',          domain: 'lidl.es',          category: 'Alimentación',    patterns: ['LIDL'] },
  { id: 'seed:aldi',           name: 'Aldi',          domain: 'aldi.es',          category: 'Alimentación',    patterns: ['ALDI'] },
  { id: 'seed:dia',            name: 'Dia',           domain: 'dia.es',           category: 'Alimentación',    patterns: ['DIA'] },
  { id: 'seed:eroski',         name: 'Eroski',        domain: 'eroski.es',        category: 'Alimentación',    patterns: ['EROSKI'] },
  { id: 'seed:alcampo',        name: 'Alcampo',       domain: 'alcampo.es',       category: 'Alimentación',    patterns: ['ALCAMPO'] },
  { id: 'seed:consum',         name: 'Consum',        domain: 'consum.es',        category: 'Alimentación',    patterns: ['CONSUM'] },
  { id: 'seed:hipercor',       name: 'Hipercor',      domain: 'hipercor.es',      category: 'Alimentación',    patterns: ['HIPERCOR'] },
  { id: 'seed:corteingles',    name: 'El Corte Inglés', domain: 'elcorteingles.es', category: 'Ropa',         patterns: ['EL CORTE INGLES', 'CORTE INGLES'] },
  { id: 'seed:amazon',         name: 'Amazon',        domain: 'amazon.es',        category: 'Ocio',            patterns: ['AMAZON'] },
  { id: 'seed:aliexpress',     name: 'AliExpress',    domain: 'aliexpress.com',   category: 'Ocio',            patterns: ['ALIEXPRESS'] },
  { id: 'seed:zara',           name: 'Zara',          domain: 'zara.com',         category: 'Ropa',            patterns: ['ZARA'] },
  { id: 'seed:primark',        name: 'Primark',       domain: 'primark.com',      category: 'Ropa',            patterns: ['PRIMARK'] },
  { id: 'seed:hm',             name: 'H&M',           domain: 'hm.com',           category: 'Ropa',            patterns: ['H M', 'HM'] },
  { id: 'seed:decathlon',      name: 'Decathlon',     domain: 'decathlon.es',     category: 'Deporte',         patterns: ['DECATHLON'] },
  { id: 'seed:ikea',           name: 'IKEA',          domain: 'ikea.com',         category: 'Vivienda',        patterns: ['IKEA'] },
  { id: 'seed:leroymerlin',    name: 'Leroy Merlin',  domain: 'leroymerlin.es',   category: 'Vivienda',        patterns: ['LEROY MERLIN'] },
  { id: 'seed:mediamarkt',     name: 'MediaMarkt',    domain: 'mediamarkt.es',    category: 'Ocio',            patterns: ['MEDIAMARKT'] },
  { id: 'seed:pccomponentes',  name: 'PcComponentes', domain: 'pccomponentes.com', category: 'Ocio',          patterns: ['PCCOMPONENTES'] },
  { id: 'seed:netflix',        name: 'Netflix',       domain: 'netflix.com',      category: 'Suscripciones',   patterns: ['NETFLIX'] },
  { id: 'seed:spotify',        name: 'Spotify',       domain: 'spotify.com',      category: 'Suscripciones',   patterns: ['SPOTIFY'] },
  { id: 'seed:hbomax',         name: 'HBO Max',       domain: 'max.com',          category: 'Suscripciones',   patterns: ['HBO', 'HBO MAX'] },
  { id: 'seed:disneyplus',     name: 'Disney+',       domain: 'disneyplus.com',   category: 'Suscripciones',   patterns: ['DISNEY'] },
  { id: 'seed:primevideo',     name: 'Prime Video',   domain: 'primevideo.com',   category: 'Suscripciones',   patterns: ['PRIME VIDEO', 'AMAZON PRIME'] },
  { id: 'seed:apple',          name: 'Apple',         domain: 'apple.com',        category: 'Ocio',            patterns: ['APPLE'] },
  { id: 'seed:google',         name: 'Google',        domain: 'google.com',       category: 'Suscripciones',   patterns: ['GOOGLE'] },
  { id: 'seed:youtube',        name: 'YouTube',       domain: 'youtube.com',      category: 'Suscripciones',   patterns: ['YOUTUBE'] },
  { id: 'seed:movistar',       name: 'Movistar',      domain: 'movistar.es',      category: 'Suscripciones',   patterns: ['MOVISTAR'] },
  { id: 'seed:vodafone',       name: 'Vodafone',      domain: 'vodafone.es',      category: 'Suscripciones',   patterns: ['VODAFONE'] },
  { id: 'seed:orange',         name: 'Orange',        domain: 'orange.es',        category: 'Suscripciones',   patterns: ['ORANGE'] },
  { id: 'seed:digi',           name: 'Digi',          domain: 'digi.es',          category: 'Suscripciones',   patterns: ['DIGI'] },
  { id: 'seed:masmovil',       name: 'MásMóvil',      domain: 'masmovil.es',      category: 'Suscripciones',   patterns: ['MAS MOVIL', 'MASMOVIL'] },
  { id: 'seed:iberdrola',      name: 'Iberdrola',     domain: 'iberdrola.es',     category: 'Vivienda',        patterns: ['IBERDROLA'] },
  { id: 'seed:endesa',         name: 'Endesa',        domain: 'endesa.com',       category: 'Vivienda',        patterns: ['ENDESA'] },
  { id: 'seed:naturgy',        name: 'Naturgy',       domain: 'naturgy.es',       category: 'Vivienda',        patterns: ['NATURGY'] },
  { id: 'seed:holaluz',        name: 'Holaluz',       domain: 'holaluz.com',      category: 'Vivienda',        patterns: ['HOLALUZ'] },
  { id: 'seed:repsol',         name: 'Repsol',        domain: 'repsol.es',        category: 'Transporte',      patterns: ['REPSOL'] },
  { id: 'seed:cepsa',          name: 'Cepsa',         domain: 'cepsa.es',         category: 'Transporte',      patterns: ['CEPSA'] },
  { id: 'seed:bp',             name: 'BP',            domain: 'bp.com',           category: 'Transporte',      patterns: ['BP'] },
  { id: 'seed:galp',           name: 'Galp',          domain: 'galp.com',         category: 'Transporte',      patterns: ['GALP'] },
  { id: 'seed:renfe',          name: 'Renfe',         domain: 'renfe.com',        category: 'Transporte',      patterns: ['RENFE'] },
  { id: 'seed:uber',           name: 'Uber',          domain: 'uber.com',         category: 'Transporte',      patterns: ['UBER'] },
  { id: 'seed:cabify',         name: 'Cabify',        domain: 'cabify.com',       category: 'Transporte',      patterns: ['CABIFY'] },
  { id: 'seed:bolt',           name: 'Bolt',          domain: 'bolt.eu',          category: 'Transporte',      patterns: ['BOLT'] },
  { id: 'seed:freenow',        name: 'FREE NOW',      domain: 'free-now.com',     category: 'Transporte',      patterns: ['FREE NOW'] },
  { id: 'seed:glovo',          name: 'Glovo',         domain: 'glovoapp.com',     category: 'Restaurantes',    patterns: ['GLOVO'] },
  { id: 'seed:justeat',        name: 'Just Eat',      domain: 'justeat.es',       category: 'Restaurantes',    patterns: ['JUST EAT'] },
  { id: 'seed:ubereats',       name: 'Uber Eats',     domain: 'ubereats.com',     category: 'Restaurantes',    patterns: ['UBER EATS'] },
  { id: 'seed:mcdonalds',      name: "McDonald's",    domain: 'mcdonalds.es',     category: 'Restaurantes',    patterns: ['MCDONALDS'] },
  { id: 'seed:burgerking',     name: 'Burger King',   domain: 'burgerking.es',    category: 'Restaurantes',    patterns: ['BURGER KING'] },
  { id: 'seed:telepizza',      name: 'Telepizza',     domain: 'telepizza.es',     category: 'Restaurantes',    patterns: ['TELEPIZZA'] },
  { id: 'seed:starbucks',      name: 'Starbucks',     domain: 'starbucks.es',     category: 'Restaurantes',    patterns: ['STARBUCKS'] },
  { id: 'seed:ryanair',        name: 'Ryanair',       domain: 'ryanair.com',      category: 'Viajes',          patterns: ['RYANAIR'] },
  { id: 'seed:vueling',        name: 'Vueling',       domain: 'vueling.com',      category: 'Viajes',          patterns: ['VUELING'] },
  { id: 'seed:iberia',         name: 'Iberia',        domain: 'iberia.com',       category: 'Viajes',          patterns: ['IBERIA'] },
  { id: 'seed:booking',        name: 'Booking',       domain: 'booking.com',      category: 'Viajes',          patterns: ['BOOKING'] },
  { id: 'seed:airbnb',         name: 'Airbnb',        domain: 'airbnb.com',       category: 'Viajes',          patterns: ['AIRBNB'] },
  { id: 'seed:basicfit',       name: 'Basic-Fit',     domain: 'basic-fit.com',    category: 'Deporte',         patterns: ['BASIC FIT'] },
  { id: 'seed:mapfre',         name: 'Mapfre',        domain: 'mapfre.es',        category: 'Otros gastos',    patterns: ['MAPFRE'] },
  { id: 'seed:mutua',          name: 'Mutua Madrileña', domain: 'mutua.es',       category: 'Otros gastos',    patterns: ['MUTUA MADRILEÑA', 'MUTUA MADRILE', 'MUTUA'] },
  { id: 'seed:farmacia',       name: 'Farmacia',                          category: 'Salud',           patterns: ['FARMACIA'] },
  { id: 'seed:bizum',          name: 'Bizum',                             category: undefined,       patterns: ['BIZUM'] },
]

export const SEED_MERCHANTS: Merchant[] = SEED_RAW.map(s => ({
  id: s.id,
  name: s.name,
  domain: s.domain,
  category: s.category,
  patterns: s.patterns.map(p => normalizeConcept(p)),
}))

export function matchMerchant(concept: string, merchants: Merchant[]): Merchant | null {
  const norm = normalizeConcept(concept)
  if (!norm) return null
  // Coincidencia por palabras completas: con includes() a secas "PELUQUERIA DIANA" era Dia
  // y "PINEAPPLE" era Apple.
  const padded = ` ${norm} `
  let best: { merchant: Merchant; len: number; index: number } | null = null
  for (let i = 0; i < merchants.length; i++) {
    const m = merchants[i]
    for (const pat of m.patterns) {
      const tokenized = pat
      if (!tokenized) continue
      if (padded.includes(` ${tokenized} `)) {
        if (best === null || tokenized.length > best.len || (tokenized.length === best.len && i < best.index)) {
          best = { merchant: m, len: tokenized.length, index: i }
        }
      }
    }
  }
  return best ? best.merchant : null
}

export function merchantLogoUrl(domain?: string): string | null {
  if (!domain) return null
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
}

export function suggestCategory(
  concept: string,
  type: 'income' | 'expense',
  merchants: Merchant[]
): string {
  const m = matchMerchant(concept, merchants)
  const cat = m?.category
  if (cat) {
    if (type === 'income' && INCOME_CATEGORIES.has(cat)) return cat
    if (type === 'expense' && EXPENSE_CATEGORIES.has(cat)) return cat
  }
  return type === 'income' ? 'Otros ingresos' : 'Otros gastos'
}

function randomUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function sameName(a: string, b: string): boolean {
  return normalizeConcept(a) === normalizeConcept(b)
}

function patternFor(input: string): string {
  const norm = normalizeConcept(input)
  const tokens = norm.split(' ')
  if (tokens.length === 0) return ''
  const longest = tokens.reduce((a, b) => (b.length > a.length ? b : a), '')
  return longest
}

export function learnMerchant(
  userMerchants: Merchant[],
  data: { name: string; concept: string; category: string; domain?: string }
): Merchant[] {
  const newPattern = patternFor(`${data.name} ${data.concept}`)
  if (!newPattern) return userMerchants
  const idx = userMerchants.findIndex(m => sameName(m.name, data.name))
  if (idx >= 0) {
    const next = [...userMerchants]
    const m = next[idx]
    const patterns = m.patterns.includes(newPattern) ? m.patterns : [...m.patterns, newPattern]
    next[idx] = { ...m, category: data.category, domain: data.domain ?? m.domain, patterns }
    return next
  }
  const seedMatch = SEED_MERCHANTS.find(m => sameName(m.name, data.name))
  const id = seedMatch ? seedMatch.id : `user:${randomUUID()}`
  const patterns = seedMatch && seedMatch.patterns.includes(newPattern) ? seedMatch.patterns : [newPattern]
  const created: Merchant = {
    id,
    name: data.name,
    domain: data.domain ?? seedMatch?.domain,
    category: data.category,
    patterns,
  }
  return [...userMerchants, created]
}
