export type Role = 'owner' | 'admin' | 'editor' | 'viewer'

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'other'

export type Priority = 'low' | 'medium' | 'high' | 'urgent'

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
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  website: string | null
  note: string | null
  deleted_at: string | null
  created_at: string
}

export type ClientAssignee = {
  client_id: string
  person_id: string
}

export type ClientWithAssignees = Client & {
  assignees: Person[]
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
  priority: Priority | null
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

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-sky-100 text-sky-700',
  high: 'bg-amber-100 text-amber-800',
  urgent: 'bg-rose-100 text-rose-800',
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
