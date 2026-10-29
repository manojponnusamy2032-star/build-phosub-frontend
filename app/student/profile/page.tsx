'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth, LoadingSpinner } from '@/components/providers'
import { getAccessToken } from '@/lib/supabase/auth-token'
import { ProfilePhotoEditor } from '@/components/profile-photo'

type Profile = { id: string; full_name: string; email: string; role: string; squad: string | null; avatar_url: string | null }

export default function StudentProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const token = await getAccessToken()
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await fetch('/api/profile', { credentials: 'include', headers })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Unable to load profile')
      setProfile(data.profile ?? null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading || !user) return
    void loadData()
  }, [user, authLoading])

  if (authLoading || loading) return <LoadingSpinner />

  if (!user) {
    return <p className="text-[#6f5c4b]">Please sign in to view your profile.</p>
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="mt-1 text-sm text-[#6f5c4b]">Your account information.</p>
      </div>

      {error && (
        <div role="alert" className="mb-6 rounded-lg border border-[#d8b9b0] bg-[#f3e9ea] p-4 text-sm text-[#710014]">
          <p>{error}</p>
          <button type="button" onClick={() => void loadData()} className="mt-2 text-sm font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {!profile ? (
        <div className="rounded-lg border border-[#d8d2c9] bg-[#F2F1ED] p-6">
          <p className="text-[#6f5c4b]">Profile not found.</p>
        </div>
      ) : (
        <div className="max-w-2xl rounded-xl border border-[#d8d2c9] bg-[#F2F1ED] p-6">
          <div className="mb-6 border-b border-[#d8d2c9] pb-6">
            <ProfilePhotoEditor
              avatarUrl={profile.avatar_url}
              name={profile.full_name}
              onUploaded={(avatarUrl) => setProfile((current) => current ? { ...current, avatar_url: avatarUrl } : current)}
            />
          </div>
          <dl className="space-y-5">
            <div>
              <dt className="text-xs text-[#6f5c4b]">Name</dt>
              <dd className="mt-1.5 text-base font-semibold">{profile.full_name}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#6f5c4b]">College email</dt>
              <dd className="mt-1.5 break-all text-base font-medium">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#6f5c4b]">Squad</dt>
              <dd className="mt-1.5 text-base font-medium">{profile.squad ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#6f5c4b]">Role</dt>
              <dd className="mt-1.5 text-base font-medium capitalize">{profile.role}</dd>
            </div>
          </dl>

          <div className="mt-6 rounded-lg border border-[#d8d2c9] bg-[#f2f1ed] p-4 text-sm text-[#6f5c4b]">
            <p className="font-semibold text-[#161616]">Account details</p>
            <p className="mt-1">
              Your role, squad, identity, and email are managed through your verified account and cannot be changed here.
              Your profile photo can be changed above.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
