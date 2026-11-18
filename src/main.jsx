import React from 'react';
import ReactDOM from 'react-dom/client';
import { initAll } from '@amplitude/unified';
import '@/lib/geo-market';
import '@/lib/sepay-config';
import '@/lib/intl-payment-config';
import '@/lib/discount-codes';
import App from './App';
import './index.css';

const amplitudeKey = import.meta.env.VITE_AMPLITUDE_API_KEY;
if (!amplitudeKey) {
  console.error('[amplitude] VITE_AMPLITUDE_API_KEY is not set — no events will be sent');
} else {
  initAll(amplitudeKey, {
    serverZone: 'US',
    analytics: { autocapture: true },
    sessionReplay: { sampleRate: 1 },
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
