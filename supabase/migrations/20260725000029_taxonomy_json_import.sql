-- Migration 29 - Category JSON Import.
--
-- Adds fn_admin_import_taxonomy_json(p_payload JSONB) which:
--   * Validates the JSON shape (array of main categories, each with optional
--     sub_categories and skills arrays).
--   * Validates every numeric and enum field with the exact row/column in the
--     error message so admins know what to fix.
--   * Rejects duplicate names within the payload AND against existing rows.
--   * Inserts every category, sub_category and skill in a single transaction.
--   * Returns JSONB with inserted counts for the UI summary.

BEGIN;

-- ============================================================================
-- 1. fn_admin_import_taxonomy_json — full lifecycle in one transaction.
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_admin_import_taxonomy_json(JSONB);
CREATE OR REPLACE FUNCTION public.fn_admin_import_taxonomy_json(
  p_payload JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_main_obj      JSONB;
  v_sub_obj       JSONB;
  v_main_name     TEXT;
  v_main_desc     TEXT;
  v_main_icon     TEXT;
  v_main_status   TEXT;
  v_main_display  INT;
  v_sub_arr       JSONB;
  v_skill_arr     JSONB;
  v_sub_name      TEXT;
  v_sub_desc      TEXT;
  v_sub_status    TEXT;
  v_sub_display   INT;
  v_skill_name    TEXT;
  v_main_slug     TEXT;
  v_sub_slug      TEXT;
  v_skill_slug    TEXT;
  v_raw_display   TEXT;
  v_category_id   UUID;
  v_sub_id        UUID;
  v_main_count    INT := 0;
  v_sub_count     INT := 0;
  v_skill_count   INT := 0;
  v_seen_main     TEXT[] := '{}';
  v_seen_sub      TEXT[] := '{}';
  v_seen_skill    TEXT[] := '{}';
  v_i             INT;
  v_j             INT;
  v_n             INT;
  v_len           INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to import taxonomy.' USING ERRCODE = '42501';
  END IF;

  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'array' THEN
    RAISE EXCEPTION 'Payload must be a JSON array of categories.' USING ERRCODE = '22000';
  END IF;
  v_len := jsonb_array_length(p_payload);
  IF v_len = 0 THEN
    RAISE EXCEPTION 'Payload must contain at least one category.' USING ERRCODE = '22000';
  END IF;

  -- -------------------------------------------------------------------------
  -- PASS 1: validate the payload shape and collect slug names for duplicate
  -- detection. Every RAISE EXCEPTION here aborts the whole transaction and
  -- includes the exact row + field so admins can fix the offending entry.
  -- -------------------------------------------------------------------------
  FOR v_i IN 0..(v_len - 1) LOOP
    v_main_obj := jsonb_array_element(p_payload, v_i);
    IF v_main_obj IS NULL OR jsonb_typeof(v_main_obj) <> 'object' THEN
      RAISE EXCEPTION 'Entry #% must be a JSON object.', v_i + 1 USING ERRCODE = '22000';
    END IF;

    -- main_category (required string)
    v_main_name := v_main_obj->>'main_category';
    IF v_main_name IS NULL OR btrim(v_main_name) = '' THEN
      RAISE EXCEPTION 'Entry #% is missing required field "main_category".', v_i + 1
        USING ERRCODE = '23514';
    END IF;

    -- description (optional, string or empty)
    v_main_desc := NULLIF(btrim(v_main_obj->>'description'), '');

    -- icon (optional, string or empty)
    v_main_icon := NULLIF(btrim(v_main_obj->>'icon'), '');

    -- status (optional, must be one of the allowed values)
    v_main_status := COALESCE(NULLIF(btrim(v_main_obj->>'status'), ''), 'Active');
    IF v_main_status NOT IN ('Active', 'Archived', 'Draft') THEN
      RAISE EXCEPTION
        'Entry #% ("%"): field "status" must be one of Active, Archived, Draft (got "%").',
        v_i + 1, v_main_name, v_main_status
        USING ERRCODE = '23514';
    END IF;

    -- display_order (optional, must be a JSON integer; never a string or '-')
    v_raw_display := v_main_obj->>'display_order';
    IF v_raw_display IS NULL OR v_raw_display = '' THEN
      v_main_display := 0;
    ELSE
      IF v_main_obj->'display_order' IS NULL
         OR jsonb_typeof(v_main_obj->'display_order') <> 'number' THEN
        RAISE EXCEPTION
          'Entry #% ("%"): field "display_order" must be a JSON number, got "%".',
          v_i + 1, v_main_name, v_raw_display
          USING ERRCODE = '22P02';
      END IF;
      IF (v_main_obj->'display_order')::TEXT ~ '^-?[0-9]+(\.[0-9]+)?$' THEN
        v_main_display := (v_main_obj->>'display_order')::INT;
      ELSE
        RAISE EXCEPTION
          'Entry #% ("%"): field "display_order" is not a valid integer ("%").',
          v_i + 1, v_main_name, v_raw_display
          USING ERRCODE = '22P02';
      END IF;
    END IF;

    -- Slug generation
    v_main_slug := lower(regexp_replace(v_main_name, '[^a-zA-Z0-9]+', '-', 'g'));
    v_main_slug := trim(both '-' from v_main_slug);
    IF v_main_slug = '' THEN
      RAISE EXCEPTION 'Entry #% ("%") has no usable slug.',
        v_i + 1, v_main_name USING ERRCODE = '23514';
    END IF;

    -- Within-payload duplicate detection.
    IF v_main_slug = ANY(v_seen_main) THEN
      RAISE EXCEPTION 'Entry #%: duplicate main category "%" in payload.',
        v_i + 1, v_main_name USING ERRCODE = '23514';
    END IF;
    v_seen_main := array_append(v_seen_main, v_main_slug);

    -- Reject if this category already exists in the database.
    IF EXISTS (SELECT 1 FROM public.categories WHERE slug = v_main_slug) THEN
      RAISE EXCEPTION 'Entry #%: main category "%" already exists.',
        v_i + 1, v_main_name USING ERRCODE = '23514';
    END IF;

    -- Sub-categories.
    v_sub_arr := v_main_obj->'sub_categories';
    IF v_sub_arr IS NOT NULL AND jsonb_typeof(v_sub_arr) <> 'array' THEN
      RAISE EXCEPTION 'Entry #% ("%"): "sub_categories" must be an array.',
        v_i + 1, v_main_name USING ERRCODE = '22000';
    END IF;

    v_seen_sub := ARRAY[]::TEXT[];

    IF v_sub_arr IS NOT NULL THEN
      FOR v_j IN 0..(jsonb_array_length(v_sub_arr) - 1) LOOP
        v_sub_obj := jsonb_array_element(v_sub_arr, v_j);
        IF v_sub_obj IS NULL OR jsonb_typeof(v_sub_obj) <> 'object' THEN
          RAISE EXCEPTION 'Entry #% ("%"), sub-category #% must be a JSON object.',
            v_i + 1, v_main_name, v_j + 1 USING ERRCODE = '22000';
        END IF;

        -- name (required)
        v_sub_name := v_sub_obj->>'name';
        IF v_sub_name IS NULL OR btrim(v_sub_name) = '' THEN
          RAISE EXCEPTION 'Entry #% ("%"), sub-category #% is missing required field "name".',
            v_i + 1, v_main_name, v_j + 1 USING ERRCODE = '23514';
        END IF;

        -- description (optional)
        v_sub_desc := NULLIF(btrim(v_sub_obj->>'description'), '');

        -- status (optional, must be allowed value)
        v_sub_status := COALESCE(NULLIF(btrim(v_sub_obj->>'status'), ''), 'Active');
        IF v_sub_status NOT IN ('Active', 'Archived', 'Draft') THEN
          RAISE EXCEPTION
            'Entry #% ("%"), sub-category #% ("%"): field "status" must be one of Active, Archived, Draft (got "%").',
            v_i + 1, v_main_name, v_j + 1, v_sub_name, v_sub_status
            USING ERRCODE = '23514';
        END IF;

        -- display_order (optional integer)
        v_raw_display := v_sub_obj->>'display_order';
        IF v_raw_display IS NULL OR v_raw_display = '' THEN
          v_sub_display := 0;
        ELSE
          IF v_sub_obj->'display_order' IS NULL
             OR jsonb_typeof(v_sub_obj->'display_order') <> 'number' THEN
            RAISE EXCEPTION
              'Entry #% ("%"), sub-category #% ("%"): field "display_order" must be a JSON number, got "%".',
              v_i + 1, v_main_name, v_j + 1, v_sub_name, v_raw_display
              USING ERRCODE = '22P02';
          END IF;
          IF (v_sub_obj->'display_order')::TEXT ~ '^-?[0-9]+(\.[0-9]+)?$' THEN
            v_sub_display := (v_sub_obj->>'display_order')::INT;
          ELSE
            RAISE EXCEPTION
              'Entry #% ("%"), sub-category #% ("%"): field "display_order" is not a valid integer ("%").',
              v_i + 1, v_main_name, v_j + 1, v_sub_name, v_raw_display
              USING ERRCODE = '22P02';
          END IF;
        END IF;

        -- Slug
        v_sub_slug := lower(regexp_replace(v_sub_name, '[^a-zA-Z0-9]+', '-', 'g'));
        v_sub_slug := trim(both '-' from v_sub_slug);
        IF v_sub_slug = '' THEN
          RAISE EXCEPTION 'Entry #% ("%"), sub-category "%" has no usable slug.',
            v_i + 1, v_main_name, v_sub_name USING ERRCODE = '23514';
        END IF;

        IF v_sub_slug = ANY(v_seen_sub) THEN
          RAISE EXCEPTION 'Entry #% ("%"), sub-category #%: duplicate name "%" inside the same category.',
            v_i + 1, v_main_name, v_j + 1, v_sub_name USING ERRCODE = '23514';
        END IF;
        v_seen_sub := array_append(v_seen_sub, v_sub_slug);

        IF EXISTS (
          SELECT 1 FROM public.sub_categories
          WHERE slug = v_sub_slug AND category_id IN (
            SELECT id FROM public.categories WHERE slug = v_main_slug
          )
        ) THEN
          RAISE EXCEPTION 'Entry #% ("%"), sub-category "%" already exists under category "%".',
            v_i + 1, v_main_name, v_sub_name, v_main_name
            USING ERRCODE = '23514';
        END IF;

        -- Skills.
        v_skill_arr := v_sub_obj->'skills';
        IF v_skill_arr IS NOT NULL AND jsonb_typeof(v_skill_arr) <> 'array' THEN
          RAISE EXCEPTION 'Entry #% ("%"), sub-category "%": "skills" must be an array.',
            v_i + 1, v_main_name, v_sub_name USING ERRCODE = '22000';
        END IF;

        v_seen_skill := ARRAY[]::TEXT[];

        IF v_skill_arr IS NOT NULL THEN
          FOR v_n IN 0..(jsonb_array_length(v_skill_arr) - 1) LOOP
            v_skill_name := jsonb_array_element_text(v_skill_arr, v_n);
            IF v_skill_name IS NULL OR btrim(v_skill_name) = '' THEN
              RAISE EXCEPTION 'Entry #% ("%"), sub-category "%", skill #% has an empty name.',
                v_i + 1, v_main_name, v_sub_name, v_n + 1
                USING ERRCODE = '23514';
            END IF;
            v_skill_slug := lower(regexp_replace(v_skill_name, '[^a-zA-Z0-9]+', '-', 'g'));
            v_skill_slug := trim(both '-' from v_skill_slug);
            IF v_skill_slug = '' THEN
              RAISE EXCEPTION 'Entry #% ("%"), sub-category "%", skill "%" has no usable slug.',
                v_i + 1, v_main_name, v_sub_name, v_skill_name
                USING ERRCODE = '23514';
            END IF;
            IF v_skill_slug = ANY(v_seen_skill) THEN
              RAISE EXCEPTION 'Entry #% ("%"), sub-category "%", skill #%: duplicate name "%" inside the same sub-category.',
                v_i + 1, v_main_name, v_sub_name, v_n + 1, v_skill_name
                USING ERRCODE = '23514';
            END IF;
            v_seen_skill := array_append(v_seen_skill, v_skill_slug);
          END LOOP;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  -- -------------------------------------------------------------------------
  -- PASS 2: insert everything. The validation pass above guarantees no
  -- conflicts and that every numeric field is a real integer.
  -- -------------------------------------------------------------------------
  FOR v_i IN 0..(v_len - 1) LOOP
    v_main_obj := jsonb_array_element(p_payload, v_i);

    v_main_name := v_main_obj->>'main_category';
    v_main_slug := lower(regexp_replace(v_main_name, '[^a-zA-Z0-9]+', '-', 'g'));
    v_main_slug := trim(both '-' from v_main_slug);

    v_main_desc   := NULLIF(btrim(v_main_obj->>'description'), '');
    v_main_icon   := COALESCE(NULLIF(btrim(v_main_obj->>'icon'), ''), 'Layers');
    v_main_status := COALESCE(NULLIF(btrim(v_main_obj->>'status'), ''), 'Active');

    -- display_order was already validated in Pass 1.
    v_raw_display := v_main_obj->>'display_order';
    IF v_raw_display IS NULL OR v_raw_display = '' THEN
      v_main_display := 0;
    ELSE
      v_main_display := (v_main_obj->>'display_order')::INT;
    END IF;

    INSERT INTO public.categories (
      name, slug, description, icon, display_order, status, updated_at
    ) VALUES (
      v_main_name, v_main_slug, v_main_desc, v_main_icon,
      v_main_display, v_main_status, NOW()
    )
    RETURNING id INTO v_category_id;
    v_main_count := v_main_count + 1;

    v_sub_arr := v_main_obj->'sub_categories';
    IF v_sub_arr IS NOT NULL THEN
      FOR v_j IN 0..(jsonb_array_length(v_sub_arr) - 1) LOOP
        v_sub_obj := jsonb_array_element(v_sub_arr, v_j);

        v_sub_name := v_sub_obj->>'name';
        v_sub_slug := lower(regexp_replace(v_sub_name, '[^a-zA-Z0-9]+', '-', 'g'));
        v_sub_slug := trim(both '-' from v_sub_slug);

        v_sub_desc   := NULLIF(btrim(v_sub_obj->>'description'), '');
        v_sub_status := COALESCE(NULLIF(btrim(v_sub_obj->>'status'), ''), 'Active');

        v_raw_display := v_sub_obj->>'display_order';
        IF v_raw_display IS NULL OR v_raw_display = '' THEN
          v_sub_display := 0;
        ELSE
          v_sub_display := (v_sub_obj->>'display_order')::INT;
        END IF;

        INSERT INTO public.sub_categories (
          name, slug, description, category_id,
          display_order, status, updated_at
        ) VALUES (
          v_sub_name, v_sub_slug, v_sub_desc,
          v_category_id, v_sub_display, v_sub_status, NOW()
        )
        RETURNING id INTO v_sub_id;
        v_sub_count := v_sub_count + 1;

        v_skill_arr := v_sub_obj->'skills';
        IF v_skill_arr IS NOT NULL THEN
          FOR v_n IN 0..(jsonb_array_length(v_skill_arr) - 1) LOOP
            v_skill_name := jsonb_array_element_text(v_skill_arr, v_n);
            v_skill_slug := lower(regexp_replace(v_skill_name, '[^a-zA-Z0-9]+', '-', 'g'));
            v_skill_slug := trim(both '-' from v_skill_slug);
            INSERT INTO public.skills (
              name, slug, description, category_id, sub_category_id,
              icon, display_order, status, updated_at
            ) VALUES (
              v_skill_name, v_skill_slug, NULL,
              v_category_id, v_sub_id, 'Award', 0, 'Active', NOW()
            );
            v_skill_count := v_skill_count + 1;
          END LOOP;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  PERFORM public.fn_audit_log(
    'IMPORT_TAXONOMY', 'taxonomy', NULL,
    jsonb_build_object(
      'categories', v_main_count,
      'sub_categories', v_sub_count,
      'skills', v_skill_count
    )
  );

  RETURN jsonb_build_object(
    'categories', v_main_count,
    'sub_categories', v_sub_count,
    'skills', v_skill_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_admin_import_taxonomy_json(JSONB)
  TO authenticated, service_role;

-- ============================================================================
-- 2. Realtime publication on taxonomy tables so the user panel updates live.
-- ============================================================================
DO $$
BEGIN
  BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.categories';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.sub_categories';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.skills';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

COMMIT;