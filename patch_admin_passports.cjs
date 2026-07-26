const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/AdminPassportsPage.tsx', 'utf8');
let newUseEffect = `  useEffect(() => {
    loadData();
    const sub = dbService.subscribeToTable('skill_passports', loadData);
    return () => sub.unsubscribe();
  }, []);`;

content = content.replace(/useEffect\(\(\) => \{\n\s*loadData\(\);\n\s*\}, \[\]\);/, newUseEffect);
fs.writeFileSync('src/pages/admin/AdminPassportsPage.tsx', content);
