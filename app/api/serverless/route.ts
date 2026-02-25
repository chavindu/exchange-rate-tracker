import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

async function getServerIP() {
  try {
    const r = await fetch('https://api64.ipify.org?format=json')
    const j = await r.json()
    return j.ip
  } catch (e) {
    console.error('IP lookup failed', e)
    return 'unknown'
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const forceQuery = ['1', 'true', 'yes'].includes((url.searchParams.get('force') || '').toLowerCase())

  // Treat calls at the scheduled cron time (03:30 UTC) as "normal" idempotent runs.
  // Any other time is considered a manual run and will force overwrite today's values.
  const now = new Date()
  const isScheduledTime = now.getUTCHours() === 3 && now.getUTCMinutes() === 30
  const force = forceQuery || !isScheduledTime

  // Cron security
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const API_URL = 'https://sampath-proxy.chavindu-cloudflare.workers.dev/'
  const repo = process.env.GITHUB_REPO
  const branch = process.env.GITHUB_BRANCH || 'main'
  const token = process.env.GITHUB_TOKEN

  console.log(`Cron triggered...${force ? ' (force overwrite enabled)' : ''}`)

  // Fetch Sampath API
  const response = await fetch(API_URL)
  const text = await response.text()

  // Detect HTML / blocked response
  const serverIP = await getServerIP()

  if (text.trim().startsWith('<')) {
    console.error('ERROR: Sampath API returned HTML instead of JSON')
    console.error('Server Public IP:', serverIP)
    console.error(text.slice(0, 200))

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid API response',
        serverIP,
      },
      { status: 500 }
    )
  }

  // Parse valid JSON
  const json = JSON.parse(text)
  const data = json.data

  const today = new Date().toISOString().split('T')[0]

  // Load GitHub file
  async function loadFile(path: string) {
    const r = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const j = await r.json()
    return {
      sha: j.sha,
      json: JSON.parse(Buffer.from(j.content, 'base64').toString('utf8')),
    }
  }

  // Update or create file (array of rate entries)
  async function updateFile(path: string, history: any[], sha: string | null, message?: string) {
    const content = Buffer.from(JSON.stringify(history, null, 4)).toString('base64')

    const body: any = {
      message: message || `Daily update ${path} (${today})`,
      content,
      branch,
    }

    if (sha) body.sha = sha

    await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  }

  // Write arbitrary JSON file (e.g. last-updated.json)
  async function putJsonFile(path: string, obj: object, sha: string | null, message: string) {
    const content = Buffer.from(JSON.stringify(obj, null, 2)).toString('base64')
    const body: any = { message, content, branch }
    if (sha) body.sha = sha
    await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  }

  // Load manifest to get list of currencies to track
  let manifest = ['USD', 'GBP'] // fallback
  try {
    const manifestFile = await loadFile('public/data/manifest.json')
    manifest = manifestFile.json
    console.log(`Loaded manifest with ${manifest.length} currencies: ${manifest.join(', ')}`)
  } catch (e) {
    console.warn('Failed to load manifest.json, using default currencies (USD, GBP)', e)
  }

  // Update all currencies from manifest
  const results: any[] = []
  for (const currencyCode of manifest) {
    try {
      const currencyData = data.find((x: any) => x.CurrCode === currencyCode)
      if (!currencyData) {
        console.warn(`Currency ${currencyCode} not found in API response`)
        continue
      }

      const ttbuy = currencyData.TTBUY
      const odbuy = currencyData.ODBUY
      const ttsel = currencyData.TTSEL
      const filePath = `public/data/${currencyCode.toLowerCase()}.json`

      // Load existing file or create new one
      let fileData
      try {
        fileData = await loadFile(filePath)
      } catch (e) {
        // File doesn't exist, create new one
        console.log(`Creating new file for ${currencyCode}`)
        fileData = { sha: null, json: [] }
      }

      // Check if today's entry already exists
      const existingIndex = fileData.json.findIndex((e: any) => e.date === today)

      if (existingIndex === -1) {
        fileData.json.push({
          date: today,
          TTBUY: ttbuy,
          ODBUY: odbuy,
          TTSEL: ttsel,
        })

        // Update file on GitHub
        await updateFile(filePath, fileData.json, fileData.sha)
        console.log(`Updated ${currencyCode}: TTBUY=${ttbuy}, ODBUY=${odbuy}, TTSEL=${ttsel}`)
        results.push({ currency: currencyCode, success: true, ttbuy, odbuy, ttsel })
      } else if (force) {
        fileData.json[existingIndex] = {
          ...fileData.json[existingIndex],
          date: today,
          TTBUY: ttbuy,
          ODBUY: odbuy,
          TTSEL: ttsel,
        }

        await updateFile(filePath, fileData.json, fileData.sha, `Force overwrite ${filePath} (${today})`)
        console.log(`Overwrote ${currencyCode}: TTBUY=${ttbuy}, ODBUY=${odbuy}, TTSEL=${ttsel}`)
        results.push({ currency: currencyCode, success: true, overwritten: true, ttbuy, odbuy, ttsel })
      } else {
        console.log(`${currencyCode} already has entry for ${today}`)
        results.push({ currency: currencyCode, success: true, skipped: true })
      }
    } catch (e: any) {
      console.error(`Error updating ${currencyCode}:`, e)
      results.push({ currency: currencyCode, success: false, error: e.message })
    }
  }

  // Write last cron run timestamp for footer
  const lastUpdatedPath = 'public/data/last-updated.json'
  const updatedAt = new Date().toISOString()
  try {
    let lastUpdatedSha: string | null = null
    try {
      const existing = await loadFile(lastUpdatedPath)
      lastUpdatedSha = existing.sha
    } catch {
      // file does not exist yet
    }
    await putJsonFile(
      lastUpdatedPath,
      { updatedAt },
      lastUpdatedSha,
      `Cron run ${today} at ${updatedAt}`
    )
    console.log('Updated last-updated.json:', updatedAt)
  } catch (e) {
    console.warn('Failed to update last-updated.json', e)
  }

  return NextResponse.json({
    success: true,
    serverIP,
    currenciesUpdated: results.filter((r) => r.success && (r.overwritten || !r.skipped)).length,
    currenciesSkipped: results.filter((r) => r.skipped).length,
    currenciesFailed: results.filter((r) => !r.success).length,
    results,
  })
}

