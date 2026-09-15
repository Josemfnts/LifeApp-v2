import test from 'node:test'
import assert from 'node:assert/strict'
import { parseN43, isN43, _internal } from './n43.ts'

const { pad, sliceAt, aammddToIso } = _internal

function replaceAt(line: string, start1: number, value: string): string {
  return line.slice(0, start1 - 1) + value + line.slice(start1 - 1 + value.length)
}

function reg11(opts: {
  cuenta: string
  fechaIni: string
  fechaFin: string
  saldo: number
  nombre?: string
}): string {
  const s = String(Math.round(Math.abs(opts.saldo) * 100)).padStart(14, '0')
  const sign = opts.saldo < 0 ? '1' : '2'
  return (
    '11' +
    '2030' +
    '1234' +
    opts.cuenta.padEnd(10, ' ').slice(0, 10) +
    opts.fechaIni.padStart(6, '0').slice(0, 6) +
    opts.fechaFin.padStart(6, '0').slice(0, 6) +
    sign +
    s +
    '978' +
    '1' +
    (opts.nombre ?? 'TEST').padEnd(26, ' ').slice(0, 26)
  )
}

function reg22(opts: {
  fechaOp: string
  fechaValor?: string
  importe: number
  comunes?: string
  propio?: string
  doc?: string
  ref1?: string
  ref2?: string
}): string {
  const absCents = Math.round(Math.abs(opts.importe) * 100)
  const dh = opts.importe < 0 ? '1' : '2'
  const impStr = String(absCents).padStart(14, '0')
  return (
    '22' +
    '1234' +
    '1234' +
    opts.fechaOp.padStart(6, '0').slice(0, 6) +
    (opts.fechaValor ?? opts.fechaOp).padStart(6, '0').slice(0, 6) +
    pad(opts.comunes ?? '', 2) +
    pad(opts.propio ?? '', 3) +
    dh +
    impStr +
    pad(opts.doc ?? '', 10) +
    pad(opts.ref1 ?? '', 12) +
    pad(opts.ref2 ?? '', 16)
  )
}

function reg23(opts: { codigo?: string; texto1?: string; texto2?: string }): string {
  return (
    '23' +
    pad(opts.codigo ?? '01', 2) +
    pad(opts.texto1 ?? '', 38) +
    pad(opts.texto2 ?? '', 38)
  )
}

function reg33(opts: {
  cuenta: string
  numDebe: number
  totalDebe: number
  numHaber: number
  totalHaber: number
  saldoFinal: number
}): string {
  const tdCents = String(Math.round(opts.totalDebe * 100)).padStart(14, '0')
  const thCents = String(Math.round(opts.totalHaber * 100)).padStart(14, '0')
  const sfCents = String(Math.round(Math.abs(opts.saldoFinal) * 100)).padStart(14, '0')
  const sfSign = opts.saldoFinal < 0 ? '1' : '2'
  return (
    '33' +
    '2030' +
    '1234' +
    opts.cuenta.padEnd(10, ' ').slice(0, 10) +
    String(opts.numDebe).padStart(5, '0') +
    tdCents +
    String(opts.numHaber).padStart(5, '0') +
    thCents +
    sfSign +
    sfCents +
    '978' +
    '    '
  )
}

const REG88 = '88'.padEnd(80, ' ')

function buildFile(opts: {
  cuenta: string
  ini: number
  fin: number
  movimientos: Array<{ importe: number; fechaOp: string; fechaValor?: string; doc?: string; ref1?: string; comunes?: string; propio?: string; extra?: Array<{ texto1?: string; texto2?: string }> }>
}): string {
  const lines: string[] = []
  const fechaIni = '260101'
  const fechaFin = '261231'
  lines.push(reg11({ cuenta: opts.cuenta, fechaIni, fechaFin, saldo: opts.ini, nombre: 'TEST USER' }))
  for (const m of opts.movimientos) {
    lines.push(reg22({
      fechaOp: m.fechaOp,
      fechaValor: m.fechaValor,
      importe: m.importe,
      doc: m.doc,
      ref1: m.ref1,
      comunes: m.comunes,
      propio: m.propio,
    }))
    for (const ex of m.extra ?? []) lines.push(reg23(ex))
  }
  const totalDebe = opts.movimientos.filter(m => m.importe < 0).reduce((s, m) => s + Math.abs(m.importe), 0)
  const totalHaber = opts.movimientos.filter(m => m.importe > 0).reduce((s, m) => s + m.importe, 0)
  const numDebe = opts.movimientos.filter(m => m.importe < 0).length
  const numHaber = opts.movimientos.filter(m => m.importe > 0).length
  lines.push(reg33({
    cuenta: opts.cuenta,
    numDebe,
    totalDebe,
    numHaber,
    totalHaber,
    saldoFinal: opts.fin,
  }))
  lines.push(REG88)
  return lines.join('\n')
}

