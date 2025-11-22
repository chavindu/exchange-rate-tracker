# Migration to Next.js

The dashboard has been successfully migrated from a static HTML file to a Next.js application with improved dark mode support.

## What Changed

### Architecture
- **Before**: Single HTML file with inline CSS and JavaScript
- **After**: Next.js 14+ with App Router, TypeScript, and component-based architecture

### Dark Mode Improvements
- **Before**: Manual class toggling with `bitlab-custom-class-dark-theme`
- **After**: Professional dark mode using `next-themes` with:
  - System preference detection (optional)
  - Persistent theme storage
  - Smooth transitions
  - No flash of wrong theme
  - Better state management

### File Structure
```
exchange-rate-tracker/
├── app/
│   ├── api/
│   │   └── serverless/
│   │       └── route.ts          # API route (migrated from api/serverless.js)
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout with ThemeProvider
│   └── page.tsx                  # Main dashboard page
├── components/
│   ├── CurrencyList.tsx          # Currency selection component
│   ├── ExchangeChart.tsx         # Chart component with Chart.js
│   ├── StatsCards.tsx            # Statistics cards component
│   ├── ThemeProvider.tsx         # Theme context provider
│   └── ThemeToggle.tsx           # Dark mode toggle button
├── types/
│   └── index.ts                  # TypeScript type definitions
├── public/
│   └── data/                     # Currency data files (unchanged)
├── next.config.js                # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Updated dependencies
```

## New Dependencies

- `next`: Next.js framework
- `react` & `react-dom`: React library
- `next-themes`: Professional theme management
- `chart.js` & `react-chartjs-2`: Chart library
- `chartjs-plugin-zoom`: Chart zoom functionality
- `typescript`: Type safety

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
npm start
```

## Key Improvements

1. **Better Dark Mode**: Uses `next-themes` for professional theme management
2. **Type Safety**: Full TypeScript support
3. **Component Architecture**: Modular, reusable components
4. **Better Performance**: Next.js optimizations
5. **SEO Ready**: Server-side rendering capabilities
6. **Modern Stack**: Latest React and Next.js features

## API Route

The serverless function has been migrated to Next.js API route format:
- **Old**: `api/serverless.js` (Vercel serverless function)
- **New**: `app/api/serverless/route.ts` (Next.js API route)

The cron job configuration in `vercel.json` remains the same and will work with the new route.

## Environment Variables

No changes required - same environment variables:
- `GITHUB_REPO`
- `GITHUB_TOKEN`
- `GITHUB_BRANCH`
- `CRON_SECRET`

## Migration Notes

- The old `public/index.html` file is kept for reference but is no longer used
- All functionality has been preserved and improved
- Chart.js integration is now done through `react-chartjs-2`
- Dark mode now persists across page reloads
- Better mobile responsiveness maintained

