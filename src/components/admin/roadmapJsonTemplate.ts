/**
 * Roadmap JSON format contract shared by the format viewer and import modal.
 *
 * This intentionally contains only placeholder values — no real roadmap
 * content. The validator mirrors fn_admin_import_roadmap_json in migration
 * 34 so invalid input is rejected before the RPC is called.
 */

export const ROADMAP_JSON_TEMPLATE = `{
  "days": [
    {
      "day_number": 1,
      "title": "Day title",
      "description": "Full description. Plain text — multi-line supported.",
      "estimated_minutes": 60,
      "learning_objectives": ["Learning objective"],
      "instructions": ["Step 1", "Step 2"],
      "practice_tasks": ["Practice task"],
      "notes": "Optional admin notes",
      "video_title": "Lesson video title",
      "video_url": "https://www.youtube.com/watch?v=VIDEO_ID",
      "video_provider": "youtube",
      "resources": [
        { "label": "Resource label", "url": "https://example.com/resource", "description": "Optional description" }
      ]
    }
  ]
}`;

export interface RoadmapJsonField {
  key: string;
  required: boolean;
  type: string;
  notes: string;
}

export const ROADMAP_JSON_FIELDS: RoadmapJsonField[] = [
  { key: 'day_number', required: true, type: 'positive integer', notes: 'Unique day number within this import. Existing day numbers on the roadmap are also rejected by the server.' },
  { key: 'title', required: true, type: 'string', notes: 'Non-empty day title.' },
  { key: 'description', required: false, type: 'string', notes: 'Full lesson description. Plain text, multi-line supported.' },
  { key: 'estimated_minutes', required: false, type: 'integer', notes: 'Minimum 5 minutes. Defaults to 60 when omitted.' },
  { key: 'learning_objectives', required: false, type: 'string[]', notes: 'What the user will learn from this day.' },
  { key: 'instructions', required: false, type: 'string[]', notes: 'Step-by-step instructions shown in the lesson page.' },
  { key: 'practice_tasks', required: false, type: 'string[]', notes: 'Hands-on practice tasks shown in the lesson page.' },
  { key: 'notes', required: false, type: 'string', notes: 'Optional admin notes (rendered as plain text).' },
  { key: 'video_title', required: false, type: 'string', notes: 'Optional lesson video title shown above the embed.' },
  { key: 'video_url', required: false, type: 'URL', notes: 'Either a YouTube watch URL or a ready-to-use embed URL.' },
  { key: 'video_provider', required: false, type: '"youtube" | "embed"', notes: 'Required when video_url is set.' },
  { key: 'resources', required: false, type: '{ label, url, description? }[]', notes: 'Optional array of external learning links.' },
];

export interface RoadmapValidationRow {
  row: number;
  dayNumber: number | null;
  title: string | null;
  status: 'valid' | 'invalid';
  error?: string;
}

export interface RoadmapValidationResult {
  ok: boolean;
  totalDays: number;
  validCount: number;
  invalidCount: number;
  rows: RoadmapValidationRow[];
  parseError?: string;
}

export function validateRoadmapJson(raw: string, existingDayNumbers?: Set<number>): RoadmapValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e: any) {
    return invalidDocument(`Invalid JSON: ${e.message || 'unknown error'}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return invalidDocument('Top-level JSON must be an object (e.g. {"days": []}).');
  }
  const days = (parsed as any).days;
  if (!Array.isArray(days)) return invalidDocument('Missing "days" array.');
  if (days.length === 0) return invalidDocument('The "days" array is empty.');

  const seen = new Set<number>();
  const rows: RoadmapValidationRow[] = days.map((day, index) => {
    const result: RoadmapValidationRow = {
      row: index + 1,
      dayNumber: Number.isInteger(day?.day_number) ? day.day_number : null,
      title: typeof day?.title === 'string' ? day.title : null,
      status: 'valid',
    };
    const error = validateDay(day, seen, existingDayNumbers);
    if (error) {
      result.status = 'invalid';
      result.error = error;
    } else {
      seen.add(day.day_number);
    }
    return result;
  });

  const invalidCount = rows.filter((row) => row.status === 'invalid').length;
  return {
    ok: invalidCount === 0,
    totalDays: rows.length,
    validCount: rows.length - invalidCount,
    invalidCount,
    rows,
  };
}

function invalidDocument(parseError: string): RoadmapValidationResult {
  return { ok: false, totalDays: 0, validCount: 0, invalidCount: 0, rows: [], parseError };
}

function validateDay(day: any, seen: Set<number>, existingDayNumbers?: Set<number>): string | null {
  if (!day || typeof day !== 'object' || Array.isArray(day)) return 'Day must be a JSON object.';
  if (!Number.isInteger(day.day_number) || day.day_number < 1) return 'day_number must be a positive integer.';
  if (seen.has(day.day_number)) return `Duplicate day_number ${day.day_number} in this JSON.`;
  if (existingDayNumbers?.has(day.day_number)) return `day_number ${day.day_number} already exists on this roadmap.`;
  if (typeof day.title !== 'string' || !day.title.trim()) return 'title is required.';

  if (day.estimated_minutes !== undefined && day.estimated_minutes !== null &&
      (!Number.isInteger(day.estimated_minutes) || day.estimated_minutes < 5)) {
    return 'estimated_minutes must be an integer of at least 5.';
  }

  for (const key of ['learning_objectives', 'instructions', 'practice_tasks']) {
    if (day[key] !== undefined && day[key] !== null &&
        (!Array.isArray(day[key]) || day[key].some((value: unknown) => typeof value !== 'string'))) {
      return `${key} must be an array of strings.`;
    }
  }

  if (day.resources !== undefined && day.resources !== null) {
    if (!Array.isArray(day.resources)) return 'resources must be an array.';
    if (day.resources.some((resource: any) => !resource || typeof resource !== 'object' ||
      (resource.label !== undefined && typeof resource.label !== 'string') ||
      (resource.url !== undefined && typeof resource.url !== 'string') ||
      (resource.description !== undefined && typeof resource.description !== 'string'))) {
      return 'resources entries must be objects with optional string label/url/description fields.';
    }
  }

  if (day.video_url !== undefined && day.video_url !== null && typeof day.video_url !== 'string') {
    return 'video_url must be a string.';
  }
  if (day.video_title !== undefined && day.video_title !== null && typeof day.video_title !== 'string') {
    return 'video_title must be a string.';
  }
  if (day.video_provider !== undefined && day.video_provider !== null && !['youtube', 'embed'].includes(day.video_provider)) {
    return 'video_provider must be "youtube" or "embed".';
  }
  if (day.video_url && !day.video_provider) return 'video_provider is required when video_url is set.';
  if (!day.video_url && day.video_provider) return 'video_url is required when video_provider is set.';

  for (const key of ['description', 'notes']) {
    if (day[key] !== undefined && day[key] !== null && typeof day[key] !== 'string') {
      return `${key} must be a string.`;
    }
  }

  return null;
}
