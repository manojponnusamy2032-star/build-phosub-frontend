export function isValidEmailFormat(email: string): boolean {
  const normalizedEmail = email.trim()
  if (!normalizedEmail || /\s/.test(normalizedEmail)) return false

  const atIndex = normalizedEmail.indexOf('@')
  if (atIndex <= 0 || atIndex !== normalizedEmail.lastIndexOf('@')) return false

  const localPart = normalizedEmail.slice(0, atIndex)
  const domain = normalizedEmail.slice(atIndex + 1)
  if (
    localPart.startsWith('.') ||
    localPart.endsWith('.') ||
    localPart.includes('..')
  ) {
    return false
  }

  const domainLabels = domain.split('.')
  return (
    domainLabels.length > 1 &&
    domainLabels.every((label) => /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(label))
  )
}