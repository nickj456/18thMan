// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  role: string | null
  profileError: { message: string } | null
  uploadError: { message: string } | null
} = { user: null, role: null, profileError: null, uploadError: null }

const uploadMock = vi.fn(async () => ({ error: state.uploadError }))

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
    storage: { from: () => ({ upload: uploadMock }) },
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

describe('POST /api/admin/shop-assets/upload', () => {
  beforeEach(() => {
    state.user = { id: 'admin-1' }
    state.role = 'admin'
    state.profileError = null
    state.uploadError = null
    uploadMock.mockClear()
  })

  it('returns 401 when unauthenticated', async () => {
    state.user = null
    const res = await POST(request(makeFile('a.pdf', 'application/pdf', 100)))
    expect(res.status).toBe(401)
  })

  it('returns 500 when the profile lookup fails', async () => {
    state.profileError = { message: 'db down' }
    const res = await POST(request(makeFile('a.pdf', 'application/pdf', 100)))
    expect(res.status).toBe(500)
  })

  it('returns 403 for a non-admin', async () => {
    state.role = 'coach'
    const res = await POST(request(makeFile('a.pdf', 'application/pdf', 100)))
    expect(res.status).toBe(403)
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('returns 400 when no file is provided', async () => {
    const res = await POST(request(null))
    expect(res.status).toBe(400)
  })

  it('returns 400 for a disallowed file type', async () => {
    const res = await POST(request(makeFile('a.exe', 'application/x-msdownload', 100)))
    expect(res.status).toBe(400)
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('returns 400 for an oversized file', async () => {
    const res = await POST(request(makeFile('a.pdf', 'application/pdf', 500 * 1024 * 1024 + 1)))
    expect(res.status).toBe(400)
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('uploads a valid PDF and returns its storage path', async () => {
    const res = await POST(request(makeFile('a.pdf', 'application/pdf', 100)))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.path).toMatch(/^products\/.+\.pdf$/)
    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringMatching(/^products\//),
      expect.any(Buffer),
      { contentType: 'application/pdf', upsert: false },
    )
  })

  it('accepts an allowed video type', async () => {
    const res = await POST(request(makeFile('a.mp4', 'video/mp4', 100)))
    expect(res.status).toBe(200)
  })

  it('returns 500 when the storage upload fails', async () => {
    state.uploadError = { message: 'bucket unreachable' }
    const res = await POST(request(makeFile('a.pdf', 'application/pdf', 100)))
    expect(res.status).toBe(500)
  })
})
