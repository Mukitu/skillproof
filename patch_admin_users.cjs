const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/AdminUsersPage.tsx', 'utf8');
let newUseEffect = `  useEffect(() => {
    loadUsers();
    const sub = dbService.subscribeToTable('profiles', loadUsers);
    return () => sub.unsubscribe();
  }, []);`;

content = content.replace(/useEffect\(\(\) => \{\n\s*loadUsers\(\);\n\s*\}, \[\]\);/, newUseEffect);
fs.writeFileSync('src/pages/admin/AdminUsersPage.tsx', content);
