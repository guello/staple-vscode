import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveStates } from './task-lists'

const defaults = {
  ' ': 'unchecked',
  x: 'checked',
  X: 'checked',
  '-': 'indeterminate',
  '/': 'indeterminate',
  '~': 'cancelled',
}

test('keeps every single character mapped to a known state', () => {
  assert.deepEqual(resolveStates(defaults), defaults)
})

test('drops a character unset with null', () => {
  const states = resolveStates({ ...defaults, ...JSON.parse('{"/": null}') })
  assert.equal(states['/'], undefined)
  assert.equal(states['-'], 'indeterminate')
})

test('drops an unknown state', () => {
  assert.deepEqual(resolveStates({ '?': 'partial' }), {})
})

test('drops a key that is not a single character', () => {
  assert.deepEqual(resolveStates({ '': 'checked', '[x]': 'checked', '  ': 'unchecked' }), {})
})

test('ignores a value that is not an object', () => {
  const values = [undefined, JSON.parse('null'), 'checked', 3, ['x']]
  for (const value of values) assert.deepEqual(resolveStates(value), {})
})
