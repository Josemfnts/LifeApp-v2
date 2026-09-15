import test from 'node:test'
import assert from 'node:assert/strict'
import { splitCSV, detectDelimiter, parseAmountES, parseDateFlexible, guessMapping, applyMapping } from './csv.ts'

test('splitCSV: comillas, "" escapadas, ; dentro de comillas, CRLF y BOM', () => {
  assert.deepEqual(splitCSV('﻿a;"b;c";"d ""e"""\r\n1;2;3', ';'), [['a', 'b;c', 'd "e"'], ['1', '2', '3']])
  assert.deepEqual(splitCSV('x,"l1\nl2",y', ','), [['x', 'l1\nl2', 'y']])
})

test('parseAmountES: formatos bancarios', () => {
  assert.equal(parseAmountES('1.234,56'), 1234.56)
  assert.equal(parseAmountES('-12,30'), -12.3)
  assert.equal(parseAmountES('12.30'), 12.3)
  assert.equal(parseAmountES('1,234.56'), 1234.56)
  assert.equal(parseAmountES('1.234.567'), 1234567)
  assert.equal(parseAmountES('(12,00)'), -12)
  assert.equal(parseAmountES('12,00-'), -12)
  assert.equal(parseAmountES('12,00 €'), 12)
  assert.equal(parseAmountES('12,00 EUR'), 12)
  assert.ok(Number.isNaN(parseAmountES('')))
  assert.ok(Number.isNaN(parseAmountES('1,2,3')))
})

test('parseDateFlexible: formatos habituales y fechas imposibles', () => {
  for (const s of ['15/09/2026', '15-09-2026', '15.09.2026', '15/09/26', '2026-09-15', '2026-09-15 10:22:33']) {
    assert.equal(parseDateFlexible(s), '2026-09-15', s)
  }
  assert.equal(parseDateFlexible('31/02/2026'), null)
  assert.equal(parseDateFlexible('hola'), null)
})

test('CSV estilo BBVA: separador ;, coma decimal, cabecera en la fila 4', () => {
  const text = [
    'Movimientos de la cuenta;;;;',
    'Cuenta: ES12 3456;;;;',
    ';;;;',
    'F.Valor;Fecha;Concepto;Movimiento;Importe;Divisa;Disponible',
    '14/09/2026;15/09/2026;MERCADONA;Compra tarjeta;-45,30;EUR;1.234,56',
    '10/09/2026;10/09/2026;NOMINA SEPTIEMBRE;Transferencia recibida;1.850,00;EUR;1.279,86',
    'TOTAL;;;;;;',
  ].join('\r\n')
  assert.equal(detectDelimiter(text), ';')
  const rows = splitCSV(text)
  const m = guessMapping(rows)
  assert.ok(m)
  assert.equal(m.headerRow, 3)
  assert.equal(m.date, 1)
  assert.equal(m.concept, 2)
  assert.equal(m.amount, 4)
  assert.equal(m.balance, 6)
  const r = applyMapping(rows, m)
  assert.deepEqual(r.rows, [
    { date: '2026-09-15', amount: -45.3, concept: 'MERCADONA', balanceAfter: 1234.56 },
    { date: '2026-09-10', amount: 1850, concept: 'NOMINA SEPTIEMBRE', balanceAfter: 1279.86 },
  ])
  assert.match(r.errors[0], /1 fila omitida/)
})

test('CSV estilo Revolut: separador ,, punto decimal, prefiere "Completed Date"', () => {
  const text = [
    'Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance',
    'CARD_PAYMENT,Current,2026-09-01 10:22:33,2026-09-02 08:00:01,Uber Eats,-23.40,0.00,EUR,COMPLETED,500.10',
    'TOPUP,Current,2026-09-03 12:00:00,2026-09-03 12:00:05,"Top-up by *1234",100.00,0.00,EUR,COMPLETED,600.10',
  ].join('\n')
  assert.equal(detectDelimiter(text), ',')
  const rows = splitCSV(text)
  const m = guessMapping(rows)
  assert.ok(m)
  assert.equal(m.date, 3)
  const r = applyMapping(rows, m)
  assert.equal(r.rows[0].date, '2026-09-02')
  assert.equal(r.rows[0].amount, -23.4)
  assert.equal(r.rows[0].concept, 'Uber Eats')
  assert.equal(r.rows[1].concept, 'Top-up by *1234')
  assert.equal(r.rows[1].balanceAfter, 600.1)
})

test('CSV con cargo y abono en columnas separadas', () => {
  const text = 'Fecha;Descripción;Cargo;Abono;Saldo\n01/09/26;Recibo luz;52,10;;948,00\n02/09/26;Bizum de Ana;;15,00;963,00'
  const rows = splitCSV(text)
  const m = guessMapping(rows)
  assert.ok(m)
  assert.equal(m.amount, undefined)
  const r = applyMapping(rows, m)
  assert.deepEqual(r.rows.map(x => [x.date, x.amount, x.concept]), [
    ['2026-09-01', -52.1, 'Recibo luz'],
    ['2026-09-02', 15, 'Bizum de Ana'],
  ])
})

test('guessMapping: sin columnas de fecha e importe devuelve null', () => {
  assert.equal(guessMapping(splitCSV('nombre;edad\nAna;30', ';')), null)
})
