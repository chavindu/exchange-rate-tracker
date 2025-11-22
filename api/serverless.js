import fetch from "node-fetch";

// ---------------------
// Get public IP of Vercel serverless
// ---------------------
async function getServerIP() {
  try {
    const r = await fetch("https://api64.ipify.org?format=json");
    const j = await r.json();
    return j.ip;
  } catch (e) {
    console.error("IP lookup failed", e);
    return "unknown";
  }
}

export default async function handler(req, res) {
  // Cron security
  if (
    process.env.CRON_SECRET &&
    req.headers["authorization"] !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).send("Unauthorized");
  }

  const API_URL = "https://www.sampath.lk/api/exchange-rates";
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  const token = process.env.GITHUB_TOKEN;

  console.log("Cron triggered...");

  // Fetch Sampath API
  const response = await fetch(API_URL);
  const text = await response.text();

  // Detect HTML / blocked response
  const serverIP = await getServerIP();

  if (text.trim().startsWith("<")) {
    console.error("ERROR: Sampath API returned HTML instead of JSON");
    console.error("Server Public IP:", serverIP);
    console.error(text.slice(0, 200));

    return res.status(500).json({
      success: false,
      error: "Invalid API response",
      serverIP
    });
  }

  // Parse valid JSON
  const json = JSON.parse(text);
  const data = json.data;

  const usd = data.find(x => x.CurrCode === "USD").TTBUY;
  const gbp = data.find(x => x.CurrCode === "GBP").TTBUY;

  const today = new Date().toISOString().split("T")[0];

  // Load GitHub file
  async function loadFile(path) {
    const r = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const j = await r.json();
    return {
      sha: j.sha,
      json: JSON.parse(Buffer.from(j.content, "base64").toString("utf8"))
    };
  }

  // Update file
  async function updateFile(path, history, sha) {
    const content = Buffer.from(JSON.stringify(history, null, 4)).toString("base64");

    await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Daily update ${path} (${today})`,
        content,
        sha,
        branch
      })
    });
  }

  // Update USD
  const usdFile = await loadFile("public/data/usd.json");
  if (!usdFile.json.find(e => e.date === today)) {
    usdFile.json.push({ date: today, value: usd });
    await updateFile("public/data/usd.json", usdFile.json, usdFile.sha);
  }

  // Update GBP
  const gbpFile = await loadFile("public/data/gbp.json");
  if (!gbpFile.json.find(e => e.date === today)) {
    gbpFile.json.push({ date: today, value: gbp });
    await updateFile("public/data/gbp.json", gbpFile.json, gbpFile.sha);
  }

  return res.json({
    success: true,
    serverIP
  });
}