test('helpers: pad y sliceAt y aammddToIso', () => {
  assert.equal(pad('AB', 5), 'AB   ')
  assert.equal(sliceAt('ABCDEF', 2, 4), 'BCD')
  assert.equal(aammddToIso('260115'), '2026-01-15')
  assert.equal(aammddToIso('991231'), '1999-12-31')
  assert.equal(aammddToIso('000101'), '2000-01-01')
  assert.equal(aammddToIso('800101'), '1980-01-01')
  assert.equal(aammddToIso('xx'), null)
})

test('parseN43: fichero que cuadra (1 cargo, 1 abono, 2 con 23)', () => {
  const text = buildFile({
    cuenta: '1234567890',
    ini: 1000,
    fin: 1000 + (-200) + 50, // 850
    movimientos: [
      { importe: -200, fechaOp: '260115', doc: 'RECIBO12345', extra: [{ texto1: 'COMPRA MERCADONA', texto2: 'POZUELO' }] },
      { importe: -50, fechaOp: '260120', doc: 'RECIBO67890', ref1: 'REF' },
      { importe: 100, fechaOp: '260201', doc: 'NOMINA' },
    ],
  })
  const r = parseN43(text)
  assert.equal(r.format, 'n43')
  assert.equal(r.rows.length, 3)
  assert.equal(r.rows[0].date, '2026-01-15')
  assert.equal(r.rows[0].amount, -200)
  // El concepto sale de los registros 23, sin el ruido de documento y referencias
  assert.equal(r.rows[0].concept, 'COMPRA MERCADONA POZUELO')
  assert.equal(r.rows[1].concept, 'REF')
  assert.equal(r.rows[2].amount, 100)
  assert.equal(r.rows[2].concept, 'NOMINA')
  assert.equal(r.check?.ok, true)
  assert.equal(r.finalBalance, 850)
  assert.equal(r.accountId, '1234567890')
})

test('parseN43: totales no cuadran -> check.ok=false y mensaje', () => {
  const text = buildFile({
    cuenta: '1234567890',
    ini: 1000,
    fin: 800,
    movimientos: [
      { importe: -200, fechaOp: '260115', doc: 'RECIBO12345' },
      { importe: 50, fechaOp: '260120', doc: 'RECIBO67890' },
    ],
  })
  const lines = text.split('\n').map(l => l.length === 80 ? l : l.padEnd(81, ' '))
  const last33 = lines.findIndex(l => l.startsWith('33'))
  // El saldo final está en la posición 60 (1-indexada, 14 dígitos). Forzamos otro valor.
  lines[last33] = replaceAt(lines[last33], 60, '00000000009999')
  const r2 = parseN43(lines.join('\n'))
  assert.equal(r2.check?.ok, false)
  assert.match(r2.check?.message ?? '', /no cuadra/)
})

test('parseN43: año 99 -> 1999', () => {
  const text = buildFile({
    cuenta: '1234567890',
    ini: 100,
    fin: 100,
    movimientos: [
      { importe: -50, fechaOp: '991231', doc: 'VIEJO' },
      { importe: 50, fechaOp: '991231', doc: 'INGRESO' },
    ],
  })
  const r = parseN43(text)
  assert.equal(r.rows[0].date, '1999-12-31')
})

test('parseN43: múltiples registros 23 amplían el concepto', () => {
  const text = buildFile({
    cuenta: '1234567890',
    ini: 0,
    fin: -50,
    movimientos: [
      {
        importe: -50,
        fechaOp: '260101',
        doc: 'DOC',
        extra: [
          { texto1: 'PRIMERA LINEA', texto2: '' },
          { texto1: 'SEGUNDA LINEA', texto2: 'MAS DETALLE' },
        ],
      },
    ],
  })
  const r = parseN43(text)
  assert.match(r.rows[0].concept, /PRIMERA LINEA/)
  assert.match(r.rows[0].concept, /SEGUNDA LINEA/)
  assert.match(r.rows[0].concept, /MAS DETALLE/)
})

test('parseN43: varias cuentas en un fichero avisa en errors', () => {
  const t1 = buildFile({ cuenta: 'CTAUNO', ini: 0, fin: 0, movimientos: [] })
  const t2 = buildFile({ cuenta: 'CTADOS', ini: 0, fin: 0, movimientos: [{ importe: 10, fechaOp: '260101' }] })
  const text = t1 + '\n' + t2
  const r = parseN43(text)
  assert.ok(r.errors.some(e => /2 cuentas/.test(e)))
})

