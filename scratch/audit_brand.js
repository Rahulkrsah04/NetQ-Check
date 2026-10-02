import fs from 'fs';
import path from 'path';

const srcDir = './src';
const publicDir = './public';

function scanDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      scanDir(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allFiles = [...scanDir(srcDir), 'index.html', 'tailwind.config.js', 'public/favicon.svg'];

console.log('--- LEGALMETRIX REFERENCES ---');
allFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(/LegalMetriX|legalmetrix|Saffron/gi);
    if (matches) {
      console.log(`${file}: ${matches.length} matches`);
    }
  }
});

console.log('--- ORANGE / SAFFRON REFERENCES ---');
allFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(/#F56600|orange/gi);
    if (matches) {
      console.log(`${file}: ${matches.length} matches`);
    }
  }
});
