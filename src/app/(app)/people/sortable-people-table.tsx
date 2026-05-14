'use client'

import { ReactNode } from 'react'
import { SortableList } from '@/app/_components/sortable-list'
import AvatarUpload from './avatar-upload'
import { ROLE_LABELS, type Role } from '@/lib/types'

type Person = {
  id: string
  email: string
  name: string | null
  role: Role
  is_resource: boolean
  avatar_url: string | null
}

export default function SortablePeopleTable({
  people,
  isAdminOrHigher,
  updateAction,
  deleteAction,
  reorderAction,
}: {
  people: Person[]
  isAdminOrHigher: boolean
  updateAction: (formData: FormData) => Promise<void>
  deleteAction: (formData: FormData) => Promise<void>
  reorderAction: (orderedIds: string[]) => Promise<void>
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-base">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="w-10 px-2 py-3"></th>
            <th className="px-4 py-3 font-medium">Photo</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Resource</th>
            {isAdminOrHigher && (
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          <SortableList items={people} onReorder={reorderAction}>
            {(p, handle) =>
              isAdminOrHigher ? (
                <EditableCells
                  person={p}
                  handle={handle}
                  updateAction={updateAction}
                  deleteAction={deleteAction}
                />
              ) : (
                <ReadOnlyCells person={p} handle={handle} />
              )
            }
          </SortableList>
        </tbody>
      </table>
    </div>
  )
}

function EditableCells({
  person,
  handle,
  updateAction,
  deleteAction,
}: {
  person: Person
  handle: ReactNode
  updateAction: (formData: FormData) => Promise<void>
  deleteAction: (formData: FormData) => Promise<void>
}) {
  const formId = `person-form-${person.id}`
  return (
    <>
      <td className="px-2 py-3 align-middle">{handle}</td>
      <td className="px-4 py-3">
        <AvatarUpload
          personId={person.id}
          personEmail={person.email}
          currentUrl={person.avatar_url}
        />
      </td>
      <td className="px-4 py-3 text-slate-700">{person.email}</td>
      <td className="px-4 py-3">
        <form id={formId} action={updateAction}>
          <input type="hidden" name="id" value={person.id} />
          <input
            type="text"
            name="name"
            defaultValue={person.name ?? ''}
            placeholder="—"
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-slate-900 focus:outline-none"
          />
        </form>
      </td>
      <td className="px-4 py-3">
        <select
          form={formId}
          name="role"
          defaultValue={person.role}
          className="rounded border border-slate-300 px-2 py-1 text-sm focus:border-slate-900 focus:outline-none"
        >
          {Object.entries(ROLE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <input
          form={formId}
          type="checkbox"
          name="is_resource"
          defaultChecked={person.is_resource}
        />
      </td>
      <td className="px-4 py-3 text-right">
        <button
          form={formId}
          type="submit"
          className="mr-2 rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-800"
        >
          Save
        </button>
        <form action={deleteAction} className="inline">
          <input type="hidden" name="id" value={person.id} />
          <button
            type="submit"
            className="text-xs text-rose-600 hover:text-rose-800"
          >
            Remove
          </button>
        </form>
      </td>
    </>
  )
}

function ReadOnlyCells({
  person,
  handle,
}: {
  person: Person
  handle: ReactNode
}) {
  return (
    <>
      <td className="px-2 py-3 align-middle">{handle}</td>
      <td className="px-4 py-3">
        {person.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.avatar_url}
            alt={person.email}
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
            {person.email[0].toUpperCase()}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-slate-700">{person.email}</td>
      <td className="px-4 py-3 text-slate-900">{person.name ?? '—'}</td>
      <td className="px-4 py-3 text-slate-700">{ROLE_LABELS[person.role]}</td>
      <td className="px-4 py-3 text-slate-500">
        {person.is_resource ? '✓' : '—'}
      </td>
    </>
  )
}
