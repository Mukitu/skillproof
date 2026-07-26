const fs = require('fs');

let content = fs.readFileSync('src/pages/user/SkillVerificationSelectPage.tsx', 'utf8');

// Replace TAXONOMY with real db data fetching
content = content.replace(/const TAXONOMY: Record[\s\S]*?};/, '');
content = content.replace("import { supabase, isSupabaseConfigured } from '../../lib/supabase';", "import { supabase, isSupabaseConfigured } from '../../lib/supabase';\nimport { Category, SubCategory, Skill } from '../../types/database';");

// Add AlertCircle to lucide-react imports if not there
if (!content.includes('AlertCircle,')) {
    content = content.replace("Activity,", "Activity,\n  AlertCircle,");
}

let stateReplacements = `  // Database states
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Active Assessment Protection
  const [activeAssessment, setActiveAssessment] = useState<any | null>(null);

  // Generator inputs
  const [selectedCatKey, setSelectedCatKey] = useState<string>('');
  const [selectedSubKey, setSelectedSubKey] = useState<string>('');
  const [selectedSkill, setSelectedSkill] = useState<string>('');
`;

content = content.replace(/\/\/ Generator inputs[\s\S]*?const \[selectedSkill, setSelectedSkill\] = useState<string>\('React.js'\);/, stateReplacements);

let useEffectReplacements = `
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      const [cats, subs, sks] = await Promise.all([
        dbService.getCategories(),
        dbService.getSubCategories(),
        dbService.getSkills()
      ]);
      setCategories(cats);
      setSubCategories(subs);
      setSkills(sks);
      
      if (cats.length > 0) setSelectedCatKey(cats[0].id);
      setLoadingData(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedCatKey) {
      const catSubs = subCategories.filter(s => s.category_id === selectedCatKey);
      if (catSubs.length > 0) {
        setSelectedSubKey(catSubs[0].id);
      } else {
        setSelectedSubKey('');
      }
    }
  }, [selectedCatKey, subCategories]);

  useEffect(() => {
    if (selectedSubKey) {
      const subSkills = skills.filter(s => s.sub_category_id === selectedSubKey);
      if (subSkills.length > 0) {
        setSelectedSkill(subSkills[0].id);
      } else {
        setSelectedSkill('custom');
      }
    } else {
      setSelectedSkill('custom');
    }
  }, [selectedSubKey, skills]);

  // Check for active assessment when skill changes
  useEffect(() => {
    const checkActiveAssessment = async () => {
      if (!user?.id || !selectedSkill || selectedSkill === 'custom') {
        setActiveAssessment(null);
        return;
      }
      
      try {
        const userAssessments = await dbService.getUniversalAssessments(user.id);
        const userSubmissions = await dbService.getUniversalSubmissions(user.id);
        
        // Find if there's any assessment for this skill that hasn't been submitted yet
        const unsubmittedAssessment = userAssessments.find(a => 
          a.skill_id === selectedSkill && 
          !userSubmissions.some(s => s.assessment_id === a.id)
        );
        
        setActiveAssessment(unsubmittedAssessment || null);
        if (unsubmittedAssessment) {
          setGeneratedAssessment(unsubmittedAssessment);
        } else {
          setGeneratedAssessment(null);
        }
      } catch (err) {
        console.error("Error checking active assessment", err);
      }
    };
    
    checkActiveAssessment();
  }, [selectedSkill, user?.id]);
`;

content = content.replace(/\/\/ Load dependency list when Category changes[\s\S]*?}, \[selectedSubKey, selectedCatKey\]\);/, useEffectReplacements);

content = content.replace(/const skillName = selectedSkill === 'custom' \? customSkillName : selectedSkill;/g, "const skillName = selectedSkill === 'custom' ? customSkillName : skills.find(s => s.id === selectedSkill)?.name || '';");

