'use client'

import { useState, useEffect } from 'react'
import { RateData, RateType } from '@/types'

interface CurrencyListProps {
  currencies: string[]
  selected: string[]
  onToggle: (code: string) => void
  lastValues: { [key: string]: number | null }
  rateType: RateType
}

interface CurrencyFlag {
  code: string
  name: string
  country: string
  countryCode: string
  flag: string
}

const rateTypeLabels: Record<RateType, string> = {
  TTBUY: 'T/T Buying',
  ODBUY: 'O/D Buying',
  TTSEL: 'T/T Selling'
}

export function CurrencyList({ currencies, selected, onToggle, lastValues, rateType }: CurrencyListProps) {
  const [flagsMap, setFlagsMap] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    const loadFlags = async () => {
      try {
        const response = await fetch('/img/currencies-with-flags.json')
        const flagsData: CurrencyFlag[] = await response.json()
        const map: { [key: string]: string } = {}
        flagsData.forEach((item) => {
          map[item.code] = item.flag
        })
        setFlagsMap(map)
      } catch (e) {
        console.warn('Failed to load currency flags:', e)
      }
    }
    loadFlags()
  }, [])

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
              <div className="code">
                {flagsMap[code] && (
                  <img 
                    src={flagsMap[code]} 
                    alt={code} 
                    className="currencyFlag"
                    style={{ width: '20px', height: '15px', objectFit: 'cover', borderRadius: '2px' }}
                  />
                )}
                {code}
              </div>
              <div className="small">{rateTypeLabels[rateType]}</div>
            </div>
            <div className="currencyValue">{fmt(lastValues[code])}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

