import { useState } from 'react'

const emptyForm = { title: '', description: '', category_id: '', other_category: '', location_id: '' }
type ComplaintForm = typeof emptyForm

// Session storage keeps drafts in this tab, with a separate key for each account.
export function useComplaintDraft(userId: string) {
  const key = `complaint-draft:v1:${userId}`
  const [initial] = useState(() => {
    try {
      const saved = sessionStorage.getItem(key)
      const parsed: unknown = saved ? JSON.parse(saved) : null
      const form = { ...emptyForm }
      if (parsed && typeof parsed === 'object') {
        for (const field of Object.keys(form) as (keyof ComplaintForm)[]) {
          const value = (parsed as Record<string, unknown>)[field]
          if (typeof value === 'string') form[field] = value
        }
      }
      return { form, restored: Object.values(form).some(Boolean), unavailable: false }
    } catch {
      return { form: { ...emptyForm }, restored: false, unavailable: true }
    }
  })
  const [form, updateForm] = useState(initial.form)
  const [restored, setRestored] = useState(initial.restored)
  const [unavailable, setUnavailable] = useState(initial.unavailable)

  function setForm(next: ComplaintForm) {
    updateForm(next)
    try {
      if (Object.values(next).some(Boolean)) sessionStorage.setItem(key, JSON.stringify(next))
      else sessionStorage.removeItem(key)
      setUnavailable(false)
    } catch {
      setUnavailable(true)
    }
  }

  function clearDraft() {
    setForm({ ...emptyForm })
    setRestored(false)
  }

  return { form, setForm, clearDraft, restored, unavailable, hasDraft: Object.values(form).some(Boolean) }
}
