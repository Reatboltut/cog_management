const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const htmlPath = path.join(__dirname, 'file.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const match = html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/);

if (!match) {
  throw new Error('Could not find the main inline script in file.html');
}

new vm.Script(match[1], { filename: 'file.html::<script>' });
console.log('frontend-script-ok');
