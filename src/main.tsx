import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Clean up any stale dev-sw.js registrations and register our clean static /sw.js
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        const scriptUrl =
          reg.active?.scriptURL ||
          reg.installing?.scriptURL ||
          reg.waiting?.scriptURL ||
          '';
        if (scriptUrl.includes('dev-sw.js') || scriptUrl.includes('workbox')) {
          await reg.unregister();
        }
      }
      await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    } catch {
      // Ignore service worker registration errors in restricted preview iframes
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);
