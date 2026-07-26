const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/AdminRoadmapManagerPage.tsx', 'utf8');

if (!content.includes('import { supabase, isSupabaseConfigured }')) {
    content = content.replace("import { RoadmapTemplate", "import { supabase, isSupabaseConfigured } from '../../lib/supabase';\nimport { RoadmapTemplate");
}

let newUseEffect = `  useEffect(() => {
    loadData();
    let sub: any = null;
    if (isSupabaseConfigured) {
       sub = supabase.channel('roadmap-manager-changes')
       .on('postgres_changes', { event: '*', schema: 'public', table: 'roadmap_templates' }, loadData)
       .subscribe();
    }
    return () => {
      if (sub) supabase.removeChannel(sub);
    };
  }, []);`;

content = content.replace(/useEffect\(\(\) => \{\n\s*loadData\(\);\n\s*\}, \[\]\);/, newUseEffect);

fs.writeFileSync('src/pages/admin/AdminRoadmapManagerPage.tsx', content);
