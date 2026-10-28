import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './i18n/LanguageContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<LanguageProvider><App /></LanguageProvider>);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => console.warn('PWA offline registration failed', error));
  });
}
