'use client'

import { useState, useEffect } from 'react'
import { RateType, RateData } from '@/types'

interface RateCalculatorProps {
  isOpen: boolean
  onClose: () => void
  currencies: string[]
  lastValues: { [key: string]: number | null }
  rateType: RateType
  dataCache: { [key: string]: RateData[] }
}

export function RateCalculator({ isOpen, onClose, currencies, lastValues, rateType: initialRateType, dataCache }: RateCalculatorProps) {
  const [fromCurrency, setFromCurrency] = useState<string>('GBP')
  const [fromAmount, setFromAmount] = useState<string>('')
  const [toAmount, setToAmount] = useState<string>('')
  const [lastEdited, setLastEdited] = useState<'from' | 'to' | null>(null)
  const [rateType, setRateType] = useState<RateType>('TTBUY')

  const parseNum = (v: number | string) => {
    if (typeof v === 'string') return parseFloat(v.replace(/,/g, ''))
    return Number(v)
  }

  // Get the value for the selected rate type, with fallback to legacy 'value' field
  const getRateValue = (data: RateData, type: RateType): number | string | null => {
    if (data[type] != null) return data[type]!
    // Legacy support for old data format
    if (data.value != null) return data.value
    return null
  }

  // Get today's rate for a currency based on rateType
  const getTodayRate = (code: string): number | null => {
    if (code === 'LKR') return 1
    const arr = dataCache[code] || []
    if (arr.length > 0) {
      const rateValue = getRateValue(arr[arr.length - 1], rateType)
      return rateValue != null ? parseNum(rateValue) : null
    }
    return null
  }

  // Get the latest available date from all currency data
  const getLatestDate = (): string | null => {
    let latestDate: string | null = null
    currencies.forEach((code) => {
      const arr = dataCache[code] || []
      if (arr.length > 0) {
        const date = arr[arr.length - 1].date
        if (!latestDate || date > latestDate) {
          latestDate = date
        }
      }
    })
    return latestDate
  }

  // Format date for display
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    } catch {
      return dateStr
    }
  }

  // Reset when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFromAmount('1')
      setToAmount('')
      setLastEdited('from')
      setRateType('TTBUY')
      if (currencies.length > 0 && !currencies.includes(fromCurrency)) {
        setFromCurrency(currencies[0])
      }
    }
  }, [isOpen, currencies, fromCurrency, initialRateType])

  // Calculate "To" (LKR) when "From" amount changes
  useEffect(() => {
    if (lastEdited !== 'from' || !fromAmount || !isOpen) return

    const numAmount = parseFloat(fromAmount.replace(/,/g, ''))
    if (isNaN(numAmount) || numAmount <= 0) {
      setToAmount('')
      return
    }

    // Converting FROM currency TO LKR
    const rate = getTodayRate(fromCurrency)
    if (rate && rate > 0) {
      const lkrAmount = numAmount * rate
      setToAmount(lkrAmount.toFixed(2))
    } else {
      setToAmount('')
    }
  }, [fromAmount, fromCurrency, isOpen, lastEdited, rateType, dataCache])

  // Calculate "From" when "To" (LKR) amount changes
  useEffect(() => {
    if (lastEdited !== 'to' || !toAmount || !isOpen) return

    const numAmount = parseFloat(toAmount.replace(/,/g, ''))
    if (isNaN(numAmount) || numAmount <= 0) {
      setFromAmount('')
      return
    }

    // Converting FROM LKR TO currency
    const rate = getTodayRate(fromCurrency)
    if (rate && rate > 0) {
      const currencyAmount = numAmount / rate
      setFromAmount(currencyAmount.toFixed(2))
    } else {
      setFromAmount('')
    }
  }, [toAmount, fromCurrency, isOpen, lastEdited, rateType, dataCache])

  // Recalculate when currency changes (if there's a value in either field)
  useEffect(() => {
    if (!isOpen) return

    if (fromAmount && lastEdited === 'from') {
      // Recalculate toAmount based on new currency
      const numAmount = parseFloat(fromAmount.replace(/,/g, ''))
      if (!isNaN(numAmount) && numAmount > 0) {
        const rate = getTodayRate(fromCurrency)
        if (rate && rate > 0) {
          setToAmount((numAmount * rate).toFixed(2))
        } else {
          setToAmount('')
        }
      }
    } else if (toAmount && lastEdited === 'to') {
      // Recalculate fromAmount based on new currency
      const numAmount = parseFloat(toAmount.replace(/,/g, ''))
      if (!isNaN(numAmount) && numAmount > 0) {
        const rate = getTodayRate(fromCurrency)
        if (rate && rate > 0) {
          setFromAmount((numAmount / rate).toFixed(2))
        } else {
          setFromAmount('')
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromCurrency, rateType])

  const formatNumber = (num: number | null): string => {
    if (num === null || isNaN(num)) return ''
    return (Math.round(num * 1000) / 1000).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const getRateDisplay = (): string => {
    const rate = getTodayRate(fromCurrency)
    return rate ? `1 ${fromCurrency} = ${formatNumber(rate)} LKR` : 'Rate not available'
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="modalOverlay"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
      >
        {/* Modal */}
        <div
          className="modalContent"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px) saturate(180%)',
            borderRadius: 'var(--radius)',
            padding: '32px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            position: 'relative',
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--bitlab-navy)',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              transition: 'var(--transition)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            ×
          </button>

          <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 700, color: 'var(--bitlab-navy)' }}>
            Rate Calculator
          </h2>
          
          {/* Rate Type Selector */}
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="calculatorRateType"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--bitlab-navy)',
              }}
            >
              Rate Type
            </label>
            <select
              id="calculatorRateType"
              className="input"
              value={rateType}
              onChange={(e) => {
                setRateType(e.target.value as RateType)
                // Recalculate when rate type changes
                if (fromAmount) {
                  setLastEdited('from')
                } else if (toAmount) {
                  setLastEdited('to')
                }
              }}
              style={{ width: '100%' }}
            >
              <option value="TTBUY">T/T Buying</option>
              <option value="ODBUY">O/D Buying</option>
              <option value="TTSEL">T/T Selling</option>
            </select>
          </div>

          <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: 'var(--muted)' }}>
            Convert amounts using {getLatestDate() ? formatDate(getLatestDate()) : 'latest'} {rateType === 'TTBUY' ? 'T/T Buying' : rateType === 'ODBUY' ? 'O/D Buying' : 'T/T Selling'} rates
          </p>

          {/* Rate display */}
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(11, 116, 255, 0.1)',
              borderRadius: '12px',
              marginBottom: '24px',
              fontSize: '14px',
              color: 'var(--bitlab-navy)',
              fontWeight: 600,
            }}
          >
            {getRateDisplay()}
          </div>

          {/* From currency */}
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="fromCurrency"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--bitlab-navy)',
              }}
            >
              From
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <select
                id="fromCurrency"
                className="input"
                value={fromCurrency}
                onChange={(e) => {
                  setFromCurrency(e.target.value)
                  // Recalculate when currency changes based on which field has value
                  if (fromAmount) {
                    // Recalculate toAmount based on new currency
                    setLastEdited('from')
                  } else if (toAmount) {
                    // Recalculate fromAmount based on new currency
                    setLastEdited('to')
                  }
                }}
                style={{ flex: '0 0 120px' }}
              >
                {currencies.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              <input
                type="text"
                className="input"
                value={fromAmount}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.,]/g, '')
                  setFromAmount(value)
                  setLastEdited('from')
                }}
                placeholder="Enter amount"
                style={{ flex: 1 }}
              />
            </div>
          </div>

          {/* To currency (always LKR) */}
          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="toAmount"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--bitlab-navy)',
              }}
            >
              To (LKR)
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div
                className="input"
                style={{
                  flex: '0 0 120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255, 255, 255, 0.7)',
                  fontWeight: 600,
                  color: 'var(--bitlab-navy)',
                  cursor: 'default',
                }}
              >
                LKR
              </div>
              <input
                type="text"
                id="toAmount"
                className="input"
                value={toAmount}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.,]/g, '')
                  setToAmount(value)
                  setLastEdited('to')
                }}
                placeholder="Enter amount"
                style={{ flex: 1 }}
              />
            </div>
          </div>

          {/* Info note */}
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(0, 0, 0, 0.05)',
              borderRadius: '12px',
              fontSize: '12px',
              color: 'var(--muted)',
              textAlign: 'center',
            }}
          >
            Rates are based on {getLatestDate() ? formatDate(getLatestDate()) : 'latest'} exchange rates
          </div>
        </div>
      </div>
    </>
  )
}

