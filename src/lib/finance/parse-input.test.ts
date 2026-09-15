import test from 'node:test'
import assert from 'node:assert/strict'
import { parseEuroInput } from './money.ts'

test('parseEuroInput: formatos habituales', () => {
  assert.equal(parseEuroInput('12,5'), 12.5)
  assert.equal(parseEuroInput('1.234,56'), 1234.56)
  assert.equal(parseEuroInput('1234.56'), 1234.56)
  assert.equal(parseEuroInput('12,00 €'), 12)
  assert.equal(parseEuroInput(' 7 '), 7)
})

test('parseEuroInput: basura da NaN', () => {
  assert.ok(Number.isNaN(parseEuroInput('')))
  assert.ok(Number.isNaN(parseEuroInput('abc')))
  assert.ok(Number.isNaN(parseEuroInput('1,2,3')))
})
