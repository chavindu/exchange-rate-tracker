export default async function handler(req, res) {

  // Authentication check for cron
  if (
    process.env.CRON_SECRET &&
    req.headers["authorization"] !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).send("Unauthorized");
  }

    console.log("Cron triggered...");
    await import("../public/fetch-rates.js");
    res.status(200).json({ success: true });
}
