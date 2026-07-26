const fs = require('fs');

['src/pages/admin/AdminCodingSubmissionsPage.tsx', 'src/pages/admin/AdminProjectSubmissionsPage.tsx'].forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  let table = file.includes('Coding') ? 'coding_submissions' : 'project_submissions';
  
  let newUseEffect = `  useEffect(() => {
    loadData();
    const sub = dbService.subscribeToTable('${table}', loadData);
    return () => sub.unsubscribe();
  }, []);`;
  
  content = content.replace(/useEffect\(\(\) => \{\n\s*loadData\(\);\n\s*\}, \[\]\);/, newUseEffect);
  fs.writeFileSync(file, content);
});
