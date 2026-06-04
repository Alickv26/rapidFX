export interface NewsEvent {
  id: string
  date: string
  time: string
  timestamp: number
  currency: string
  impact: 'High' | 'Medium' | 'Low'
  event: string
  previous: string | null
  forecast: string | null
  actual: string | null
}

export interface FFEvent {
  id?: string
  date?: string
  time?: string
  currency?: string
  impact?: string
  event?: string
  previous?: string | { '#text': string }
  forecast?: string | { '#text': string }
  actual?: string | { '#text': string }
}
