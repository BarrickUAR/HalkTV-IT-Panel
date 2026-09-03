const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.prisma')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('IT_MANAGER') || content.includes('IT_LEAD')) {
        content = content.replace(/IT_MANAGER/g, 'TEKNIK_MUDUR');
        content = content.replace(/IT_LEAD/g, 'TEKNIK_YONETMEN');
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

replaceInDir(path.join(__dirname, 'src'));
replaceInDir(path.join(__dirname, 'prisma'));
