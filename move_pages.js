import fs from 'fs';
import path from 'path';

const SRC_DIR = path.join(process.cwd(), 'frontend', 'src');
const PAGES_DIR = path.join(SRC_DIR, 'pages');

const SEEKER_PAGES = [
  'BookingPage.tsx',
  'BrowsePartnersPage.tsx',
  'HistoryPage.tsx',
  'HomeDashboard.tsx',
  'UserDashboardPage.tsx',
  'ServiceDetailsPage.tsx'
];

const PARTNER_PAGES = [
  'BecomePartnerWizard.tsx',
  'PartnerDashboardPage.tsx',
  'PartnerProfilePage.tsx',
  'KycPage.tsx',
  'KycPage.module.css'
];

const moveAndFix = (files, targetDir) => {
  for (const file of files) {
    const srcPath = path.join(PAGES_DIR, file);
    const destPath = path.join(SRC_DIR, targetDir, file);
    if (!fs.existsSync(srcPath)) continue;
    
    let content = fs.readFileSync(srcPath, 'utf-8');
    
    // Fix imports that go up one level (since we are moving from src/pages to src/roles/X/pages)
    // Actually, src/pages is 1 level deep from src.
    // src/roles/seeker/pages is 3 levels deep from src.
    // So relative imports from pages like '../components' need to become '../../../components'
    content = content.replace(/from '\.\.\//g, "from '../../../");
    content = content.replace(/import (.*) from '\.\.\//g, "import $1 from '../../../");
    
    // Fix same-dir imports if moving apart? Usually they don't import each other much, but let's see.
    // We'll just run TypeScript later to catch what's broken.

    fs.writeFileSync(destPath, content);
    fs.unlinkSync(srcPath);
    console.log(`Moved ${file} to ${targetDir}`);
  }
};

moveAndFix(SEEKER_PAGES, 'roles/seeker/pages');
moveAndFix(PARTNER_PAGES, 'roles/partner/pages');

console.log("Done");
