const fs = require('fs');

let content = fs.readFileSync('src/pages/user/SkillVerificationSelectPage.tsx', 'utf8');

// Update accept attribute
content = content.replace(/accept="\.pdf,\.zip,\.jpg,\.jpeg,\.png"/g, 'accept=".pdf,.zip,.rar,.docx,.jpg,.jpeg,.png,.mp4,.webm,.mp3,.wav"');

// Allow up to 50MB maybe?
content = content.replace(/file\.size > 15 \* 1024 \* 1024/, 'file.size > 50 * 1024 * 1024');
content = content.replace(/15MB upload limit/, '50MB upload limit');

fs.writeFileSync('src/pages/user/SkillVerificationSelectPage.tsx', content);
