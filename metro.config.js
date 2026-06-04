// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 1. Permite que o servidor entenda arquivos WebAssembly (.wasm)
config.resolver.assetExts.push('wasm');

// 2. Adiciona cabeçalhos de segurança obrigatórios para o SQLite funcionar no navegador
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return middleware(req, res, next);
  };
};

module.exports = config;