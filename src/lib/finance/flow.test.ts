import test from 'node:test'
import assert from 'node:assert/strict'
import { isFlow } from './flow.ts'

test('isFlow: sin kind es flujo', () => {
  assert.equal(isFlow({}), true)
  assert.equal(isFlow({ kind: undefined }), true)
})

test('isFlow: con kind NO es flujo', () => {
  assert.equal(isFlow({ kind: 'transfer' }), false)
  assert.equal(isFlow({ kind: 'adjust' }), false)
  assert.equal(isFlow({ kind: 'investment' }), false)
  assert.equal(isFlow({ kind: 'debt_principal' }), false)
})
