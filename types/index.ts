export interface RateData {
  date: string
  TTBUY?: number | string
  ODBUY?: number | string
  TTSEL?: number | string
  // Legacy support for old data format
  value?: number | string
}

export type RateType = 'TTBUY' | 'ODBUY' | 'TTSEL'

export interface CurrencyData {
  [key: string]: RateData[]
}

export interface Stats {
  min: number
  max: number
  avg: number
}

