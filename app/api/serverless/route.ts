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

  console.log('Cron triggered...')

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

  // Update or create file
  async function updateFile(path: string, history: any[], sha: string | null) {
    const content = Buffer.from(JSON.stringify(history, null, 4)).toString('base64')

    const body: any = {
      message: `Daily update ${path} (${today})`,
      content,
      branch,
    }

    // Only include sha if file exists (for updates)
    if (sha) {
      body.sha = sha
    }

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

      const rate = currencyData.TTBUY
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
      if (!fileData.json.find((e: any) => e.date === today)) {
        fileData.json.push({ date: today, value: rate })

        // Update file on GitHub
        await updateFile(filePath, fileData.json, fileData.sha)
        console.log(`Updated ${currencyCode}: ${rate}`)
        results.push({ currency: currencyCode, success: true, rate })
      } else {
        console.log(`${currencyCode} already has entry for ${today}`)
        results.push({ currency: currencyCode, success: true, skipped: true })
      }
    } catch (e: any) {
      console.error(`Error updating ${currencyCode}:`, e)
      results.push({ currency: currencyCode, success: false, error: e.message })
    }
  }

  return NextResponse.json({
    success: true,
    serverIP,
    currenciesUpdated: results.filter((r) => r.success && !r.skipped).length,
    currenciesSkipped: results.filter((r) => r.skipped).length,
    currenciesFailed: results.filter((r) => !r.success).length,
    results,
  })
}