content = content.replace(/categoryName: TAXONOMY\[selectedCatKey\]\?\.name,/g, "categoryName: categories.find(c => c.id === selectedCatKey)?.name || 'General',");
content = content.replace(/subCategoryName: selectedSubKey,/g, "subCategoryName: subCategories.find(s => s.id === selectedSubKey)?.name || '',");
content = content.replace(/category_name: TAXONOMY\[selectedCatKey\]\?\.name \|\| 'General',/g, "category_name: categories.find(c => c.id === selectedCatKey)?.name || 'General',");
content = content.replace(/skill_id: skillName,/g, "skill_id: selectedSkill === 'custom' ? \`custom-\${Date.now()}\` : selectedSkill,");

content = content.replace(/\{Object.entries\(TAXONOMY\).map\(\(\[key, data\]\) => \{(.|\n)*?\}\)\}/g, `{categories.map(cat => (
  <button
    key={cat.id}
    onClick={() => setSelectedCatKey(cat.id)}
    className={\`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all \${
      selectedCatKey === cat.id
        ? 'border-[#ED1C24] bg-[#ED1C24]/5 text-[#ED1C24] shadow-md'
        : 'border-slate-200 bg-white hover:border-[#ED1C24]/30 hover:bg-slate-50 text-slate-600'
    }\`}
  >
    <div className={\`w-10 h-10 rounded-xl flex items-center justify-center mb-3 \${
      selectedCatKey === cat.id ? 'bg-[#ED1C24] text-white shadow-lg' : 'bg-slate-100 text-slate-500'
    }\`}>
      <Code2 className="w-5 h-5" />
    </div>
    <span className="text-xs font-bold text-center leading-tight">{cat.name}</span>
  </button>
))}`);

content = content.replace(/\{Object.keys\(TAXONOMY\[selectedCatKey\]\?\.subcategories \|\| \{\}\).map\(\(subKey\) => \((.|\n)*?\)\)\}/g, `{subCategories.filter(s => s.category_id === selectedCatKey).map(sub => (
  <button
    key={sub.id}
    onClick={() => setSelectedSubKey(sub.id)}
    className={\`px-4 py-2.5 rounded-xl border text-[11px] font-bold transition-all \${
      selectedSubKey === sub.id
        ? 'border-[#ED1C24] bg-[#ED1C24] text-white shadow'
        : 'border-slate-200 bg-white text-slate-600 hover:border-[#ED1C24]/40 hover:bg-[#ED1C24]/5'
    }\`}
  >
    {sub.name}
  </button>
))}`);

content = content.replace(/\{\(TAXONOMY\[selectedCatKey\]\?\.subcategories\[selectedSubKey\] \|\| \[\]\).map\(\(sk\) => \((.|\n)*?\)\)\}/g, `{skills.filter(s => s.sub_category_id === selectedSubKey).map(skill => (
  <button
    key={skill.id}
    onClick={() => setSelectedSkill(skill.id)}
    className={\`px-4 py-2 rounded-xl text-xs font-bold transition-all \${
      selectedSkill === skill.id
        ? 'bg-slate-900 text-white shadow-md border border-slate-900'
        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300'
    }\`}
  >
    {skill.name}
  </button>
))}`);

content = content.replace(/\{!isGenerating && !generatedAssessment && \((.|\n)*?\{language === 'bn' \? 'অ্যাসেসমেন্ট জেনারেট করুন' : 'Generate Technical Assessment'\}\n\s*?<\/button>\n\s*?<\/div>\n\s*?\)\}/g, `{!isGenerating && !generatedAssessment && !activeAssessment && (
              <div className="pt-6">
                <button
                  onClick={handleGenerateAssessment}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#ED1C24] via-[#F58220] to-[#FFB000] text-white font-extrabold text-sm shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {language === 'bn' ? 'অ্যাসেসমেন্ট জেনারেট করুন' : 'Generate Technical Assessment'}
                </button>
              </div>
            )}
            
            {!isGenerating && activeAssessment && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 mt-6">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Active Assessment Required</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    You have an incomplete assessment for this skill. You must submit a solution for it below before generating a new one.
                  </p>
                </div>
              </div>
            )}`);

fs.writeFileSync('src/pages/user/SkillVerificationSelectPage.tsx', content);
