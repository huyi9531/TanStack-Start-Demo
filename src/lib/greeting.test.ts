import { describe, expect, test } from 'vitest'

import { parseGreetingInput } from './greeting'

describe('parseGreetingInput', () => {
  test('trims and caps the submitted name', () => {
    expect(
      parseGreetingInput({
        name: `  ${'云'.repeat(50)}  `,
      }),
    ).toEqual({
      name: '云'.repeat(40),
    })
  })

  test('rejects invalid payloads at the server-function boundary', () => {
    expect(() => parseGreetingInput({ name: 123 })).toThrow(
      'createGreeting expected data.name to be a string',
    )
  })
})
