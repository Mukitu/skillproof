const fs = require('fs');
let content = fs.readFileSync('src/pages/user/UserDashboard.tsx', 'utf8');

let newUseEffect = `  useEffect(() => {
    if (user?.id) {
      loadData();
      
      const subPassports = dbService.subscribeToTable('skill_passports', loadData);
      const subAssessments = dbService.subscribeToTable('universal_assessments', loadData);
      const subSubmissions = dbService.subscribeToTable('universal_submissions', loadData);
      
      return () => {
        subPassports.unsubscribe();
        subAssessments.unsubscribe();
        subSubmissions.unsubscribe();
      };
    }
  }, [user]);`;

content = content.replace(/useEffect\(\(\) => \{\n\s*if \(user\?\.id\) \{\n\s*loadData\(\);\n\s*\}\n\s*\}, \[user\]\);/, newUseEffect);
fs.writeFileSync('src/pages/user/UserDashboard.tsx', content);
