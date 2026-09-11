import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyAccent, savedAccent } from './lib/theme'

// Paint the user's colorway before the first render (no blue flash).
applyAccent(savedAccent())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
