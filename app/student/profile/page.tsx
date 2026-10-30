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
    return <p className="text-[#000000]">Please sign in to view your profile.</p>
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="mt-1 text-sm text-[#000000]">Your account information.</p>
      </div>

      {error && (
        <div role="alert" className="mb-6 rounded-lg border border-[#D3CCC7] bg-[#EFEEE8] p-4 text-sm text-[#000000]">
          <p>{error}</p>
          <button type="button" onClick={() => void loadData()} className="mt-2 text-sm font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {!profile ? (
        <div className="rounded-lg border border-[#D3CCC7] bg-[#EFEEE8] p-6">
          <p className="text-[#000000]">Profile not found.</p>
        </div>
      ) : (
        <div className="max-w-2xl rounded-xl border border-[#D3CCC7] bg-[#EFEEE8] p-6">
          <div className="mb-6 border-b border-[#D3CCC7] pb-6">
            <ProfilePhotoEditor
              avatarUrl={profile.avatar_url}
              name={profile.full_name}
              onUploaded={(avatarUrl) => setProfile((current) => current ? { ...current, avatar_url: avatarUrl } : current)}
            />
          </div>
          <dl className="space-y-5">
            <div>
              <dt className="text-xs text-[#000000]">Name</dt>
              <dd className="mt-1.5 text-base font-semibold">{profile.full_name}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#000000]">College email</dt>
              <dd className="mt-1.5 break-all text-base font-medium">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#000000]">Squad</dt>
              <dd className="mt-1.5 text-base font-medium">{profile.squad ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#000000]">Role</dt>
              <dd className="mt-1.5 text-base font-medium capitalize">{profile.role}</dd>
            </div>
          </dl>

          <div className="mt-6 rounded-lg border border-[#D3CCC7] bg-[#EFEEE8] p-4 text-sm text-[#000000]">
            <p className="font-semibold text-[#000000]">Account details</p>
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
