'use client'

import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  personId: string
  personEmail: string
  currentUrl: string | null
}

export default function AvatarUpload({
  personId,
  personEmail,
  currentUrl,
}: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2 MB.')
      return
    }
    setUploading(true)
    setError(null)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() || 'png'
      const path = `${personId}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      const { error: updErr } = await supabase
        .from('people')
        .update({ avatar_url: pub.publicUrl })
        .eq('id', personId)
      if (updErr) throw updErr
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleRemove() {
    setUploading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: updErr } = await supabase
        .from('people')
        .update({ avatar_url: null })
        .eq('id', personId)
      if (updErr) throw updErr
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setUploading(false)
    }
  }

  const initial = (personEmail[0] ?? '?').toUpperCase()

  return (
    <div className="flex items-center gap-2">
      {currentUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentUrl}
          alt={personEmail}
          className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200"
        />
      ) : (
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
          {initial}
        </span>
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {uploading ? '…' : currentUrl ? 'Change' : 'Upload'}
      </button>
      {currentUrl && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={uploading}
          className="text-xs text-rose-600 hover:text-rose-800"
        >
          Remove
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  )
}
