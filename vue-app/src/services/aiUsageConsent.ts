// Desktop design-test behavior: agreement lasts only until the page reloads.
// Deliberately ignore prior browser consent records so the first-use flow is repeatable.
export function createAiUsageConsent() {
  const acceptedInSession = new Set<string>()

  return {
    hasAccepted(account: string | null) {
      return !!account && acceptedInSession.has(account)
    },
    accept(account: string | null) {
      if (!account) return false
      acceptedInSession.add(account)
      return true
    }
  }
}
