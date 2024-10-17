// index.js - Serves as the entry point for the React application
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { getCLS, getFID, getLCP, getTTFB } from 'web-vitals';

// Send metrics to your backend endpoint
const sendToAnalytics = (metric) => {
  fetch('https://group-bse24-x-todoapp-2-backend.onrender.com/metrics/frontend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: metric.name,
      value: metric.value,
    }),
  }).catch((error) => console.error('Failed to send metric', error));
};

// Initialize Web Vitals tracking
getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
