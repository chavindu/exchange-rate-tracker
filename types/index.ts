export interface RateData {
  date: string
  value: number | string
}

export interface CurrencyData {
  [key: string]: RateData[]
}

export interface Stats {
  min: number
  max: number
  avg: number
}

