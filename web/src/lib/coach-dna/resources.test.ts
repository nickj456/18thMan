import { describe, it, expect } from 'vitest'
import { resourcesFor, CATEGORY_RESOURCES } from './resources'

describe('resourcesFor', () => {
  it('returns the curated resources for a known category', () => {
    const result = resourcesFor('teacher')
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('title')
    expect(result[0]).toHaveProperty('description')
  })

  it('returns an empty array for an unknown category, never throws', () => {
    expect(resourcesFor('not-a-real-category')).toEqual([])
  })

  it('has at least one resource for every one of the 8 known categories', () => {
    const categories = ['teacher', 'technician', 'motivator', 'developer', 'game-manager', 'communicator', 'organiser', 'culture-builder']
    for (const slug of categories) {
      expect(CATEGORY_RESOURCES[slug]?.length).toBeGreaterThan(0)
    }
  })

  it('never has a resource with an empty title or description', () => {
    for (const resources of Object.values(CATEGORY_RESOURCES)) {
      for (const resource of resources) {
        expect(resource.title.trim().length).toBeGreaterThan(0)
        expect(resource.description.trim().length).toBeGreaterThan(0)
      }
    }
  })
})
