-- Migration 07 - Roadmap templates (replaces localStorage-based roadmap templates).

BEGIN;

CREATE TABLE IF NOT EXISTS public.roadmap_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sub_category_id UUID REFERENCES public.sub_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  total_days INT NOT NULL DEFAULT 30 CHECK (total_days > 0),
  difficulty TEXT DEFAULT 'Medium' CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  status TEXT NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Draft', 'Published', 'Archived')),
  version INT NOT NULL DEFAULT 1,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roadmap_templates_status ON public.roadmap_templates(status);
CREATE INDEX IF NOT EXISTS idx_roadmap_templates_category ON public.roadmap_templates(category_id);

-- Days belong to a template.
CREATE TABLE IF NOT EXISTS public.roadmap_template_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.roadmap_templates(id) ON DELETE CASCADE,
  day_number INT NOT NULL CHECK (day_number > 0),
  title TEXT NOT NULL,
  description TEXT,
  estimated_minutes INT DEFAULT 60,
  key_concepts TEXT[] DEFAULT '{}',
  tasks TEXT[] DEFAULT '{}',
  resources JSONB DEFAULT '[]'::jsonb,
  projects JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_template_day UNIQUE (template_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_roadmap_template_days_template
  ON public.roadmap_template_days(template_id);

ALTER TABLE public.roadmap_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_template_days ENABLE ROW LEVEL SECURITY;

-- Public: see published templates and their days.
DROP POLICY IF EXISTS "Published templates are public" ON public.roadmap_templates;
CREATE POLICY "Published templates are public" ON public.roadmap_templates
  FOR SELECT USING (status = 'Published' OR EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "Published days are public" ON public.roadmap_template_days;
CREATE POLICY "Published days are public" ON public.roadmap_template_days
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.roadmap_templates t
      WHERE t.id = template_id AND (t.status = 'Published' OR EXISTS (
        SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
      ))
    )
  );

DROP POLICY IF EXISTS "Admins full access templates" ON public.roadmap_templates;
CREATE POLICY "Admins full access templates" ON public.roadmap_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins full access template days" ON public.roadmap_template_days;
CREATE POLICY "Admins full access template days" ON public.roadmap_template_days
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

COMMIT;
