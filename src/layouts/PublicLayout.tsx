import { Link, NavLink, Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { BrandLogo } from '../components/common/BrandLogo'

export function PublicLayout() {
  const [open, setOpen] = useState(false)
  const desktopLink = ({isActive}:{isActive:boolean}) => `inline-flex min-h-11 items-center rounded-lg px-3 py-2 transition-colors hover:bg-white/10 hover:text-white active:bg-white/20 ${isActive?'bg-white/15 text-white shadow-sm':'text-white/80'}`
  const mobileLink = ({isActive}:{isActive:boolean}) => `flex min-h-11 items-center rounded-lg px-3 py-2.5 transition-colors ${isActive?'bg-forest-800 font-semibold text-white':'hover:bg-slate-100'}`
  return <div className="min-h-screen">
    <header className="absolute inset-x-0 top-0 z-20 border-b border-white/10 bg-[#800000]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-center gap-3 text-white"><BrandLogo className="h-14 w-14"/><span><b className="block text-sm leading-4">School Facility Complaint</b><small className="block text-white/60">Monitoring System</small><small className="block text-[10px] text-white/45">IBA College of Mindanao, Inc.</small></span></Link>
        <nav className="hidden items-center gap-3 text-sm font-medium lg:flex"><NavLink end className={desktopLink} to="/">Home</NavLink><NavLink className={desktopLink} to="/guide">User guide</NavLink><NavLink className={desktopLink} to="/about">About</NavLink><NavLink className={desktopLink} to="/vision-mission">Vision & Mission</NavLink><Link to="/login" className="btn-secondary">Sign in</Link></nav>
        <button type="button" className="btn-icon btn-icon-inverse lg:hidden" onClick={() => setOpen(!open)} aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open}>{open ? <X /> : <Menu />}</button>
      </div>
      {open && <nav className="mx-4 grid gap-1 rounded-xl bg-white p-3 text-sm shadow-xl lg:hidden"><NavLink end className={mobileLink} onClick={()=>setOpen(false)} to="/">Home</NavLink><NavLink className={mobileLink} onClick={()=>setOpen(false)} to="/guide">User guide</NavLink><NavLink className={mobileLink} onClick={()=>setOpen(false)} to="/about">About</NavLink><NavLink className={mobileLink} onClick={()=>setOpen(false)} to="/vision-mission">Vision & Mission</NavLink><Link className="btn-secondary mt-2" onClick={()=>setOpen(false)} to="/login">Sign in</Link></nav>}
    </header>
    <Outlet />
  </div>
}
