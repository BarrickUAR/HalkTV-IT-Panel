const fs = require('fs');

const files = [
  'src/app/(app)/users/[id]/page.tsx',
  'src/app/(app)/users/actions.ts',
  'src/app/(app)/users/page.tsx'
];

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/\["TEKNIK_MUDUR", "SUPER_ADMIN"\]/g, '["TEKNIK_YONETMEN", "TEKNIK_MUDUR", "SUPER_ADMIN"]');
  fs.writeFileSync(f, c);
  console.log(f + ' updated');
});
