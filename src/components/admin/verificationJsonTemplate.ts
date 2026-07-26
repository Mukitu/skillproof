/**
 * Skill Verification — shared JSON template + client-side validator.
 *
 * The template constant and the validator live in the same module so the
 * "View JSON Format" modal can never drift from the validation rules used by
 * the import modal. The server RPC is the source of truth — these client-side
 * rules mirror the SQL CHECK constraints + RPC validation in migration 32.
 */

export const DIFFICULTY_OPTIONS = ['Beginner', 'Intermediate', 'Advanced'] as const;
export const ASSESSMENT_TYPE_OPTIONS = ['Coding', 'Project', 'Practical', 'Portfolio'] as const;
export const STATUS_OPTIONS = ['Draft', 'Published'] as const;

export const VERIFICATION_TASK_JSON_TEMPLATE = `{
  "tasks": [
    {
      "title": "Responsive Portfolio Website",
      "description": "Build a fully responsive portfolio website.",
      "submission_instructions": "Submit GitHub repository or Google Drive link.",
      "difficulty": "Beginner",
      "assessment_type": "Coding",
      "estimated_time": "2 hours",
      "max_marks": 10,
      "pass_marks": 6,
      "status": "Published"
    }
  ]
}`;

export interface VerificationTaskField {
  key: string;
  required: boolean;
  type: 'string' | 'integer' | 'enum';
  enum?: readonly string[];
  notes: string;
}

export const VERIFICATION_TASK_FIELDS: VerificationTaskField[] = [
  { key: 'title', required: true, type: 'string', notes: '3..200 characters. Must be unique per import payload (case-insensitive).' },
  { key: 'description', required: true, type: 'string', notes: '10..8000 characters. Rendered as plain text with whitespace preserved.' },
  { key: 'submission_instructions', required: true, type: 'string', notes: '10..4000 characters. Tell the user how to submit.' },
  { key: 'difficulty', required: false, type: 'enum', enum: DIFFICULTY_OPTIONS, notes: 'Defaults to Intermediate.' },
  { key: 'assessment_type', required: false, type: 'enum', enum: ASSESSMENT_TYPE_OPTIONS, notes: 'Defaults to Coding.' },
  { key: 'estimated_time', required: false, type: 'string', notes: 'Free-form text, e.g. "2 hours".' },
  { key: 'max_marks', required: false, type: 'integer', notes: '1..100, defaults to 10.' },
  { key: 'pass_marks', required: false, type: 'integer', notes: '1..max_marks, defaults to 6.' },
  { key: 'status', required: false, type: 'enum', enum: STATUS_OPTIONS, notes: 'Draft (default) or Published.' },
];

export interface ValidationRowResult {
  row: number;
  status: 'valid' | 'invalid';
  title?: string | null;
  error?: string;
}

export interface ValidationResult {
  ok: boolean;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  rows: ValidationRowResult[];
  /** When the JSON itself is malformed (cannot parse / wrong shape). */
  parseError?: string;
}

export function validateVerificationTasks(raw: string, options?: {
  existingTaskTitles?: Set<string>;
}): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e: any) {
    return { ok: false, totalRows: 0, validCount: 0, invalidCount: 0, rows: [], parseError: `Invalid JSON: ${e.message || 'unknown error'}` };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, totalRows: 0, validCount: 0, invalidCount: 0, rows: [], parseError: 'Top-level JSON must be an object (e.g. {"tasks": []}).' };
  }

  const tasks = (parsed as any).tasks;
  if (!Array.isArray(tasks)) {
    return { ok: false, totalRows: 0, validCount: 0, invalidCount: 0, rows: [], parseError: 'Missing "tasks" array. Expected {"tasks": [ ... ]}.' };
  }

  if (tasks.length === 0) {
    return { ok: false, totalRows: 0, validCount: 0, invalidCount: 0, rows: [], parseError: 'The "tasks" array is empty.' };
  }

  const rows: ValidationRowResult[] = [];
  const seenTitles = new Set<string>();

  tasks.forEach((task, index) => {
    const row: ValidationRowResult = { row: index + 1, status: 'valid', title: null };

    if (!task || typeof task !== 'object' || Array.isArray(task)) {
      row.status = 'invalid';
      row.error = 'Row must be a JSON object.';
      rows.push(row);
      return;
    }

    row.title = typeof task.title === 'string' ? task.title : null;

    const error = validateRow(task);
    if (error) {
      row.status = 'invalid';
      row.error = error;
    } else {
      const titleKey = (task.title || '').toLowerCase().trim();
      if (seenTitles.has(titleKey)) {
        row.status = 'invalid';
        row.error = `Duplicate task title "${task.title}" in this import.`;
      } else if (options?.existingTaskTitles?.has(titleKey)) {
        row.status = 'invalid';
        row.error = `A task titled "${task.title}" already exists in the database.`;
      } else {
        seenTitles.add(titleKey);
      }
    }
    rows.push(row);
  });

  const invalidCount = rows.filter((r) => r.status === 'invalid').length;
  return {
    ok: invalidCount === 0,
    totalRows: rows.length,
    validCount: rows.length - invalidCount,
    invalidCount,
    rows,
  };
}

function validateRow(task: any): string | null {
  for (const field of VERIFICATION_TASK_FIELDS) {
    const value = task[field.key];

    if (value === undefined || value === null || value === '') {
      if (field.required) {
        return `${field.key} is required`;
      }
      continue;
    }

    if (field.type === 'string' && typeof value !== 'string') {
      return `${field.key} must be a string`;
    }
    if (field.type === 'integer' && (!Number.isInteger(Number(value)) || Number(value) < 0)) {
      return `${field.key} must be a non-negative integer`;
    }
    if (field.type === 'enum' && field.enum && !field.enum.includes(value)) {
      return `${field.key} must be one of: ${field.enum.join(', ')}`;
    }
  }

  // Length + business rules.
  const title = (task.title || '').trim();
  if (title.length < 3 || title.length > 200) {
    return 'title must be 3..200 characters';
  }

  const description = (task.description || '').trim();
  if (description.length < 10 || description.length > 8000) {
    return 'description must be 10..8000 characters';
  }

  const submission = (task.submission_instructions || '').trim();
  if (submission.length < 10 || submission.length > 4000) {
    return 'submission_instructions must be 10..4000 characters';
  }

  const max = task.max_marks !== undefined && task.max_marks !== '' ? Number(task.max_marks) : 10;
  if (max < 1 || max > 100) {
    return 'max_marks must be between 1 and 100';
  }

  const pass = task.pass_marks !== undefined && task.pass_marks !== '' ? Number(task.pass_marks) : 6;
  if (pass < 1 || pass > max) {
    return 'pass_marks must be between 1 and max_marks';
  }

  return null;
}
