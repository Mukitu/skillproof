const fs = require('fs');
let content = fs.readFileSync('src/pages/user/SkillPassportPage.tsx', 'utf8');

let newUseEffect = `  useEffect(() => {
    if (user?.id) {
      loadData();
      const subPassports = dbService.subscribeToTable('skill_passports', loadData);
      return () => subPassports.unsubscribe();
    }
  }, [user]);`;

content = content.replace(/useEffect\(\(\) => \{\n\s*if \(user\?\.id\) \{\n\s*loadData\(\);\n\s*\}\n\s*\}, \[user\]\);/, newUseEffect);
fs.writeFileSync('src/pages/user/SkillPassportPage.tsx', content);
