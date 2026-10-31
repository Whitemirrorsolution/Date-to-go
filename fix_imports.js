const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  // the move was from src/pages to src/roles/X/pages
  // previously: import { api } from '../services/api' -> now should be '../../../services/api'
  // My previous script replaced `../` with `../../../`
  // But wait! If it already had `../../../`, it might become `../../../../../../`
  
  // Let's just fix known imports:
  // from '../../../services/api.js' -> from '../../../services/api.js'
  // from '../../../../../services/api.js' -> from '../../../services/api.js'
  
  content = content.replace(/from '(\.\.\/)+services/g, "from '../../../services");
  content = content.replace(/from '(\.\.\/)+context/g, "from '../../../context");
  content = content.replace(/from '(\.\.\/)+components/g, "from '../../../components");
  content = content.replace(/from '(\.\.\/)+utils/g, "from '../../../utils");
  content = content.replace(/from '(\.\.\/)+shared/g, "from '../../../shared");
  content = content.replace(/from '(\.\.\/)+pwa/g, "from '../../../pwa");
  
  fs.writeFileSync(filePath, content);
}

const dirs = ['src/roles/seeker/pages', 'src/roles/partner/pages'];
for (const dir of dirs) {
  const fullDir = path.join(__dirname, 'frontend', dir);
  for (const file of fs.readdirSync(fullDir)) {
    if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue;
    replaceInFile(path.join(fullDir, file));
  }
}

// Also fix shared/providers
replaceInFile(path.join(__dirname, 'frontend', 'src', 'shared', 'providers', 'AccessProvider.tsx'));

console.log("Done");
