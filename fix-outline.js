const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            if (!file.includes('node_modules') && !file.includes('.git')) {
                results = results.concat(walk(file));
            }
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('/Users/kavin/Documents/GitHub/BEXO/artifacts/bexo');
let changedCount = 0;

for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('outlineStyle: "none"')) {
        const newContent = content.replace(/outlineStyle:\s*"none"/g, 'outlineStyle: "none" as any');
        fs.writeFileSync(file, newContent);
        changedCount++;
        console.log(`Updated ${file}`);
    }
}
console.log(`Updated ${changedCount} files.`);
