const STORAGE_KEY = 'secondsight-api-controls'
const CHANGE_EVENT = 'secondsight-api-controls-change'

export const DEFAULT_API_CONTROLS = Object.freeze({
  crawler: true,
  sources: true,
  aiVisibility: true
})

export function getApiControls() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return Object.fromEntries(Object.entries(DEFAULT_API_CONTROLS).map(([key, fallback]) => [key, typeof saved?.[key] === 'boolean' ? saved[key] : fallback]))
  } catch {
    return { ...DEFAULT_API_CONTROLS }
  }
}

export function setApiControl(key, enabled) {
  const next = { ...getApiControls(), [key]: enabled }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }))
  return next
}

export function subscribeToApiControls(listener) {
  const handleChange = event => listener(event.detail)
  window.addEventListener(CHANGE_EVENT, handleChange)
  return () => window.removeEventListener(CHANGE_EVENT, handleChange)
}
