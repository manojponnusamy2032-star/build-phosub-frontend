'use client'

import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { Camera } from 'lucide-react'
import { getAccessToken } from '@/lib/supabase/auth-token'

type ProfileAvatarProps = {
  avatarUrl?: string | null
  name: string
  size?: 'small' | 'large'
}

export function ProfileAvatar({ avatarUrl, name, size = 'small' }: ProfileAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const initials = name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?'
  const sizeClass = size === 'large' ? 'size-24 text-2xl' : 'size-9 text-xs'

  useEffect(() => setImageFailed(false), [avatarUrl])

  return (
    <span
      role="img"
      aria-label={`${name || 'User'} profile photo`}
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#f8dedd] font-bold text-[#d52b27] ${sizeClass}`}
    >
      {avatarUrl && !imageFailed ? (
        <img src={avatarUrl} alt="" onError={() => setImageFailed(true)} className="size-full object-cover" />
      ) : initials}
    </span>
  )
}

export function ProfilePhotoEditor({
  avatarUrl,
  name,
  onUploaded,
}: ProfileAvatarProps & { onUploaded?: (avatarUrl: string) => void }) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    if (!file) return

    setError('')
    setMessage('')
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      const token = await getAccessToken()
      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
        body: formData,
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Unable to update profile photo')

      onUploaded?.(result.avatar_url)
      window.dispatchEvent(new CustomEvent('phosub:avatar-updated', { detail: result.avatar_url }))
      setMessage('Profile photo updated.')
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Unable to update profile photo')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-5">
      <ProfileAvatar avatarUrl={avatarUrl} name={name} size="large" />
      <div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          disabled={uploading}
          className="sr-only"
        />
        <label
          htmlFor={inputId}
          className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-[#e4e4e7] px-3 text-sm font-semibold text-[#333] hover:bg-[#f7f7f8] ${uploading ? 'pointer-events-none opacity-50' : ''}`}
        >
          <Camera size={16} /> {uploading ? 'Uploading...' : 'Change photo'}
        </label>
        <p className="mt-2 text-xs text-[#77787d]">JPEG, PNG, or WebP up to 5 MB</p>
        {message && <p role="status" className="mt-2 text-sm text-[#166534]">{message}</p>}
        {error && <p role="alert" className="mt-2 text-sm text-[#c62828]">{error}</p>}
      </div>
    </div>
  )
}