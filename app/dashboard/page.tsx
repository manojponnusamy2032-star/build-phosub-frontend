import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ProfileSetup from '@/components/profile-setup'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await createAdminClient()
    .from('profiles')
    .select('role, squad')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Failed to load dashboard profile', {
      code: profileError.code,
      message: profileError.message,
    })
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f7f8] p-6">
        <div className="max-w-md rounded-xl border border-[#e7e7ea] bg-white p-6 text-center">
          <h1 className="mb-2 text-lg font-bold">Could not load your profile</h1>
          <p className="text-sm text-[#666]">
            Please try again in a moment. If the problem continues, contact your administrator.
          </p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <ProfileSetup
        email={user.email ?? ''}
        fullName={typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : ''}
        squad={typeof user.user_metadata?.squad === 'string' ? user.user_metadata.squad : ''}
      />
    )
  }

  if (profile.role === 'mentor') redirect('/mentor')
  redirect('/student')
}