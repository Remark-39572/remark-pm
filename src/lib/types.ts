export type Role = 'owner' | 'admin' | 'editor' | 'viewer'

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'other'

export type Phase =
  | 'discovery'
  | 'scoping'
  | 'fmb'
  | 'core_messaging'
  | 'wireframing'
  | 'moodboarding'
  | 'concept_design'
  | 'design'

export type Person = {
  id: string
  email: string
  name: string | null
  role: Role
  can_login: boolean
  is_resource: boolean
  avatar_url: string | null
  deleted_at: string | null
  created_at: string
}

export type Client = {
  id: string
  name: string
  deleted_at: string | null
  created_at: string
}

export type Project = {
  id: string
  client_id: string | null
  code: string | null
  name: string
  status: ProjectStatus
  start_date: string | null
  end_date: string | null
  time_budget_hours: number | null
  note: string | null
  deleted_at: string | null
  created_at: string
}

export type Task = {
  id: string
  project_id: string
  phase: Phase | null
  activity: string
  deliverable: string | null
  start_date: string | null
  due_date: string | null
  completed: boolean
  is_meeting: boolean
  is_onsite: boolean
  is_translation: boolean
  note: string | null
  sort_order: number
  deleted_at: string | null
  created_at: string
}

export type TaskAssignee = {
  task_id: string
  person_id: string
}

export type ProjectWithClient = Project & { client: Client | null }

export type TaskWithAssignees = Task & {
  assignees: Person[]
}

export const PHASE_LABELS: Record<Phase, string> = {
  discovery: 'Discovery',
  scoping: 'Scoping',
  fmb: 'FMB',
  core_messaging: 'Core Messaging',
  wireframing: 'Wireframing',
  moodboarding: 'Moodboarding',
  concept_design: 'Concept Design',
  design: 'Design',
}

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Active',
  on_hold: 'On hold',
  completed: 'Completed',
  other: 'Other',
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
}
