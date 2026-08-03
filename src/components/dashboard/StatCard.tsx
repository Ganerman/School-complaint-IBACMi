import type { LucideIcon } from 'lucide-react'

export function StatCard({ label, value, icon: Icon, tone = 'green' }: { label: string; value: number | string; icon: LucideIcon; tone?: 'green' | 'gold' | 'blue' | 'red' }) {
  const tones = { green: 'bg-forest-50 text-forest-700', gold: 'bg-amber-50 text-forest-800', blue: 'bg-forest-50 text-forest-700', red: 'bg-red-50 text-red-600' }
  return <div className="card flex items-center justify-between p-5"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-3xl font-bold text-slate-900">{value}</p></div><span className={`rounded-2xl p-3 ${tones[tone]}`}><Icon size={22} /></span></div>
}
