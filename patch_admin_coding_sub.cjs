const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/AdminCodingSubmissionsPage.tsx', 'utf8');
let newUseEffect = `  useEffect(() => {
    loadSubmissions();
    const sub = dbService.subscribeToTable('coding_submissions', loadSubmissions);
    return () => sub.unsubscribe();
  }, []);`;
content = content.replace(/useEffect\(\(\) => \{\n\s*loadSubmissions\(\);\n\s*\}, \[\]\);/, newUseEffect);
fs.writeFileSync('src/pages/admin/AdminCodingSubmissionsPage.tsx', content);
