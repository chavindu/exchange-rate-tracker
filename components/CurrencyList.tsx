'use client'

import { RateData, RateType } from '@/types'

interface CurrencyListProps {
  currencies: string[]
  selected: string[]
  onToggle: (code: string) => void
  lastValues: { [key: string]: number | null }
  rateType: RateType
}

const rateTypeLabels: Record<RateType, string> = {
  TTBUY: 'T/T Buying',
  ODBUY: 'O/D Buying',
  TTSEL: 'T/T Selling'
}

export function CurrencyList({ currencies, selected, onToggle, lastValues, rateType }: CurrencyListProps) {
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
              <div className="small">{rateTypeLabels[rateType]}</div>
            </div>
            <div className="currencyValue">{fmt(lastValues[code])}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

