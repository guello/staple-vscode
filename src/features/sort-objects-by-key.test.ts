import assert from 'node:assert/strict'
import test from 'node:test'

import { getObjectKeys, parseJsonObjectDocument, reorderJsonObjects, sortObjectsByKey } from './sort-objects-by-key'

const input = `[
  {
    "command": "markdown.extension.checkTaskList",
    "key": "cmd+k",
    "when": "editorTextFocus"
  },
  {
    "command": "-markdown.extension.checkTaskList",
    "key": "alt+c",
    "when": "false"
  },
  {
    "command": "editor.action.sortLinesAscending",
    "key": "f9",
    "when": "editorTextFocus"
  },
  {
    "key": "alt+cmd+enter",
    "command": "workbench.action.moveModalEditorToMain",
    "when": "!isSessionsWindow"
  }
]
`

test('recognizes every key in the object array', () => {
  assert.deepEqual(getObjectKeys(parseJsonObjectDocument(input).items), ['command', 'key', 'when'])
})

test('sorts string values in ascending order', () => {
  const document = parseJsonObjectDocument(input)
  const sorted = sortObjectsByKey(document.items, 'command')
  assert.deepEqual(
    sorted.map(item => item.object.command),
    [
      '-markdown.extension.checkTaskList',
      'editor.action.sortLinesAscending',
      'markdown.extension.checkTaskList',
      'workbench.action.moveModalEditorToMain',
    ]
  )
})

test('sorts numbers numerically and keeps missing values last in their original order', () => {
  const document = parseJsonObjectDocument(
    '[{"id":"missing-a"},{"id":"ten","rank":10},{"id":"two","rank":2},{"id":"missing-b"}]'
  )
  const sorted = sortObjectsByKey(document.items, 'rank')
  assert.deepEqual(
    sorted.map(item => item.object.id),
    ['two', 'ten', 'missing-a', 'missing-b']
  )
})

test('sorts numbers outside the JavaScript safe integer range without losing precision', () => {
  const document = parseJsonObjectDocument(
    '[{"id":"larger","rank":9007199254740993},{"id":"smaller","rank":9007199254740992}]'
  )
  const sorted = sortObjectsByKey(document.items, 'rank')
  assert.deepEqual(
    sorted.map(item => item.object.id),
    ['smaller', 'larger']
  )
})

test('sorts negative, decimal, and exponent number tokens', () => {
  const document = parseJsonObjectDocument(
    '[{"id":"huge","rank":1e400},{"id":"decimal","rank":1.2},{"id":"negative-zero","rank":-0e999},{"id":"negative","rank":-10},{"id":"smaller-huge","rank":9e399},{"id":"smaller-decimal","rank":1.19}]'
  )
  const sorted = sortObjectsByKey(document.items, 'rank')
  assert.deepEqual(
    sorted.map(item => item.object.id),
    ['negative', 'negative-zero', 'smaller-decimal', 'decimal', 'smaller-huge', 'huge']
  )
})

test('reorders the original object text without changing its JSON tokens', () => {
  const original =
    '\ufeff[\r\n\t{"name":"b","integer":9007199254740993,"escaped":"\\u0061"},\r\n\t{"name": "a", "name": "a"}\r\n]\r\n'
  const document = parseJsonObjectDocument(original)
  const sorted = sortObjectsByKey(document.items, 'name')
  assert.equal(
    reorderJsonObjects(document, sorted),
    '\ufeff[\r\n\t{"name": "a", "name": "a"},\r\n\t{"name":"b","integer":9007199254740993,"escaped":"\\u0061"}\r\n]\r\n'
  )
})

test('supports braces and brackets inside strings and nested values', () => {
  const document = parseJsonObjectDocument('[{"name":"b}","nested":[{}]},{"name":"a["}]')
  const sorted = sortObjectsByKey(document.items, 'name')
  assert.equal(reorderJsonObjects(document, sorted), '[{"name":"a["},{"name":"b}","nested":[{}]}]')
})

test('rejects JSON that is not an array of objects', () => {
  assert.throws(() => parseJsonObjectDocument('[1, 2]'), /array of objects/)
})

test('rejects malformed JSON', () => {
  assert.throws(() => parseJsonObjectDocument('[{"name":"a"},]'), SyntaxError)
})
