'use client'

import { RateData } from '@/types'

interface CurrencyListProps {
  currencies: string[]
  selected: string[]
  onToggle: (code: string) => void
  lastValues: { [key: string]: number | null }
}

export function CurrencyList({ currencies, selected, onToggle, lastValues }: CurrencyListProps) {
  const fmt = (n: number | null) => {
    if (n === null) return '—'
    return (Math.round(n * 1000) / 1000).toLocaleString('en-US')
  }

  return (
    <div className="currencySection">
      <div className="currencySectionTitle">Currencies</div>
      <div>
        {currencies.map((code) => (
          <div
            key={code}
            className={`currency ${selected.includes(code) ? 'active' : ''}`}
            onClick={() => onToggle(code)}
          >
            <div className="currencyInfo">
              <div className="code">{code}</div>
              <div className="small">TTBUY Rate</div>
            </div>
            <div className="currencyValue">{fmt(lastValues[code])}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

