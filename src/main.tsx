import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './utils/autoRestartBot'
import TonConnectProvider from './components/TonConnectProvider'

createRoot(document.getElementById("root")!).render(
  <TonConnectProvider>
    <App />
  </TonConnectProvider>
);
