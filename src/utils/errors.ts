export function friendlyError(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (!(error instanceof Error)) return fallback
  const message = error.message.toLowerCase()
  if (message.includes('invalid login')) return 'Incorrect email or password.'
  if (message.includes('invalid school id')) return 'Incorrect School ID or password.'
  if (message.includes('not deployed')) return 'School ID login is not active yet. Deploy the Supabase login function first.'
  if (message.includes('login service is unavailable')) return 'School ID login is temporarily unavailable. Please try your email instead.'
  if (message.includes('already registered')) return 'An account already exists for this email.'
  if (message.includes('email not confirmed')) return 'Please verify your email before signing in.'
  if (message.includes('network')) return 'Unable to connect. Check your internet connection.'
  return fallback
}
