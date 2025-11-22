export default async function handler(req, res) {
    console.log("Triggered daily cron...");
    await import("../fetch-rates.js");
    res.status(200).json({ success: true });
}