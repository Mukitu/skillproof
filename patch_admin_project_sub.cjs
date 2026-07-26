const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/AdminProjectSubmissionsPage.tsx', 'utf8');
let newUseEffect = `  useEffect(() => {
    loadSubmissions();
    const subStandard = dbService.subscribeToTable('project_submissions', loadSubmissions);
    const subUniversal = dbService.subscribeToTable('universal_submissions', loadSubmissions);
    return () => {
      subStandard.unsubscribe();
      subUniversal.unsubscribe();
    };
  }, [reviewMode]);`;
content = content.replace(/useEffect\(\(\) => \{\n\s*loadSubmissions\(\);\n\s*\}, \[reviewMode\]\);/, newUseEffect);
fs.writeFileSync('src/pages/admin/AdminProjectSubmissionsPage.tsx', content);