test('parseN43: imports céntimos en importe 12,34', () => {
  const text = buildFile({
    cuenta: '1234567890',
    ini: 0,
    fin: 0,
    movimientos: [
      { importe: 12.34, fechaOp: '260101', doc: 'TEST' },
      { importe: -56.78, fechaOp: '260102', doc: 'TEST' },
    ],
  })
  const r = parseN43(text)
  assert.equal(r.rows[0].amount, 12.34)
  assert.equal(r.rows[1].amount, -56.78)
})

test('isN43: detecta N43 y rechaza CSV', () => {
  const text = buildFile({ cuenta: '1234567890', ini: 0, fin: 0, movimientos: [] })
  assert.equal(isN43(text), true)
  assert.equal(isN43('Fecha;Importe;Concepto\n2026-01-01;10,00;Cafe'), false)
  assert.equal(isN43(''), false)
})

test('isN43 y parseN43: líneas con los espacios finales recortados (como las dan muchos bancos)', () => {
  const text = buildFile({
    cuenta: '1234567890',
    ini: 10,
    fin: 5,
    movimientos: [{ importe: -5, fechaOp: '260301', ref1: 'CAFE' }],
  })
  const trimmed = text.split('\n').map(l => l.trimEnd()).join('\r\n')
  assert.equal(isN43(trimmed), true)
  const r = parseN43(trimmed)
  assert.equal(r.rows.length, 1)
  assert.equal(r.rows[0].concept, 'CAFE')
  assert.equal(r.check?.ok, true)
  assert.equal(r.finalBalance, 5)
})

test('parseN43: sin registro 33 no puede verificar', () => {
  const lines = buildFile({ cuenta: '1234567890', ini: 0, fin: 0, movimientos: [{ importe: 1, fechaOp: '260101' }] })
    .split('\n')
    .filter(l => !l.startsWith('33'))
  const r = parseN43(lines.join('\n'))
  assert.equal(r.check?.ok, false)
  assert.match(r.check?.message ?? '', /no trae registro de totales/)
})

test('parseN43: registro 88 final y fin de cuenta 33', () => {
  const text = buildFile({ cuenta: 'CTAX', ini: 0, fin: 0, movimientos: [{ importe: 1, fechaOp: '260101' }] })
  const r = parseN43(text)
  assert.equal(r.format, 'n43')
  assert.ok(r.check)
})

test('parseN43: importe ilegible en 22 -> fila omitida, errors con "Línea", check.ok=false', () => {
  const text = buildFile({
    cuenta: '1234567890',
    ini: 0,
    fin: 0,
    movimientos: [
      { importe: -200, fechaOp: '260115', doc: 'BIEN' },
    ],
  })
  const lines = text.split('\n')
  const idx22 = lines.findIndex(l => l.startsWith('22'))
  // Reemplaza el importe (pos 29-42, 14 dígitos) por X
  lines[idx22] = replaceAt(lines[idx22], 29, 'XXXXXXXXXXXXXX')
  const r = parseN43(lines.join('\n'))
  assert.equal(r.rows.length, 0)
  assert.ok(r.errors.some(e => /Línea \d+: movimiento ilegible/.test(e)))
  assert.equal(r.check?.ok, false)
})

test('parseN43: fecha ilegible en 22 -> fila omitida, errors con "Línea", check.ok=false', () => {
  const text = buildFile({
    cuenta: '1234567890',
    ini: 0,
    fin: 0,
    movimientos: [
      { importe: -200, fechaOp: '260115', doc: 'BIEN' },
    ],
  })
  const lines = text.split('\n')
  const idx22 = lines.findIndex(l => l.startsWith('22'))
  // Fecha op pos 11-16. La machacamos por una fecha imposible (mes 13).
  lines[idx22] = replaceAt(lines[idx22], 11, '991399')
  const r = parseN43(lines.join('\n'))
  assert.equal(r.rows.length, 0)
  assert.ok(r.errors.some(e => /Línea \d+: movimiento ilegible/.test(e)))
  assert.equal(r.check?.ok, false)
})

test('parseN43: saldo final ilegible en 33 -> finalBalance undefined y check.ok=false', () => {
  const text = buildFile({
    cuenta: '1234567890',
    ini: 0,
    fin: 0,
    movimientos: [
      { importe: -200, fechaOp: '260115', doc: 'BIEN' },
      { importe: 200, fechaOp: '260116', doc: 'ABONO' },
    ],
  })
  const lines = text.split('\n').map(l => l.length === 80 ? l.padEnd(80, ' ') : l)
  const idx33 = lines.findIndex(l => l.startsWith('33'))
  // Saldo final en posición 60 (1-indexada), 14 caracteres.
  lines[idx33] = replaceAt(lines[idx33], 60, 'XXXXXXXXXXXXXX')
  const r = parseN43(lines.join('\n'))
  assert.equal(r.finalBalance, undefined)
  assert.equal(r.check?.ok, false)
})
