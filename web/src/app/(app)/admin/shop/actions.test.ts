// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  role: string | null
  dbError: { message: string } | null
  existingSlugs: Set<string>
  updatedSlug: string | null
} = { user: null, role: null, dbError: null, existingSlugs: new Set(), updatedSlug: 'coaching-tips' }

const insertMock = vi.fn(async () => ({ error: state.dbError }))
const updateEqMock = vi.fn(() => ({
  select: () => ({
    single: async () => ({ data: state.dbError ? null : { slug: state.updatedSlug }, error: state.dbError }),
  }),
}))
const deleteEqMock = vi.fn(async () => ({ error: state.dbError }))
const revalidateMock = vi.fn()

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidateMock(...args),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => ({
      select: () => ({
        eq: (column: string, value: string) => ({
          single: async () => ({ data: table === 'profiles' ? { role: state.role } : null }),
          maybeSingle: async () => ({
            data: table === 'products' && column === 'slug' && state.existingSlugs.has(value) ? { id: 'existing' } : null,
          }),
        }),
      }),
      insert: insertMock,
      update: () => ({ eq: updateEqMock }),
      delete: () => ({ eq: deleteEqMock }),
    }),
  }),
}))

import { createProduct, updateProduct, togglePublish, deleteProduct } from './actions'

const validInput = {
  title: 'Coaching Tips',
  description: 'A guide',
  contentType: 'pdf' as const,
  priceCents: 200,
  minSubscriptionTier: null,
  storagePath: 'products/file.pdf',
  previewImageUrl: null,
}

describe('admin/shop actions', () => {
  beforeEach(() => {
    state.user = { id: 'admin-1' }
    state.role = 'admin'
    state.dbError = null
    state.existingSlugs = new Set()
    state.updatedSlug = 'coaching-tips'
    insertMock.mockClear()
    updateEqMock.mockClear()
    deleteEqMock.mockClear()
    revalidateMock.mockClear()
  })

  describe('admin gate (shared by every action)', () => {
    it('rejects unauthenticated callers on createProduct', async () => {
      state.user = null
      const result = await createProduct(validInput)
      expect(result).toEqual({ error: 'Not authenticated' })
      expect(insertMock).not.toHaveBeenCalled()
    })

    it('rejects non-admin callers on createProduct', async () => {
      state.role = 'coach'
      const result = await createProduct(validInput)
      expect(result).toEqual({ error: 'Not authorised' })
      expect(insertMock).not.toHaveBeenCalled()
    })

    it('rejects non-admin callers on updateProduct', async () => {
      state.role = 'coach'
      const result = await updateProduct('prod-1', validInput)
      expect(result).toEqual({ error: 'Not authorised' })
      expect(updateEqMock).not.toHaveBeenCalled()
    })

    it('rejects non-admin callers on togglePublish', async () => {
      state.role = 'coach'
      const result = await togglePublish('prod-1', true)
      expect(result).toEqual({ error: 'Not authorised' })
      expect(updateEqMock).not.toHaveBeenCalled()
    })

    it('rejects non-admin callers on deleteProduct', async () => {
      state.role = 'coach'
      const result = await deleteProduct('prod-1')
      expect(result).toEqual({ error: 'Not authorised' })
      expect(deleteEqMock).not.toHaveBeenCalled()
    })
  })

  describe('createProduct validation', () => {
    it('rejects a blank title', async () => {
      const result = await createProduct({ ...validInput, title: '   ' })
      expect(result).toEqual({ error: 'Title is required' })
      expect(insertMock).not.toHaveBeenCalled()
    })

    it('rejects a missing content file', async () => {
      const result = await createProduct({ ...validInput, storagePath: '' })
      expect(result).toEqual({ error: 'A content file must be uploaded' })
      expect(insertMock).not.toHaveBeenCalled()
    })

    it('rejects when neither price nor tier is set', async () => {
      const result = await createProduct({ ...validInput, priceCents: null, minSubscriptionTier: null })
      expect(result).toEqual({ error: 'Set a price, a required subscription tier, or both' })
      expect(insertMock).not.toHaveBeenCalled()
    })

    it('creates the product and revalidates on valid input', async () => {
      const result = await createProduct(validInput)
      expect(result).toEqual({ success: true })
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Coaching Tips', slug: 'coaching-tips', is_published: false, created_by: 'admin-1' }),
      )
      expect(revalidateMock).toHaveBeenCalledWith('/admin/shop')
    })

    it('disambiguates the slug when one already exists', async () => {
      state.existingSlugs = new Set(['coaching-tips'])
      await createProduct(validInput)
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'coaching-tips-2' }),
      )
    })

    it('surfaces the database error without revalidating', async () => {
      state.dbError = { message: 'constraint violation' }
      const result = await createProduct(validInput)
      expect(result).toEqual({ error: 'constraint violation' })
      expect(revalidateMock).not.toHaveBeenCalled()
    })
  })

  describe('updateProduct', () => {
    it('updates and revalidates the product, shop, and catalog paths', async () => {
      const result = await updateProduct('prod-1', validInput)
      expect(result).toEqual({ success: true })
      expect(updateEqMock).toHaveBeenCalledWith('id', 'prod-1')
      expect(revalidateMock).toHaveBeenCalledWith('/admin/shop')
      expect(revalidateMock).toHaveBeenCalledWith('/shop/coaching-tips')
      expect(revalidateMock).toHaveBeenCalledWith('/shop')
    })

    it('rejects when neither price nor tier is set', async () => {
      const result = await updateProduct('prod-1', { ...validInput, priceCents: null, minSubscriptionTier: null })
      expect(result).toEqual({ error: 'Set a price, a required subscription tier, or both' })
      expect(updateEqMock).not.toHaveBeenCalled()
    })
  })

  describe('togglePublish', () => {
    it('publishes and revalidates', async () => {
      const result = await togglePublish('prod-1', true)
      expect(result).toEqual({ success: true })
      expect(updateEqMock).toHaveBeenCalledWith('id', 'prod-1')
      expect(revalidateMock).toHaveBeenCalledWith('/shop')
    })
  })

  describe('deleteProduct', () => {
    it('deletes and revalidates', async () => {
      const result = await deleteProduct('prod-1')
      expect(result).toEqual({ success: true })
      expect(deleteEqMock).toHaveBeenCalledWith('id', 'prod-1')
    })

    it('surfaces a foreign-key restrict error (e.g. product has purchases)', async () => {
      state.dbError = { message: 'violates foreign key constraint' }
      const result = await deleteProduct('prod-1')
      expect(result).toEqual({ error: 'violates foreign key constraint' })
    })
  })
})
