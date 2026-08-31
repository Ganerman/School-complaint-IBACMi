import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import { authService } from "../../services/authService";

export function CompleteStudentProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    student_id: profile?.student_id || "",
    course: profile?.course || "",
    year_level: profile?.year_level || "",
    contact_number: profile?.contact_number || "",
    password: "",
    confirm_password: "",
  });
  const [busy, setBusy] = useState(false);

  if (!profile) return null;
  const profileId = profile.id;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const values = {
      full_name: form.full_name.trim(),
      student_id: form.student_id.trim(),
      course: form.course.trim(),
      year_level: form.year_level.trim(),
      contact_number: form.contact_number.trim(),
    };
    if (Object.values(values).some((value) => !value)) return toast.error("Please complete all student information.");
    if (form.password.length < 8) return toast.error("Password must contain at least 8 characters.");
    if (form.password !== form.confirm_password) return toast.error("Passwords do not match.");
    setBusy(true);
    const passwordResult = await authService.updatePassword(form.password);
    if (passwordResult.error) { setBusy(false); return toast.error(passwordResult.error.message || "Unable to set password."); }
    const { error } = await supabase.from("profiles").update(values).eq("id", profileId);
    if (error) { setBusy(false); return toast.error(error.message || "Unable to save student information."); }
    await refreshProfile();
    toast.success("Student profile completed. You can now submit complaints.");
    navigate("/student/dashboard", { replace: true });
  }

  return <div className="mx-auto max-w-2xl">
    <p className="text-xs font-bold uppercase tracking-[.2em] text-forest-600">Required account setup</p>
    <h1 className="display mt-1 text-4xl">Complete your student profile</h1>
    <p className="mt-2 text-slate-500">Complete these details before submitting a facility complaint. Your School ID and password can be used if you forget your Google account.</p>
    <form className="card mt-7 grid gap-5 p-6 md:p-8" onSubmit={submit}>
      <div><label className="label">Full name</label><input className="input" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
      <div><label className="label">School ID</label><input className="input" required value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} placeholder="Enter your official School ID" /></div>
      <div className="grid gap-5 sm:grid-cols-2"><div><label className="label">Course</label><input className="input" required value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} /></div><div><label className="label">Year level</label><input className="input" required value={form.year_level} onChange={(e) => setForm({ ...form, year_level: e.target.value })} placeholder="e.g. 1st Year" /></div></div>
      <div><label className="label">Contact number</label><input className="input" required value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} /></div>
      <div className="border-t pt-5"><h2 className="font-bold">Create School ID login password</h2><p className="mt-1 text-sm text-slate-500">Use this together with your School ID when you cannot use Google login.</p></div>
      <div className="grid gap-5 sm:grid-cols-2"><div><label className="label">Password</label><input className="input" type="password" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div><div><label className="label">Confirm password</label><input className="input" type="password" minLength={8} required value={form.confirm_password} onChange={(e) => setForm({ ...form, confirm_password: e.target.value })} /></div></div>
      <button className="btn-primary justify-self-end" disabled={busy}>{busy ? "Saving…" : "Complete profile"}</button>
    </form>
  </div>;
}
