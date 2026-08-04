import { Link, NavLink, Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { BrandLogo } from '../components/common/BrandLogo'

export function PublicLayout() {
  const [open, setOpen] = useState(false)
  const desktopLink = ({isActive}:{isActive:boolean}) => `rounded-lg px-3 py-2 transition duration-200 hover:bg-white/10 hover:text-white hover:shadow-[0_0_16px_rgba(255,255,255,.35)] active:scale-95 active:bg-white/20 active:shadow-[0_0_22px_rgba(255,255,255,.65)] ${isActive?'bg-white/15 text-white ring-1 ring-white/80 shadow-[0_0_18px_rgba(255,255,255,.55)]':'text-white/80'}`
  const mobileLink = ({isActive}:{isActive:boolean}) => `rounded-lg p-2.5 transition active:scale-[.98] ${isActive?'bg-[#800000] font-semibold text-white shadow-[0_0_16px_rgba(128,0,0,.35)]':'hover:bg-slate-100'}`
  return <div className="min-h-screen">
    <header className="absolute inset-x-0 top-0 z-20 border-b border-white/10 bg-[#800000]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-center gap-3 text-white"><BrandLogo className="h-14 w-14"/><span><b className="block text-sm leading-4">School Facility Complaint</b><small className="block text-white/60">Monitoring System</small><small className="block text-[10px] text-white/45">IBA College of Mindanao, Inc.</small></span></Link>
        <nav className="hidden items-center gap-3 text-sm font-medium md:flex"><NavLink end className={desktopLink} to="/">Home</NavLink><NavLink className={desktopLink} to="/about">About</NavLink><NavLink className={desktopLink} to="/vision-mission">Vision & Mission</NavLink><Link to="/login" className="rounded-xl bg-white px-4 py-2.5 text-forest-800 shadow-sm transition hover:shadow-[0_0_18px_rgba(255,255,255,.7)] active:scale-95 active:shadow-[0_0_24px_rgba(255,255,255,.9)]">Sign in</Link></nav>
        <button className="text-white md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X /> : <Menu />}</button>
      </div>
      {open && <nav className="mx-4 grid gap-1 rounded-xl bg-white p-3 text-sm shadow-xl md:hidden"><NavLink end className={mobileLink} onClick={()=>setOpen(false)} to="/">Home</NavLink><NavLink className={mobileLink} onClick={()=>setOpen(false)} to="/about">About</NavLink><NavLink className={mobileLink} onClick={()=>setOpen(false)} to="/vision-mission">Vision & Mission</NavLink><Link className="rounded-lg p-2.5 font-semibold text-forest-700 transition active:scale-[.98] active:bg-forest-50 active:shadow-[0_0_16px_rgba(21,128,61,.25)]" onClick={()=>setOpen(false)} to="/login">Sign in</Link></nav>}
    </header>
    <Outlet />
  </div>
}
