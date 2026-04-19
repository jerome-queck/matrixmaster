import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import MacWindowChrome from './components/lab/MacWindowChrome';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <MacWindowChrome>
      <App />
    </MacWindowChrome>
  </React.StrictMode>
);
