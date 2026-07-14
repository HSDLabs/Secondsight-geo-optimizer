import dns from 'node:dns/promises'
import net from 'node:net'

const BLOCKED_HOSTS = new Set(['localhost', 'localhost.localdomain', 'metadata.google.internal'])

function isPrivateIpv4(address) {
  const parts = address.split('.').map(Number)
  if (parts.length !== 4 || parts.some(part => Number.isNaN(part))) return false
  return parts[0] === 10
    || parts[0] === 127
    || (parts[0] === 169 && parts[1] === 254)
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168)
    || parts[0] === 0
}

function isPrivateIpv6(address) {
  const normalized = address.toLowerCase()
  return normalized === '::1'
    || normalized === '::'
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || normalized.startsWith('fe8')
    || normalized.startsWith('fe9')
    || normalized.startsWith('fea')
    || normalized.startsWith('feb')
}

export function isPrivateAddress(address) {
  const family = net.isIP(address)
  return family === 4 ? isPrivateIpv4(address) : family === 6 ? isPrivateIpv6(address) : false
}

export function parseSafeHttpUrl(value) {
  let parsed
  try {
    parsed = new URL(String(value || ''))
  } catch {
    throw new TypeError('A valid HTTP(S) URL is required.')
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new TypeError('Only HTTP(S) URLs are supported.')
  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '')
  if (!hostname || BLOCKED_HOSTS.has(hostname) || hostname.endsWith('.local') || isPrivateAddress(hostname)) {
    throw new TypeError('Private or internal network destinations are not allowed.')
  }
  parsed.username = ''
  parsed.password = ''
  return parsed
}

export async function assertPublicHttpUrl(value) {
  const parsed = parseSafeHttpUrl(value)
  const records = await dns.lookup(parsed.hostname, { all: true })
  if (!records.length || records.some(record => isPrivateAddress(record.address))) {
    throw new TypeError('Private or internal network destinations are not allowed.')
  }
  return parsed.href
}

export function safeSourceUrl(value) {
  try {
    return parseSafeHttpUrl(value).href
  } catch {
    return ''
  }
}

export function sanitizeText(value, limit = 4000) {
  return [...String(value || '')]
    .filter(character => {
      const code = character.charCodeAt(0)
      return code === 9 || code === 10 || code === 13 || code >= 32
    })
    .join('')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit)
}

export async function withTimeout(factory, timeoutMs, label = 'Operation') {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`${label} timed out after ${timeoutMs}ms`)
      error.code = 'COLLECTOR_TIMEOUT'
      reject(error)
    }, timeoutMs)
  })
  try {
    return await Promise.race([Promise.resolve().then(factory), timeout])
  } finally {
    clearTimeout(timer)
  }
}
