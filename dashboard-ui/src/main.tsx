import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './design-system/tokens.css'
import './index.css'
import App from './App.tsx'

const root = document.getElementById('root')
if (!root) throw new Error('#root 가 없습니다')

createRoot(root).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
