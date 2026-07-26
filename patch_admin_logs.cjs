const fs = require('fs');
const file = 'src/pages/admin/AdminAuditLogsPage.tsx';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  let newUseEffect = `  useEffect(() => {
    loadData();
    const sub = dbService.subscribeToTable('audit_logs', loadData);
    return () => sub.unsubscribe();
  }, []);`;
  content = content.replace(/useEffect\(\(\) => \{\n\s*loadData\(\);\n\s*\}, \[\]\);/, newUseEffect);
  fs.writeFileSync(file, content);
}
