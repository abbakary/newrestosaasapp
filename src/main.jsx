import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Store } from './store'
import { SaaSStore } from './saasStore'
import App from './App'

createRoot(document.getElementById('root')).render(
  <SaaSStore>
    <Store>
      <App />
    </Store>
  </SaaSStore>
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}))
}
