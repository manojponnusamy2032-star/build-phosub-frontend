import { NextResponse } from 'next/server'
import { getAuthenticatedRequest } from '@/lib/supabase/authenticated-request'

const bucketName = 'profile-photos'
const maxFileSize = 5 * 1024 * 1024
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

function hasValidSignature(type: string, bytes: Uint8Array) {
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (type === 'image/png') {
    return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)
  }
  if (type === 'image/webp') {
    return bytes.length >= 12
      && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
      && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  }
  return false
}

export async function POST(request: Request) {
  const { userId } = await getAuthenticatedRequest(request)
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  let file: FormDataEntryValue | null
  try {
    file = (await request.formData()).get('avatar')
  } catch {
    return NextResponse.json({ error: 'Choose an image to upload' }, { status: 400 })
  }
  if (!(file instanceof File)) return NextResponse.json({ error: 'Choose an image to upload' }, { status: 400 })
  if (!allowedTypes.has(file.type)) {
    return NextResponse.json({ error: 'Use a JPEG, PNG, or WebP image' }, { status: 400 })
  }
  if (file.size === 0 || file.size > maxFileSize) {
    return NextResponse.json({ error: 'Image must be smaller than 5 MB' }, { status: 400 })
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!hasValidSignature(file.type, bytes)) {
    return NextResponse.json({ error: 'The selected file is not a valid image' }, { status: 400 })
  }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const { data: existingProfile, error: profileError } = await admin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()
  if (profileError) {
    console.error('Unable to verify profile photo owner', { code: profileError.code })
    return NextResponse.json({ error: 'Unable to verify profile' }, { status: 500 })
  }
  if (!existingProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const storage = admin.storage.from(bucketName)
  const filePath = `${userId}/avatar`
  const { error: uploadError } = await storage.upload(filePath, bytes, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: true,
  })
  if (uploadError) {
    console.error('Unable to upload profile photo', { message: uploadError.message })
    return NextResponse.json({ error: 'Unable to upload profile photo' }, { status: 500 })
  }

  const avatarUrl = `${storage.getPublicUrl(filePath).data.publicUrl}?v=${Date.now()}`
  const { data: profile, error: updateError } = await admin
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId)
    .select('avatar_url')
    .maybeSingle()
  if (updateError || !profile) {
    console.error('Unable to save profile photo URL', { code: updateError?.code })
    return NextResponse.json({ error: 'Unable to save profile photo' }, { status: 500 })
  }

  return NextResponse.json({ avatar_url: profile.avatar_url })
}