import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { authService } from '../../services/authService'
import { friendlyError } from '../../utils/errors'
import { useAuth } from '../../hooks/useAuth'
import { isSupabaseConfigured } from '../../lib/supabase'
import { BrandLogo } from '../../components/common/BrandLogo'

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <main className="grid min-h-screen lg:grid-cols-[.82fr_1.18fr]">
    <section className="relative hidden overflow-hidden bg-forest-900 p-12 text-white lg:flex lg:flex-col lg:justify-between"><Link to="/" className="flex items-center gap-3"><BrandLogo className="h-16 w-16"/><span><b className="block max-w-56 leading-5">School Facility Complaint Monitoring System</b><small className="mt-1 block text-white/50">IBA College of Mindanao, Inc.</small></span></Link><div><h2 className="display max-w-lg text-5xl leading-tight">Small reports create a safer, stronger campus.</h2><p className="mt-5 max-w-md leading-7 text-white/60">Your voice helps the school respond quickly and care for the spaces we all share.</p></div><p className="text-sm text-white/40">Securely powered by Supabase</p></section>
    <section className="flex items-center justify-center bg-[#f6f6f6] px-5 py-16"><div className="w-full max-w-md"><Link to="/" className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-slate-500"><ArrowLeft size={16}/>Back home</Link><h1 className="display text-4xl text-slate-900">{title}</h1><p className="mt-2 text-slate-500">{subtitle}</p>{!isSupabaseConfigured&&<div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Add Supabase values to your <code>.env</code> file to enable accounts.</div>}<div className="mt-8">{children}</div></div></section>
  </main>
}
function PasswordInput({ value, onChange, label='Password' }: { value:string; onChange:(v:string)=>void; label?:string }) {
  const [show,setShow]=useState(false)
  return <div><label className="label">{label}</label><div className="relative"><input className="input pr-11" type={show?'text':'password'} minLength={8} required value={value} onChange={e=>onChange(e.target.value)} /><button type="button" className="absolute right-3 top-2.5 text-slate-400" onClick={()=>setShow(!show)} aria-label="Show password">{show?<EyeOff size={19}/>:<Eye size={19}/>}</button></div></div>
}
export function LoginPage() {
  const { user, profile }=useAuth(); const nav=useNavigate(); const [identifier,setIdentifier]=useState(''); const [password,setPassword]=useState(''); const [busy,setBusy]=useState(false); const [googleBusy,setGoogleBusy]=useState(false)
  if(user&&profile) return <Navigate to={`/${profile.role}/dashboard`} replace/>
  async function submit(e:FormEvent){e.preventDefault();setBusy(true);const {error,data}=await authService.signIn(identifier,password);setBusy(false);if(error)return toast.error(friendlyError(error));toast.success('Welcome back!');if(data.user)setTimeout(()=>nav('/portal'),400)}
  async function googleSignIn(){setGoogleBusy(true);const{error}=await authService.signInWithGoogle();if(error){setGoogleBusy(false);toast.error(friendlyError(error))}}
  return <main className="min-h-screen bg-[#eef2f7] px-5 py-12">
    <div className="mx-auto w-full max-w-[460px]">
      <Link to="/" className="mb-7 flex items-center justify-center gap-3">
        <BrandLogo className="h-24 w-24"/>
        <span><b className="display block text-2xl leading-tight text-slate-900 sm:text-3xl">School Facility Complaint</b><small className="mt-1 block font-semibold tracking-[.18em] text-forest-700">MONITORING SYSTEM</small><small className="mt-1 block font-medium text-slate-500">IBA College of Mindanao, Inc.</small></span>
      </Link>
      <section className="overflow-hidden rounded-t-md bg-white shadow-soft">
        <div className="bg-forest-700 px-6 py-5 text-center text-lg font-bold text-white">SCHOOL PORTAL LOGIN</div>
        <form className="grid gap-5 px-7 py-7 sm:px-11" onSubmit={submit}>
          {!isSupabaseConfigured&&<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Add Supabase credentials to your <code>.env</code> file to enable login.</div>}
          <div><label className="label font-normal">Email or School ID</label><input className="input h-11 rounded-md" type="text" autoComplete="username" required value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder="name@school.edu or your School ID"/></div>
          <PasswordInput value={password} onChange={setPassword}/>
          <div className="grid gap-2 text-sm">
            <Link className="font-medium text-forest-700 hover:underline" to="/forgot-password">Forgot Password?</Link>
            <Link className="font-medium text-forest-700 hover:underline" to="/register">Create a student account</Link>
          </div>
          <button className="w-full rounded-full bg-forest-700 px-5 py-3 font-bold text-white shadow-lg shadow-forest-100 transition hover:bg-forest-800" disabled={busy||!isSupabaseConfigured}>{busy?'Signing in…':'Sign In'}</button>
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-slate-200"/><span>or</span><span className="h-px flex-1 bg-slate-200"/></div>
          <button type="button" onClick={googleSignIn} className="flex w-full items-center justify-center gap-3 rounded-full border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60" disabled={googleBusy||!isSupabaseConfigured}><span className="grid h-5 w-5 place-items-center rounded-full font-bold text-blue-600">G</span>{googleBusy?'Connecting…':'Continue with Google'}</button>
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-800"><b>Gentle Reminder:</b> Do not share passwords, complaint evidence, or other confidential information on social media. Protect your privacy.</div>
        </form>
      </section>
      <p className="mt-14 text-center text-sm text-slate-600">{new Date().getFullYear()} © <span className="font-semibold text-forest-700">IBACMI School Facility Complaint Monitoring System</span></p>
    </div>
  </main>
}
export function RegisterPage() {
  const [form,setForm]=useState({fullName:'',studentId:'',email:'',course:'',yearLevel:'',department:'',password:'',accountType:'student' as 'student'|'teacher'|'staff'});const[busy,setBusy]=useState(false)
  const set=(k:string,v:string)=>setForm({...form,[k]:v})
  async function submit(e:FormEvent){e.preventDefault();setBusy(true);const {error}=await authService.signUp(form);setBusy(false);if(error)return toast.error(friendlyError(error));toast.success(form.accountType==='student'?'Account created. Check your email to verify it.':'Account created. Verify your email, then wait for administrator approval.',{duration:8000})}
  return <main className="min-h-screen bg-[#eef2f7] px-5 py-12">
    <div className="mx-auto w-full max-w-[620px]">
      <Link to="/" className="mb-7 flex items-center justify-center gap-3">
        <BrandLogo className="h-24 w-24"/>
        <span><b className="display block text-2xl leading-tight text-slate-900 sm:text-3xl">School Facility Complaint</b><small className="mt-1 block font-semibold tracking-[.18em] text-forest-700">MONITORING SYSTEM</small><small className="mt-1 block font-medium text-slate-500">IBA College of Mindanao, Inc.</small></span>
      </Link>
      <section className="overflow-hidden rounded-t-md bg-white shadow-soft">
        <div className="bg-forest-700 px-6 py-5 text-center text-lg font-bold text-white">USER REGISTRATION</div>
        <form className="grid gap-5 px-7 py-7 sm:px-11" onSubmit={submit}>
          {!isSupabaseConfigured&&<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Add Supabase credentials to your <code>.env</code> file to enable registration.</div>}
          <p className="text-sm leading-6 text-slate-500">Students can begin after email verification. Teacher and staff accounts require administrator identity approval.</p>
          <div><label className="label font-normal">I am registering as</label><select className="input h-11 rounded-md" value={form.accountType} onChange={e=>setForm({...form,accountType:e.target.value as 'student'|'teacher'|'staff',studentId:'',course:'',yearLevel:'',department:''})}><option value="student">Student</option><option value="teacher">Teacher</option><option value="staff">School Staff</option></select></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div><label className="label font-normal">Full name</label><input className="input h-11 rounded-md" required value={form.fullName} onChange={e=>set('fullName',e.target.value)}/></div>
            <div><label className="label font-normal">{form.accountType==='student'?'School ID No.':'Employee ID No.'}</label><input className="input h-11 rounded-md" required value={form.studentId} onChange={e=>set('studentId',e.target.value)}/></div>
          </div>
          <div><label className="label font-normal">School email</label><input className="input h-11 rounded-md" type="email" required value={form.email} onChange={e=>set('email',e.target.value)} placeholder="student@school.edu"/></div>
          {form.accountType==='student'&&<div className="grid gap-5 sm:grid-cols-2">
            <div><label className="label font-normal">Course</label><select className="input h-11 rounded-md" required value={form.course} onChange={e=>set('course',e.target.value)}><option value="">Select course</option>{['BSIT','BPA','CRIM','BEED','BECED','HM','ENTREP','BASIC EDUCATION DEPARTMENT'].map(course=><option key={course} value={course}>{course}</option>)}</select></div>
            <div><label className="label font-normal">Year level</label><select className="input h-11 rounded-md" required value={form.yearLevel} onChange={e=>set('yearLevel',e.target.value)}><option value="">Select year</option>{['1st Year','2nd Year','3rd Year','4th Year','5th Year'].map(x=><option key={x}>{x}</option>)}</select></div>
          </div>}
          {form.accountType!=='student'&&<div><label className="label font-normal">Department / office</label><input className="input h-11 rounded-md" required maxLength={150} value={form.department} onChange={e=>set('department',e.target.value)} placeholder={form.accountType==='teacher'?'e.g. College of Information Technology':'e.g. Registrar Office'}/><p className="mt-1.5 text-xs text-amber-700">This account will remain pending until an administrator verifies your identity.</p></div>}
          <PasswordInput value={form.password} onChange={v=>set('password',v)}/>
          <button className="w-full rounded-full bg-forest-700 px-5 py-3 font-bold text-white shadow-lg shadow-forest-100 transition hover:bg-forest-800" disabled={busy||!isSupabaseConfigured}>{busy?'Creating account…':`Create ${form.accountType==='student'?'Student':'Teacher / Staff'} Account`}</button>
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-800"><b>Gentle Reminder:</b> Use your real school information and never share your password or confidential complaint evidence with others.</div>
          <p className="text-center text-sm text-slate-500">Already registered? <Link className="font-bold text-forest-700 hover:underline" to="/login">Sign In</Link></p>
        </form>
      </section>
      <p className="mt-12 text-center text-sm text-slate-600">{new Date().getFullYear()} © <span className="font-semibold text-forest-700">IBACMI School Facility Complaint Monitoring System</span></p>
    </div>
  </main>
}
export function ForgotPasswordPage(){const[email,setEmail]=useState('');const[busy,setBusy]=useState(false);async function submit(e:FormEvent){e.preventDefault();setBusy(true);const{error}=await authService.resetPassword(email);setBusy(false);if(error)toast.error(friendlyError(error));else toast.success('If that account exists, a reset link is on its way.')}return <AuthShell title="Reset your password" subtitle="We'll email you a secure recovery link."><form className="grid gap-5" onSubmit={submit}><div><label className="label">Email address</label><input className="input" type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></div><button className="btn-primary" disabled={busy||!isSupabaseConfigured}>Send recovery link</button><Link className="text-center text-sm font-semibold text-forest-700" to="/login">Back to sign in</Link></form></AuthShell>}
export function ResetPasswordPage(){const[p,setP]=useState('');const[confirm,setConfirm]=useState('');const nav=useNavigate();async function submit(e:FormEvent){e.preventDefault();if(p!==confirm)return toast.error('Passwords do not match.');const{error}=await authService.updatePassword(p);if(error)return toast.error(friendlyError(error));toast.success('Password updated.');nav('/portal')}return <AuthShell title="Choose a new password" subtitle="Use at least eight characters."><form className="grid gap-5" onSubmit={submit}><PasswordInput value={p} onChange={setP} label="New password"/><PasswordInput value={confirm} onChange={setConfirm} label="Confirm password"/><button className="btn-primary">Update password</button></form></AuthShell>}
