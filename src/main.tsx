import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Commit Mono — fonte monoespaçada de texto corrido.
// Vem do npm porque é publicada no Fontsource.
import '@fontsource/commit-mono/400.css'
import '@fontsource/commit-mono/400-italic.css'

import './styles.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
