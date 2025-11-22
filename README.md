# Exchange Rate Tracker

A web application that tracks TTBUY (Telegraphic Transfer Buying) exchange rates from Sampath Bank API and provides an interactive dashboard for visualizing historical exchange rate data.

## Features

- **Daily Rate Tracking**: Automatically fetches USD and GBP exchange rates daily via Vercel cron job
- **Interactive Dashboard**: Beautiful web interface with Chart.js visualizations
- **Multiple Currency Support**: Frontend supports viewing multiple currencies (USD, GBP, EUR, JPY, AUD, NZD, SGD, HKD, CNY, AED, INR)
- **Historical Data**: Stores daily exchange rates in JSON format with date-based tracking
- **Statistics**: Displays min, max, average, and percentage change for selected currencies
- **Data Export**: Export chart data as CSV
- **Dark Mode**: Toggle between light and dark themes
- **Flexible Views**: View data by last N days or monthly averages
- **Zoom & Pan**: Interactive chart with zoom and pan capabilities

## Architecture

### Backend
- **Serverless Function**: Vercel serverless function (`api/serverless.js`) that runs daily at midnight UTC
- **Data Source**: Fetches rates from Sampath Bank API via proxy (`https://sampath-proxy.chavindu-cloudflare.workers.dev/`)
- **Storage**: Updates JSON files in GitHub repository via GitHub API
- **Security**: Optional CRON_SECRET for authentication

### Frontend
- **Dashboard**: Single-page application (`public/index.html`) with Chart.js for visualizations
- **Data Files**: Currency data stored in `public/data/` directory as JSON files
- **Manifest**: `public/data/manifest.json` lists all available currencies

## Project Structure

```
exchange-rate-tracker/
├── api/
│   └── serverless.js      # Vercel serverless function (cron job handler)
├── public/
│   ├── index.html         # Main dashboard UI
│   ├── fetch-rates.js     # Local development script
│   └── data/              # Currency rate history files
│       ├── manifest.json  # List of available currencies
│       ├── usd.json       # USD rate history
│       ├── gbp.json       # GBP rate history
│       └── ...            # Other currency files
├── vercel.json            # Vercel configuration (cron schedule)
├── package.json           # Dependencies
└── README.md
```

## Setup

### Prerequisites
- Node.js (for local development)
- Vercel account (for deployment)
- GitHub repository with write access

### Environment Variables

Configure these in your Vercel project settings:

- `GITHUB_REPO`: GitHub repository (e.g., `username/repo-name`)
- `GITHUB_TOKEN`: GitHub personal access token with repo write permissions
- `GITHUB_BRANCH`: Branch name (defaults to `main`)
- `CRON_SECRET`: (Optional) Secret token for cron job authentication

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd exchange-rate-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Deploy to Vercel:
```bash
vercel deploy
```

4. Configure environment variables in Vercel dashboard

5. The cron job will automatically run daily at midnight UTC

## How It Works

1. **Daily Cron Job**: Vercel triggers the serverless function daily at 00:00 UTC
2. **Rate Fetching**: The function fetches current exchange rates from Sampath Bank API
3. **Data Update**: If today's rate doesn't exist, it appends the new rate to the respective JSON file
4. **GitHub Sync**: Updates are committed directly to the GitHub repository
5. **Dashboard**: The frontend reads JSON files and displays interactive charts

## Technologies Used

- **Backend**: Node.js, Vercel Serverless Functions
- **Frontend**: Vanilla JavaScript, Chart.js, Chart.js Zoom Plugin
- **Deployment**: Vercel
- **Data Storage**: JSON files in GitHub repository
- **Dependencies**: node-fetch@2

## Development

For local testing, you can use `public/fetch-rates.js`:

```bash
node public/fetch-rates.js
```

Note: This script requires local file system access and won't work in serverless environments.

## License

See LICENSE file for details.

## Author

Developed by Chavindu Nuwanpriya © 2025
