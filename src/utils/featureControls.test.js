import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_API_CONTROLS, getApiControls, setApiControl, subscribeToApiControls } from './featureControls'

describe('API usage controls', () => {
  beforeEach(() => localStorage.clear())

  it('defaults every optional API section to enabled', () => {
    expect(getApiControls()).toEqual(DEFAULT_API_CONTROLS)
  })

  it('falls back safely when storage is malformed', () => {
    localStorage.setItem('secondsight-api-controls', '{bad json')
    expect(getApiControls()).toEqual(DEFAULT_API_CONTROLS)
  })

  it('persists a change and notifies the current tab', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToApiControls(listener)
    setApiControl('crawler', false)
    expect(getApiControls().crawler).toBe(false)
    expect(listener).toHaveBeenCalledWith({ ...DEFAULT_API_CONTROLS, crawler: false })
    unsubscribe()
  })
})
