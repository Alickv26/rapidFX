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
