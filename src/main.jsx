import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// StrictMode is left off: drei's <Html> labels log harmless unmount warnings under it.
createRoot(document.getElementById('root')).render(<App />)
