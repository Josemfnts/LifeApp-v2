import test from 'node:test'
import assert from 'node:assert/strict'
import { INITIAL_CHROME, nextChrome, type ChromeState } from './scrollChrome.ts'

const MAX = 3000
const run = (tops: number[], max = MAX, start: ChromeState = INITIAL_CHROME) =>
  tops.reduce((s, t) => nextChrome(s, t, max), start)

test('al bajar se compacta la cabecera y se esconde la barra', () => {
  const s = run([10, 40, 80, 130, 170, 220])
  assert.equal(s.collapsed, true)
  assert.equal(s.navHidden, true)
})

test('cerca de arriba la barra no se esconde aunque bajes', () => {
  const s = run([20, 60, 100, 118])
  assert.equal(s.collapsed, true)
  assert.equal(s.navHidden, false)
})

test('temblores pequeños no hacen parpadear la barra', () => {
  const hidden = run([100, 200, 300, 400])
  assert.equal(hidden.navHidden, true)
  const jitter = run([395, 402, 390, 398, 385], MAX, hidden)
  assert.equal(jitter.navHidden, true)
})

test('al subir un poco vuelve la barra; la cabecera sigue compacta', () => {
  const hidden = run([100, 200, 300, 400, 500])
  const up = run([490, 470, 450], MAX, hidden)
  assert.equal(up.navHidden, false)
  assert.equal(up.collapsed, true)
})

test('arriba del todo todo vuelve a su sitio, con histéresis en la cabecera', () => {
  const hidden = run([100, 300, 600])
  assert.equal(run([30], MAX, hidden).collapsed, true)
  const top = run([30, 10], MAX, hidden)
  assert.equal(top.collapsed, false)
  assert.equal(top.navHidden, false)
})

test('al final de la página la barra vuelve', () => {
  const s = run([200, 600, 1200, 2998], MAX)
  assert.equal(s.navHidden, false)
})

test('página corta: ni se compacta ni se esconde nada', () => {
  const s = run([50, 100, 140], 150)
  assert.deepEqual([s.collapsed, s.navHidden], [false, false])
})

test('si al compactar la página queda corta, no rebota a expandida (sin parpadeo)', () => {
  const collapsed = run([30, 60], 200)
  assert.equal(collapsed.collapsed, true)
  // la cabecera compacta acorta la página: max baja de 200 a 150 y el scroll se recorta
  const shorter = nextChrome(collapsed, 150, 150)
  assert.equal(shorter.collapsed, true)
  assert.equal(nextChrome(shorter, 140, 150).collapsed, true)
  assert.equal(nextChrome(shorter, 5, 150).collapsed, false)
})

test('valores fuera de rango (rebote de iOS) se recortan', () => {
  const s = nextChrome(INITIAL_CHROME, -40, MAX)
  assert.equal(s.lastTop, 0)
  assert.equal(nextChrome(INITIAL_CHROME, 9999, MAX).lastTop, MAX)
})
