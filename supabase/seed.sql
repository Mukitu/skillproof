-- SkillProof Development Seed Data
-- Separate from production schema definitions

INSERT INTO public.categories (id, name, slug, description, icon) VALUES
('11111111-1111-1111-1111-111111111111', 'Web & Software Engineering', 'web-software-engineering', 'Frontend, Backend, and Full-Stack Development', 'Code2'),
('22222222-2222-2222-2222-222222222222', 'Data Engineering & AI', 'data-engineering-ai', 'Machine Learning, Pipelines & SQL Analytics', 'Brain')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.sub_categories (id, category_id, name, slug, description) VALUES
('11111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Frontend Engineering', 'frontend-engineering', 'React, Next.js, TypeScript'),
('11111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Backend Systems', 'backend-systems', 'Node.js, Express, PostgreSQL')
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO public.skills (id, category_id, sub_category_id, name, slug, description, max_level) VALUES
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111112', 'React.js', 'react-js', 'Component Architecture & Hooks', 3),
('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111113', 'Node.js & Express', 'node-js', 'REST APIs & Middleware', 3)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.coding_challenges (id, title, slug, description, difficulty, skill_id, level, input_description, output_description, constraints, starter_code) VALUES
('55555555-5555-5555-5555-555555555555', 'Two Sum Verification', 'two-sum-verification', 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.', 'Easy', '33333333-3333-3333-3333-333333333333', 1, 'Array of integers and target', 'Array of 2 indices', '2 <= nums.length <= 104', '{"python": "def two_sum(nums, target):\n    pass"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.coding_test_cases (challenge_id, input, expected_output, is_hidden, weight) VALUES
('55555555-5555-5555-5555-555555555555', '[2, 7, 11, 15], 9', '[0, 1]', false, 1),
('55555555-5555-5555-5555-555555555555', '[3, 2, 4], 6', '[1, 2]', true, 1);

INSERT INTO public.jobs (id, title, company_name, location, job_type, salary_range, required_skills, description) VALUES
('66666666-6666-6666-6666-666666666666', 'Senior React / TypeScript Engineer', 'Robi Axiata Digital', 'Gulshan, Dhaka', 'Full-time', '৳১,২০,০০০ - ৳১,৮০,০০০ / মাস', ARRAY['React.js', 'TypeScript'], 'Building scalable telecom portal solutions.')
ON CONFLICT (id) DO NOTHING;
