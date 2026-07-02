const maxGreetingNameLength = 40

export function parseGreetingInput(data: unknown) {
  if (!hasStringName(data)) {
    throw new Error('createGreeting expected data.name to be a string')
  }

  return {
    name: data.name.trim().slice(0, maxGreetingNameLength),
  }
}

function hasStringName(value: unknown): value is { name: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof value.name === 'string'
  )
}
