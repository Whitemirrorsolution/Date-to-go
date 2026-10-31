const fs = require('fs');
const path = require('path');
const dirs = ['src/roles/seeker/pages', 'src/roles/partner/pages'];

function fix(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/from '\.\.\/\.\.\/\.\.\/\.\.\/services/g, "from '../../../services");
  content = content.replace(/from '\.\.\/\.\.\/\.\.\/\.\.\/context/g, "from '../../../context");
  content = content.replace(/from '\.\.\/\.\.\/\.\.\/\.\.\/components/g, "from '../../../components");
  content = content.replace(/from '\.\.\/\.\.\/\.\.\/\.\.\/utils/g, "from '../../../utils");
  content = content.replace(/from '\.\.\/\.\.\/\.\.\/\.\.\/shared/g, "from '../../../shared");
  content = content.replace(/from '\.\.\/\.\.\/\.\.\/\.\.\/pwa/g, "from '../../../pwa");
  
  // also dynamic imports
  content = content.replace(/import\('\.\.\/\.\.\/\.\.\/\.\.\/services/g, "import('../../../services");
  fs.writeFileSync(filePath, content);
}

for (const dir of dirs) {
  const fullDir = path.join(__dirname, 'frontend', dir);
  for (const file of fs.readdirSync(fullDir)) {
    if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue;
    fix(path.join(fullDir, file));
  }
}
console.log('Fixed paths');
