import assert from 'node:assert/strict'
import test from 'node:test'

import { type GhosttyReference, describeToken, findToken, parseReference } from './reference'

const configDocs = `# Generated from Ghostty 1.4.0 by scripts/generate-ghostty-reference.mts. Do not edit.

# The font families to use.
# 
# Can be repeated.
font-family = 

font-family-bold = 
font-family-italic = 
# Font size in points.
font-size = 13

# Docs of an option that has no default line.

# The color palette.
palette = 0=#1d1f21
palette = 1=#cc6666

`

const actionDocs = `# Generated from Ghostty 1.4.0 by scripts/generate-ghostty-reference.mts. Do not edit.

ignore:
  Ignore this key combination.

new_tab:
  Open a new tab.
  
  For example:
  
      keybind = cmd+t=new_tab

`

const reference: GhosttyReference = {
  ghostty: '1.4.0',
  options: { 'font-size': { docs: 'Font size in points.', default: '13' }, palette: { docs: 'The color palette.' } },
  actions: { new_tab: 'Open a new tab.' },
}

const parsed = parseReference(configDocs, actionDocs)

test('parseReference reads the Ghostty version from the header', () => {
  assert.equal(parsed.ghostty, '1.4.0')
  assert.equal(parseReference('', '').ghostty, 'unknown')
})

test('parseReference strips the comment marker and keeps paragraph breaks', () => {
  assert.equal(parsed.options['font-family'].docs, 'The font families to use.\n\nCan be repeated.')
})

test('parseReference gives an undocumented key the docs of the key above it', () => {
  const { options } = parsed
  assert.equal(options['font-family-bold'].docs, options['font-family'].docs)
  assert.equal(options['font-family-italic'].docs, options['font-family'].docs)
  assert.equal(options['font-size'].docs, 'Font size in points.')
})

test('parseReference drops a comment block that a blank line separates from the next key', () => {
  assert.equal(parsed.options['font-family'].docs.includes('Generated'), false)
  assert.equal(parsed.options.palette.docs, 'The color palette.')
})

test('parseReference keeps a default only when it is a single non-empty value', () => {
  const { options } = parsed
  assert.equal(options['font-size'].default, '13')
  assert.equal(options['font-family'].default, undefined)
  assert.equal(options.palette.default, undefined)
})

test('parseReference removes the two-space indent and keeps indented code blocks', () => {
  assert.deepEqual(parsed.actions, {
    ignore: 'Ignore this key combination.',
    new_tab: 'Open a new tab.\n\nFor example:\n\n    keybind = cmd+t=new_tab',
  })
})

test('findToken returns the key under the cursor, including both edges', () => {
  const token = { kind: 'option', name: 'font-size', start: 2, end: 11 }
  assert.deepEqual(findToken('  font-size = 13', 2), token)
  assert.deepEqual(findToken('  font-size = 13', 11), token)
  assert.equal(findToken('  font-size = 13', 14), undefined)
  assert.deepEqual(findToken('font-size=13', 0), { kind: 'option', name: 'font-size', start: 0, end: 9 })
})

test('findToken ignores comments and lines without a key', () => {
  assert.equal(findToken('# font-size = 13', 3), undefined)
  assert.equal(findToken('just text', 2), undefined)
})

test('findToken returns the keybind action, skipping an equal sign that is part of the trigger', () => {
  assert.deepEqual(findToken('keybind = global:cmd+t=new_tab', 25), {
    kind: 'action',
    name: 'new_tab',
    start: 23,
    end: 30,
  })
  assert.deepEqual(findToken('keybind = ctrl+==increase_font_size:1', 20), {
    kind: 'action',
    name: 'increase_font_size',
    start: 17,
    end: 35,
  })
  assert.equal(findToken('keybind = cmd+t=new_tab', 12), undefined)
  assert.equal(findToken('keybind = clear', 12), undefined)
  assert.equal(findToken('font-family = a=b', 16), undefined)
})

test('describeToken renders the docs, the default and the reference link', () => {
  const markdown = describeToken({ kind: 'option', name: 'font-size', start: 0, end: 9 }, reference)
  assert.equal(
    markdown,
    '### `font-size`\n\nFont size in points.\n\nDefault: `13`\n\n[Ghostty 1.4.0 reference](https://ghostty.org/docs/config/reference#font-size)'
  )
  assert.match(
    describeToken({ kind: 'option', name: 'palette', start: 0, end: 7 }, reference) ?? '',
    /^### `palette`\n\nThe color palette\.\n\n\[Ghostty/
  )
})

test('describeToken links actions to the keybind reference and skips unknown names', () => {
  assert.equal(
    describeToken({ kind: 'action', name: 'new_tab', start: 0, end: 7 }, reference),
    'Keybind action `new_tab`\n\nOpen a new tab.\n\n[Ghostty 1.4.0 reference](https://ghostty.org/docs/config/keybind/reference#new_tab)'
  )
  assert.equal(describeToken({ kind: 'action', name: 'nope', start: 0, end: 4 }, reference), undefined)
  assert.equal(describeToken({ kind: 'option', name: 'nope', start: 0, end: 4 }, reference), undefined)
})
