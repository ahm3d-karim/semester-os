// Semester OS — TypeScript types (matches course-model.v1.json schema)

export interface ParsedChunk {
  page: number;
  text: string;
  markdown: string;
  char_offset?: number;
}

export interface Institution {
  id: string;
  code: string;          // 'LUMS'
  name: string;
  calendar_url: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  inst_id: string;
  term: string;          // 'Fall 2026'
  session_no: number;
  date_start: string;    // YYYY-MM-DD
  date_end: string;
}

export interface CalendarEvent {
  id: string;
  inst_id: string;
  term: string;
  title: string;
  date_start: string;
  date_end: string | null;
  official: boolean;
}

export interface Course {
  id: string;
  inst_id: string;
  code: string;          // 'FINN 372'
  title: string;
  offering: string | null;
  status: 'active' | 'archived';
  created_at: string;
}

export interface Syllabus {
  id: string;
  course_id: string;
  file_key: string;
  filename: string;
  status: 'uploaded' | 'processing' | 'done' | 'error';
  created_at: string;
}

export type IngestStage = 'parse' | 'extract' | 'verify' | 'approve' | 'model' | 'brief';
export type JobStatus = 'pending' | 'running' | 'done' | 'error';

export interface IngestJob {
  id: string;
  syllabus_id: string;
  stage: IngestStage;
  status: JobStatus;
  log_json: Record<string, unknown>;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export type ItemKind = 'deadline' | 'grade_component' | 'policy' | 'milestone' | 'note';
export type ItemTier = 'sourced' | 'synthesized';

export interface Anchor {
  source_text: string;
  page: number;
  section: string | null;
  char_offset: number | null;
}

export interface LLMJudge {
  pass: boolean;
  reason: string;
}

export interface ItemChecks {
  anchor_exists: boolean;
  number_match: boolean;
  session_date_consistent: boolean;
  llm_judge: LLMJudge;
}

export interface ItemVerification {
  score: number;         // 0-1
  checks: ItemChecks;
  auto_rejected: boolean;
}

export interface ModelItem {
  id: string;
  course_id: string;
  model_version: number;
  kind: ItemKind;
  title: string;
  detail: string;
  session_no: number | null;
  date: string | null;
  session_range: { start: number; end: number } | null;
  weight: number | null;
  tier: ItemTier;
  anchors: Anchor[];
  verification: ItemVerification;
  approved: boolean;
  approved_at: string | null;
  approval_note: string | null;
  created_at: string;
}

export type ModelStatus = 'draft' | 'verified' | 'approved' | 'superseded';

export interface GradeBudgetComponent {
  item_id: string;
  title: string;
  weight: number;
  scored: number | null;
  running_pct: number | null;
}

export type BudgetStatus = 'balanced' | 'over' | 'under';

export interface GradeBudget {
  total_weight: number;
  items_count: number;
  status: BudgetStatus;
  components: GradeBudgetComponent[];
}

export interface VerificationSummary {
  total_items: number;
  passed: number;
  failed: number;
  auto_rejected: number;
  coverage_pct: number;
}

export interface CourseModel {
  model_id: string;
  course_id: string;
  version: number;
  supersedes_id: string | null;
  syllabus_id: string;
  created_at: string;
  status: ModelStatus;
  items: ModelItem[];
  budget: GradeBudget;
  verification_summary: VerificationSummary;
}

export interface Approval {
  id: string;
  model_id: string;
  item_id: string;
  action: 'approve' | 'edit' | 'reject';
  user_note: string | null;
  decided_at: string;
}

export interface GradeEntry {
  id: string;
  course_id: string;
  component_id: string;
  score: number;
  max_score: number;
  added_at: string;
}

export type BriefingKind = 'weekly' | 'warning' | 'budget_delta';

export interface Briefing {
  id: string;
  user_id: string;
  course_id: string | null;
  kind: BriefingKind;
  content: string;
  delivered_via: 'in_app' | 'whatsapp' | 'email' | null;
  delivered_at: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  whatsapp_phone: string | null;
  delivery_prefs: { in_app: boolean; whatsapp: boolean; email: boolean };
  default_course_ids: string[];
  created_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  provider: string;
  key_encrypted: string;
  created_at: string;
}
