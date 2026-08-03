import { ArrowRight, BarChart3, BellRing, CheckCircle2, ClipboardCheck, ShieldCheck, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'
import ceilingLeak from '../../assets/complaints/ceiling-leak.png'
import maintenanceResponse from '../../assets/complaints/maintenance-response.png'
import studentReport from '../../assets/complaints/student-report.png'

export function LandingPage() {
  return <main>
    <section className="relative min-h-[720px] overflow-hidden bg-white text-slate-800">
      <div className="absolute inset-0 opacity-20" style={{backgroundImage:'radial-gradient(circle at 15% 25%, #fec633 0, transparent 24%), radial-gradient(circle at 85% 75%, #920000 0, transparent 28%)'}} />
      <div className="relative mx-auto grid min-h-[720px] max-w-7xl items-center gap-14 px-5 pb-16 pt-28 lg:grid-cols-[1.15fr_.85fr]">
        <div><span className="inline-flex items-center gap-2 rounded-full border border-forest-100 bg-forest-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-forest-700"><ShieldCheck size={14} /> A safer, better campus</span>
          <h1 className="display mt-7 max-w-3xl text-5xl leading-[1.05] text-forest-900 sm:text-6xl lg:text-7xl">Every concern heard. Every facility cared for.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Report facility issues, follow repair progress, and help build a campus where everyone can learn at their best.</p>
          <div className="mt-9 flex flex-wrap gap-3"><Link className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-bold text-forest-900 hover:bg-amber-300" to="/register">Report a concern <ArrowRight size={18}/></Link><Link className="rounded-xl border border-forest-200 bg-white px-5 py-3 font-semibold text-forest-800 hover:bg-forest-50" to="/login">Track my report</Link></div>
          <div className="mt-10 flex flex-wrap gap-6 text-sm text-slate-500">{['Secure reporting','Live updates','Transparent resolution'].map(x=><span className="flex items-center gap-2" key={x}><CheckCircle2 className="text-forest-600" size={17}/>{x}</span>)}</div>
        </div>
        <div className="relative hidden lg:block">
          <div className="rounded-[2rem] border border-forest-100 bg-forest-900 p-5 shadow-2xl"><div className="rounded-2xl bg-[#f6f6f6] p-5 text-slate-800"><div className="flex items-center justify-between"><div><small className="font-semibold text-slate-400">COMPLAINT OVERVIEW</small><h3 className="mt-1 text-lg font-bold">Campus today</h3></div><BellRing className="text-forest-700"/></div><div className="mt-5 grid grid-cols-2 gap-3">{[['12','Open reports'],['8','In progress'],['24','Resolved'],['94%','Resolution rate']].map(([v,l])=><div className="rounded-xl border bg-white p-4" key={l}><b className="text-2xl text-forest-800">{v}</b><p className="text-xs text-slate-500">{l}</p></div>)}</div><div className="mt-4 rounded-xl border bg-white p-4"><div className="flex justify-between text-sm"><b>Library A/C repair</b><span className="text-amber-600">In progress</span></div><div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-full w-2/3 rounded-full bg-forest-600"/></div></div></div></div>
          <div className="absolute -bottom-8 -left-10 flex items-center gap-3 rounded-2xl bg-white p-4 text-slate-800 shadow-xl"><span className="rounded-xl bg-forest-50 p-2 text-forest-700"><CheckCircle2/></span><div><b className="block text-sm">Issue resolved</b><small className="text-slate-400">Science Lab · just now</small></div></div>
        </div>
      </div>
    </section>
    <section className="border-y border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-24">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[.25em] text-forest-600">Campus concerns in action</p>
            <h2 className="display mt-3 text-4xl text-slate-900">See it. Report it. We take care of it.</h2>
            <p className="mt-4 leading-7 text-slate-500">From the first photo to the completed repair, the School Facility Complaint Monitoring System keeps every facility concern visible and accountable.</p>
          </div>
          <Link className="btn-primary" to="/register">Start a report <ArrowRight size={17}/></Link>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            [studentReport,'Report with confidence','Students can document damaged facilities in seconds.','01'],
            [ceilingLeak,'Make concerns visible','Clear photo evidence helps the school assess urgency.','02'],
            [maintenanceResponse,'Follow the response','Assigned teams provide accountable repair updates.','03'],
          ].map(([image,title,copy,number])=>
            <article className="group overflow-hidden rounded-2xl border bg-[#f6f6f6] shadow-sm" key={title}>
              <div className="relative h-64 overflow-hidden">
                <img src={image} alt={title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"/>
                <span className="absolute left-4 top-4 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-forest-900">{number}</span>
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-forest-900/70 to-transparent"/>
              </div>
              <div className="border-t-4 border-forest-600 p-6">
                <h3 className="text-lg font-bold text-forest-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
              </div>
            </article>
          )}
        </div>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-5 py-24"><div className="text-center"><p className="text-xs font-bold uppercase tracking-[.25em] text-forest-600">Simple by design</p><h2 className="display mt-3 text-4xl text-slate-900">From report to resolution</h2></div><div className="mt-12 grid gap-5 md:grid-cols-3">{[
      [ClipboardCheck,'Submit your concern','Tell us what happened, where it is, and attach a clear photo.'],
      [Wrench,'The right team responds','Administrators review it and assign the best maintenance specialist.'],
      [BarChart3,'Follow every update','Get notifications, see progress photos, and rate the completed repair.'],
    ].map(([Icon,title,copy],i)=><article className="card p-7" key={title as string}><span className="grid h-12 w-12 place-items-center rounded-xl bg-forest-50 text-forest-700"><Icon size={23}/></span><small className="mt-6 block font-bold text-amber-500">0{i+1}</small><h3 className="mt-2 text-xl font-bold">{title as string}</h3><p className="mt-3 leading-7 text-slate-500">{copy as string}</p></article>)}</div></section>
    <footer className="bg-forest-900 px-5 py-8 text-center text-sm text-white/50">© {new Date().getFullYear()} IBA College of Mindanao, Inc. · School Facility Complaint Monitoring System</footer>
  </main>
}
