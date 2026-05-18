import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Make sure this points to wherever your Tailwind CSS file is! 
// (Usually index.css or App.css)
import './index.css'; 

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);