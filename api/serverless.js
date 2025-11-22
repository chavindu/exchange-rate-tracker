import fetch from "node-fetch";

export default async function handler(req, res) {
  // Cron auth
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

  // 1. Fetch data
  const response = await fetch(API_URL);
  const text = await response.text();

// If the API returns HTML → fail safely
if (text.trim().startsWith("<")) {
  console.error("ERROR: Sampath API returned HTML instead of JSON");
  console.error(text.slice(0, 200)); // print first 200 chars
  return res.status(500).json({ error: "Invalid API response" });
}

const json = JSON.parse(text);

  const data = json.data;

  const usd = data.find(x => x.CurrCode === "USD").TTBUY;
  const gbp = data.find(x => x.CurrCode === "GBP").TTBUY;

  const today = new Date().toISOString().split("T")[0];

  // 2. Load existing history files from GitHub
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

  // 3. Update file content
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

  // USD
  const usdFile = await loadFile("public/data/usd.json");
  if (!usdFile.json.find(e => e.date === today)) {
    usdFile.json.push({ date: today, value: usd });
    await updateFile("public/data/usd.json", usdFile.json, usdFile.sha);
  }

  // GBP
  const gbpFile = await loadFile("public/data/gbp.json");
  if (!gbpFile.json.find(e => e.date === today)) {
    gbpFile.json.push({ date: today, value: gbp });
    await updateFile("public/data/gbp.json", gbpFile.json, gbpFile.sha);
  }

  res.json({ success: true });
}
