import fs from "fs";
import fetch from "node-fetch";

const API_URL = "https://www.sampath.lk/api/exchange-rates";

if (!fs.existsSync("./data")) {
    fs.mkdirSync("./data");
}

async function saveRate(currencyCode, rate) {
    const filePath = `./data/${currencyCode.toLowerCase()}.json`;

    let history = [];
    if (fs.existsSync(filePath)) {
        history = JSON.parse(fs.readFileSync(filePath));
    }

    const today = new Date().toISOString().split("T")[0];

    if (!history.find(e => e.date === today)) {
        history.push({ date: today, value: rate });
    }

    fs.writeFileSync(filePath, JSON.stringify(history, null, 4));
    console.log(`Saved ${currencyCode}: ${rate}`);
}

async function run() {
    try {
        const response = await fetch(API_URL);
        const json = await response.json();

        const data = json.data;

        const usd = data.find(x => x.CurrCode === "USD").TTBUY;
        const gbp = data.find(x => x.CurrCode === "GBP").TTBUY;

        await saveRate("USD", usd);
        await saveRate("GBP", gbp);

    } catch (err) {
        console.error("Error fetching:", err);
    }
}

run();