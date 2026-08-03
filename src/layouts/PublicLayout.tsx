import { Link, Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { BrandLogo } from '../components/common/BrandLogo'

export function PublicLayout() {
  const [open, setOpen] = useState(false)
  return <div className="min-h-screen">
    <header className="absolute inset-x-0 top-0 z-20 border-b border-white/10 bg-[#800000]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-center gap-3 text-white"><BrandLogo className="h-14 w-14"/><span><b className="block text-sm leading-4">School Facility Complaint</b><small className="block text-white/60">Monitoring System</small><small className="block text-[10px] text-white/45">IBA College of Mindanao, Inc.</small></span></Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-white/80 md:flex"><Link to="/">Home</Link><Link to="/about">About</Link><Link to="/vision-mission">Vision & Mission</Link><Link to="/login" className="rounded-xl bg-white px-4 py-2.5 text-forest-800">Sign in</Link></nav>
        <button className="text-white md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X /> : <Menu />}</button>
      </div>
      {open && <nav className="mx-4 grid gap-1 rounded-xl bg-white p-3 text-sm shadow-xl md:hidden"><Link className="p-2" to="/">Home</Link><Link className="p-2" to="/about">About</Link><Link className="p-2" to="/vision-mission">Vision & Mission</Link><Link className="p-2 font-semibold text-forest-700" to="/login">Sign in</Link></nav>}
    </header>
    <Outlet />
  </div>
}
