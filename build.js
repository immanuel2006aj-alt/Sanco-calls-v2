const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔒 Locking Sanco sources...\n');

console.log('📦 Minifying JS...');
execSync('npx terser *.js -o dist/app.min.js --compress --mangle', { stdio: 'inherit' });

console.log('🎨 Minifying CSS...');
execSync('npx postcss style.css --use cssnano -o dist/style.min.css', { stdio: 'inherit' });

console.log('📄 Minifying HTML...');
execSync('npx html-minifier index.html -o dist/index.html --collapse-whitespace --remove-comments --minify-css true --minify-js true', { stdio: 'inherit' });
execSync('npx html-minifier room.html -o dist/room.html --collapse-whitespace --remove-comments --minify-css true --minify-js true', { stdio: 'inherit' });

console.log('\n✅ Build complete. Output in dist/');
