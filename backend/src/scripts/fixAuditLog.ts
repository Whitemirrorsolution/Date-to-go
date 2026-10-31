import fs from 'fs';
import path from 'path';

const dir = path.join(__dirname, '../routes/admin');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  const p = path.join(dir, file);
  let content = fs.readFileSync(p, 'utf8');

  // Replace occurrences of adminId with actorId
  content = content.replace(/\badminId\b/g, 'actorId');

  // Replace entity: with entityType: (if we missed any shorthand or otherwise)
  // Actually we already replaced entity: and details:. Let's check if there are shorthand `entity,`
  content = content.replace(/\bentity\b/g, 'entityType');
  content = content.replace(/\bdetails\b/g, 'meta');

  fs.writeFileSync(p, content);
  console.log(`Updated ${file}`);
}
