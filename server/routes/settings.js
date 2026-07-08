import express from 'express'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const router = express.Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env')

// Standard keys we expect to manage
const MANAGED_KEYS = [
  'GOOGLE_API_KEY',
  'SCRAPEBADGER_API_KEY',
  'CHATGPT_API_KEY'
]

async function readEnv() {
  try {
    const content = await fs.readFile(envPath, 'utf-8')
    const lines = content.split('\n')
    const envObj = {}
    lines.forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/)
      if (match) {
        envObj[match[1].trim()] = match[2].trim()
      }
    })
    return envObj
  } catch (err) {
    if (err.code === 'ENOENT') {
      return {}
    }
    throw err
  }
}

async function writeEnv(envObj) {
  const lines = Object.entries(envObj).map(([key, val]) => `${key}=${val}`)
  await fs.writeFile(envPath, lines.join('\n') + '\n', 'utf-8')
}

router.get('/env', async (req, res) => {
  try {
    const envObj = await readEnv()
    const safeEnv = {}
    MANAGED_KEYS.forEach(key => {
      safeEnv[key] = envObj[key] || ''
    })
    res.json(safeEnv)
  } catch (err) {
    res.status(500).json({ error: 'Failed to read env file' })
  }
})

router.post('/env', async (req, res) => {
  try {
    const updates = req.body
    const envObj = await readEnv()
    
    MANAGED_KEYS.forEach(key => {
      if (updates[key] !== undefined) {
        envObj[key] = updates[key]
        process.env[key] = updates[key] // Update runtime memory as well
      }
    })
    
    await writeEnv(envObj)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update env file' })
  }
})

export default router
