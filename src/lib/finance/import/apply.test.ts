import test from 'node:test'
import assert from 'node:assert/strict'
import { buildImportTxs, type ReviewedRow } from './apply.ts'

const rows: ReviewedRow[] = [
  { date: '2026-09-01', amount: -45.3, concept: 'MERCADONA', category: 'Alimentación', key: 'k1', merchantId: 'seed:mercadona' },
  { date: '2026-09-02', amount: 1850, concept: 'NOMINA', category: 'Nómina', key: 'k2' },
]

test('buildImportTxs: signo → tipo, importe positivo, trazabilidad de la importación', () => {
  const txs = buildImportTxs(rows, 'Banco', 'imp-1', 1000)
  assert.equal(txs.length, 2)
  assert.deepEqual(
    txs.map(t => [t.id, t.type, t.amount, t.cuenta, t.importId, t.dedupe]),
    [
      [1000, 'expense', 45.3, 'Banco', 'imp-1', 'k1'],
      [1001, 'income', 1850, 'Banco', 'imp-1', 'k2'],
    ],
  )
  assert.equal(txs[0].merchantId, 'seed:mercadona')
  assert.equal('merchantId' in txs[1], false)
})

test('buildImportTxs: importes con residuos de coma flotante se redondean a céntimos', () => {
  const [t] = buildImportTxs([{ ...rows[0], amount: -(0.1 + 0.2) }], 'Banco', 'imp-2', 1)
  assert.equal(t.amount, 0.3)
})
