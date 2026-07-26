const fs = require('fs');
let content = fs.readFileSync('src/pages/user/SkillVerificationSelectPage.tsx', 'utf8');

// The original import on line 5: import { UniversalAssessment, UniversalSubmission, Skill } from '../../types/database';
// The new one my script added: import { Category, SubCategory, Skill } from '../../types/database';

content = content.replace("import { UniversalAssessment, UniversalSubmission, Skill } from '../../types/database';", "import { UniversalAssessment, UniversalSubmission, Skill, Category, SubCategory } from '../../types/database';");
content = content.replace("import { Category, SubCategory, Skill } from '../../types/database';", "");

fs.writeFileSync('src/pages/user/SkillVerificationSelectPage.tsx', content);
