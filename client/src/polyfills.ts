// Polyfills pour ethers.js
import { Buffer } from 'buffer';

// Définir Buffer globalement
window.Buffer = Buffer;

// Définir process.env pour les modules qui en ont besoin
if (!window.process) {
  window.process = { env: {} } as any;
}

// Définir global pour les modules qui en ont besoin
if (typeof window.global === 'undefined') {
  window.global = window;
}
