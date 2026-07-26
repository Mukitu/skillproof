const fs = require('fs');

['src/pages/admin/AdminCodingBankPage.tsx', 'src/pages/admin/AdminProjectBankPage.tsx'].forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  let table = file.includes('Coding') ? 'coding_challenges' : 'project_challenges';
  
  let newUseEffect = `  useEffect(() => {
    loadData();
    const sub = dbService.subscribeToTable('${table}', loadData);
    return () => sub.unsubscribe();
  }, []);`;
  
  content = content.replace(/useEffect\(\(\) => \{\n\s*loadData\(\);\n\s*\}, \[\]\);/, newUseEffect);
  fs.writeFileSync(file, content);
});
