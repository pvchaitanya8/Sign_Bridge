export interface Prediction {
  letter: string       // "A", "B", "space", "del", "nothing"
  confidence: number   // 0.0 – 1.0
}

export interface Message {
  id: string
  role: 'signer' | 'listener'
  text: string
  timestamp: Date
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'
