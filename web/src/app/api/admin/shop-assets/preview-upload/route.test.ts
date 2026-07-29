// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  role: string | null
  profileError: { message: string } | null
  uploadError: { message: string } | null
} = { user: null, role: null, profileError: null, uploadError: null }

const uploadMock = vi.fn(async () => ({ error: state.uploadError }))
const getPublicUrlMock = vi.fn(() => ({ data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/shop-previews/previews/a.jpg' } }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: state.role ? { role: state.role } : null, error: state.profileError }),
        }),
      }),
    }),
  }),
}))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    storage: { from: () => ({ upload: uploadMock, getPublicUrl: getPublicUrlMock }) },
  }),
}))

import { POST } from './route'

function makeFile(name: string, type: string, sizeBytes: number): File {
  const buffer = new Uint8Array(sizeBytes)
  return new File([buffer], name, { type })
}

function request(file: File | null): Request {
  const formData = new FormData()
  if (file) formData.append('file', file)
  return { formData: async () => formData } as unknown as Request
}

describe('POST /api/admin/shop-assets/preview-upload', () => {
  beforeEach(() => {
    state.user = { id: 'admin-1' }
    state.role = 'admin'
    state.profileError = null
    state.uploadError = null
    uploadMock.mockClear()
    getPublicUrlMock.mockClear()
  })

  it('returns 401 when unauthenticated', async () => {
    state.user = null
    const res = await POST(request(makeFile('a.jpg', 'image/jpeg', 100)))
    expect(res.status).toBe(401)
  })

  it('returns 500 when the profile lookup fails', async () => {
    state.profileError = { message: 'db down' }
    const res = await POST(request(makeFile('a.jpg', 'image/jpeg', 100)))
    expect(res.status).toBe(500)
  })

  it('returns 403 for a non-admin', async () => {
    state.role = 'coach'
    const res = await POST(request(makeFile('a.jpg', 'image/jpeg', 100)))
    expect(res.status).toBe(403)
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('returns 400 when no file is provided', async () => {
    const res = await POST(request(null))
    expect(res.status).toBe(400)
  })

  it('returns 400 for a disallowed file type', async () => {
    const res = await POST(request(makeFile('a.pdf', 'application/pdf', 100)))
    expect(res.status).toBe(400)
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('returns 400 for an oversized file', async () => {
    const res = await POST(request(makeFile('a.jpg', 'image/jpeg', 10 * 1024 * 1024 + 1)))
    expect(res.status).toBe(400)
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('uploads a valid image and returns its public URL', async () => {
    const res = await POST(request(makeFile('a.jpg', 'image/jpeg', 100)))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.url).toBe('https://example.supabase.co/storage/v1/object/public/shop-previews/previews/a.jpg')
    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringMatching(/^previews\/.+\.jpg$/),
      expect.any(Buffer),
      { contentType: 'image/jpeg', upsert: false },
    )
  })

  it('returns 500 when the storage upload fails', async () => {
    state.uploadError = { message: 'bucket unreachable' }
    const res = await POST(request(makeFile('a.jpg', 'image/jpeg', 100)))
    expect(res.status).toBe(500)
  })
})
