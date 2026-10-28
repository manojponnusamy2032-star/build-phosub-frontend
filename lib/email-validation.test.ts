import assert from 'node:assert/strict'
import test from 'node:test'
import { isValidEmailFormat } from './email-validation.ts'

test('rejects a local part ending in a period', () => {
  assert.equal(isValidEmailFormat('mentor.@kalvium.com'), false)
})

test('accepts a valid mentor email format', () => {
  assert.equal(isValidEmailFormat('mentor@kalvium.com'), true)
})

test('accepts a valid email after trimming surrounding whitespace', () => {
  assert.equal(isValidEmailFormat('  mentor@kalvium.com  '), true)
})

test('rejects consecutive periods in the local part', () => {
  assert.equal(isValidEmailFormat('mentor..test@kalvium.com'), false)
})

test('rejects domain labels that start or end with a hyphen', () => {
  assert.equal(isValidEmailFormat('mentor@-kalvium.com'), false)
  assert.equal(isValidEmailFormat('mentor@kalvium-.com'), false)
})

test('rejects empty email input', () => {
  assert.equal(isValidEmailFormat(''), false)
})