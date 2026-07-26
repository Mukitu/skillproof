const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/AdminTaxonomyPage.tsx', 'utf8');

if (!content.includes('import { supabase, isSupabaseConfigured }')) {
    content = content.replace("import { Category", "import { supabase, isSupabaseConfigured } from '../../lib/supabase';\nimport { Category");
}

let newUseEffect = `  useEffect(() => {
    loadData();
    let sub: any = null;
    if (isSupabaseConfigured) {
       sub = supabase.channel('taxonomy-manager-changes')
       .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, loadData)
       .on('postgres_changes', { event: '*', schema: 'public', table: 'sub_categories' }, loadData)
       .on('postgres_changes', { event: '*', schema: 'public', table: 'skills' }, loadData)
       .subscribe();
    }
    return () => {
      if (sub) supabase.removeChannel(sub);
    };
  }, []);`;

content = content.replace(/useEffect\(\(\) => \{\n\s*loadData\(\);\n\s*\}, \[\]\);/, newUseEffect);

fs.writeFileSync('src/pages/admin/AdminTaxonomyPage.tsx', content);
