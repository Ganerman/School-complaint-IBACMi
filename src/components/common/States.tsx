import { AlertCircle, Inbox } from 'lucide-react'

export function LoadingScreen() {
  return <div className="grid min-h-[50vh] place-items-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-forest-100 border-t-forest-700" /></div>
}
export function EmptyState({ title = 'Nothing here yet', message = 'New records will appear here.' }) {
  return <div className="card grid place-items-center px-6 py-16 text-center"><Inbox className="mb-3 text-slate-300" size={36} /><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm text-slate-500">{message}</p></div>
}
export function ErrorState({ message }: { message: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={19} />{message}</div>
}
