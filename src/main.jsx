import React from 'react';
import ReactDOM from 'react-dom/client';
import '@/lib/geo-market';
import '@/lib/sepay-config';
import '@/lib/intl-payment-config';
import '@/lib/discount-codes';
import App from './App';
import './index.css';
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
