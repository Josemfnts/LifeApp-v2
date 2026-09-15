import test from 'node:test'
import assert from 'node:assert/strict'
import { decodeBankFile } from './decode.ts'

test('decodeBankFile: UTF-8 normal', () => {
  assert.equal(decodeBankFile(new TextEncoder().encode('Café Ñandú').buffer as ArrayBuffer), 'Café Ñandú')
})

test('decodeBankFile: Latin-1 (como exportan muchos bancos) se reintenta', () => {
  const latin1 = new Uint8Array([0x43, 0x61, 0x66, 0xe9, 0x20, 0xd1]) // "Café Ñ"
  assert.equal(decodeBankFile(latin1.buffer), 'Café Ñ')
})

test('decodeBankFile: quita el BOM de UTF-8', () => {
  const withBom = new Uint8Array([0xef, 0xbb, 0xbf, 0x61, 0x3b, 0x62]) // BOM + "a;b"
  assert.equal(decodeBankFile(withBom.buffer), 'a;b')
})
