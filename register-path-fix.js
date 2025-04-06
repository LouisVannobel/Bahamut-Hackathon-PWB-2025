// Ce fichier est chargé avant l'exécution du serveur pour résoudre les problèmes de chemin sur Windows
const path = require('path');
const { URL, pathToFileURL } = require('url');

// Remplacer import.meta.url par __filename dans les fichiers
global.__filename = function(meta) {
  return meta.url ? meta.url : pathToFileURL(__filename).href;
};

// Remplacer import.meta.dirname par __dirname dans les fichiers
global.__dirname = function(meta) {
  if (meta.url) {
    const url = new URL(meta.url);
    return path.dirname(url.pathname);
  }
  return __dirname;
};

// Correction pour les chemins Windows
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function(request, parent, isMain, options) {
  // Convertir les chemins Windows en chemins compatibles avec Node.js
  if (request.startsWith('c:') || request.startsWith('C:')) {
    request = 'file:///' + request.replace(/\\/g, '/');
  }
  return originalResolveFilename(request, parent, isMain, options);
};
