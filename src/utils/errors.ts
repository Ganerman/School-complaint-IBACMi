export function friendlyError(error: unknown, fallback = 'Something went wrong. Please try again.') {
  const rawMessage = typeof error === 'string'
    ? error
    : error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string'
      ? (error as { message: string }).message
      : ''

  const message = rawMessage.toLowerCase()

  if (rawMessage.includes('no api key') || rawMessage.includes('apikey')) {
    return 'Supabase API key is missing or invalid. Add the correct VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY values to your .env file and restart the app.'
  }
  if (message.includes('invalid login')) return 'Incorrect email or password.'
  if (message.includes('invalid school id')) return 'Incorrect School ID or password.'
  if (message.includes('not deployed')) return 'School ID login is not active yet. Deploy the Supabase login function first.'
  if (message.includes('login service is unavailable')) return 'School ID login is temporarily unavailable. Please try your email instead.'
  if (message.includes('already registered')) return 'An account already exists for this email.'
  if (message.includes('email rate limit exceeded')) return 'Too many signup attempts. Please wait a few minutes and try again.'
  if (message.includes('email not confirmed')) return 'Please verify your email before signing in.'
  if (message.includes('network')) return 'Unable to connect. Check your internet connection.'
  if (rawMessage) return rawMessage
  return fallback
}
