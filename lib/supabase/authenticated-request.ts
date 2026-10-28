import { createClient } from '@/lib/supabase/server'

export async function getAuthenticatedRequest(request: Request) {
  const supabase = await createClient()
  const authorization = request.headers.get('Authorization')
  const bearerToken = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1]

  if (bearerToken) {
    const { data, error } = await supabase.auth.getClaims(bearerToken)
    const claims = data?.claims
    if (!error && typeof claims?.sub === 'string') {
      return {
        supabase,
        userId: claims.sub,
        email: typeof claims.email === 'string' ? claims.email : null,
      }
    }
  }

  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  return {
    supabase,
    userId: typeof claims?.sub === 'string' ? claims.sub : null,
    email: typeof claims?.email === 'string' ? claims.email : null,
  }
}