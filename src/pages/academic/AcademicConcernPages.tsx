import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  CalendarClock,
  GraduationCap,
  LockKeyhole,
  MessageSquareText,
  Plus,
  Send,
  Users,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  EmptyState,
  ErrorState,
  LoadingScreen,
} from "../../components/common/States";
import { useAuth } from "../../hooks/useAuth";
import { useRealtime } from "../../hooks/useRealtime";
import { supabase } from "../../lib/supabase";
import type {
  AcademicConcern,
  AcademicConcernMessage,
  AcademicConcernStatus,
} from "../../types";
import { formatDate, humanize } from "../../utils/format";

const types = [
  "grade_clarification",
  "missing_score",
  "attendance",
  "classroom_concern",
  "conduct",
  "other",
] as const;
const tone: Record<AcademicConcernStatus, string> = {
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-800",
  teacher_notified: "bg-violet-100 text-violet-700",
  meeting_scheduled: "bg-cyan-100 text-cyan-800",
  teacher_responded: "bg-indigo-100 text-indigo-700",
  resolved: "bg-green-100 text-green-700",
  escalated: "bg-red-100 text-red-700",
  dismissed: "bg-slate-100 text-slate-600",
};

function AcademicBadge({ status }: { status: AcademicConcernStatus }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone[status]}`}
    >
      {humanize(status)}
    </span>
  );
}

export function AcademicConcernListPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<AcademicConcern[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    const { data } = await supabase
      .from("academic_concerns")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data || []) as AcademicConcern[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useRealtime("academic_concerns", load);
  if (loading) return <LoadingScreen />;
  const base = `/${profile?.role}/academic-concerns`;
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-forest-600">
            Private case management
          </p>
          <h1 className="display mt-1 text-4xl">Academic concerns</h1>
          <p className="mt-2 text-slate-500">
            Grade, attendance, classroom, and teacher-related concerns.
          </p>
        </div>
        {profile?.role === "student" && profile.account_type === "student" && (
          <Link className="btn-primary" to={`${base}/new`}>
            <Plus size={18} />
            Submit academic concern
          </Link>
        )}
      </div>
      {items.length === 0 ? (
        <div className="mt-7">
          <EmptyState
            title="No academic concerns"
            message={
              profile?.account_type === "teacher"
                ? "Concerns will appear only after an administrator has reviewed and notified you."
                : "Private academic concern records will appear here."
            }
          />
        </div>
      ) : (
        <div className="card mt-7 overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-5 py-4">Case</th>
                <th>Teacher</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => (
                <tr
                  className="cursor-pointer border-b last:border-0 hover:bg-slate-50"
                  key={x.id}
                  onClick={() => location.assign(`${base}/${x.id}`)}
                >
                  <td className="px-5 py-4">
                    <b>{humanize(x.concern_type)}</b>
                    <small className="block text-slate-400">
                      {x.concern_number}
                    </small>
                  </td>
                  <td>{x.teacher_name}</td>
                  <td>{x.subject_name}</td>
                  <td>
                    <AcademicBadge status={x.status} />
                  </td>
                  <td className="text-slate-500">{formatDate(x.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function NewAcademicConcernPage() {
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const [teachers, setTeachers] = useState<{ id: string; full_name: string }[]>(
    [],
  );
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    teacher_id: "",
    concern_type: "grade_clarification",
    subject_name: "",
    description: "",
    is_confidential: true,
  });
  useEffect(() => {
    void supabase.rpc("list_teacher_directory").then(({ data, error }) => {
      if (error)
        toast.error(
          "Teacher directory is unavailable. Apply the academic concerns SQL update.",
        );
      setTeachers(data || []);
    });
  }, []);
  if (profile?.account_type !== "student")
    return (
      <ErrorState message="Only student accounts can submit academic concerns." />
    );
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("academic_concerns")
      .insert({ ...form, reporter_id: user.id, teacher_name: "Pending" })
      .select("id")
      .single();
    setBusy(false);
    if (error)
      return toast.error(
        "Concern could not be submitted. Check the required fields and Supabase update.",
      );
    toast.success("Academic concern submitted privately.");
    nav(`/student/academic-concerns/${data.id}`);
  }
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-forest-600">
        Private academic support
      </p>
      <h1 className="display mt-1 text-4xl">Submit academic concern</h1>
      <div className="mt-4 flex gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        <LockKeyhole className="shrink-0" size={20} />
        <p>
          The administrator may ask you for clarification before the selected
          teacher is notified.
        </p>
      </div>
      <form className="card mt-6 grid gap-5 p-6" onSubmit={submit}>
        <label>
          <span className="label">Concern type</span>
          <select
            className="input"
            value={form.concern_type}
            onChange={(e) => setForm({ ...form, concern_type: e.target.value })}
          >
            {types.map((x) => (
              <option key={x} value={x}>
                {humanize(x)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Teacher</span>
          <select
            className="input"
            required
            value={form.teacher_id}
            onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
          >
            <option value="">Select teacher</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Subject</span>
          <input
            className="input"
            required
            minLength={2}
            maxLength={150}
            placeholder="e.g. Mathematics 101"
            value={form.subject_name}
            onChange={(e) => setForm({ ...form, subject_name: e.target.value })}
          />
        </label>
        <label>
          <span className="label">Explain your concern</span>
          <textarea
            className="input min-h-40"
            required
            minLength={10}
            maxLength={3000}
            placeholder="Include the activity, date, score, or relevant classroom details."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_confidential}
            onChange={(e) =>
              setForm({ ...form, is_confidential: e.target.checked })
            }
          />
          Mark as confidential
        </label>
        <div className="flex justify-end gap-3 border-t pt-5">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => nav(-1)}
          >
            Cancel
          </button>
          <button className="btn-primary" disabled={busy}>
            {busy ? "Submitting…" : "Submit for private review"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function AcademicConcernDetailPage() {
  const { id } = useParams();
  const { profile } = useAuth();
  const [item, setItem] = useState<AcademicConcern | null>(null);
  const [messages, setMessages] = useState<AcademicConcernMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [meeting, setMeeting] = useState("");
  const [conversationView, setConversationView] = useState<
    "student" | "teacher"
  >("student");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!id) return;
    const [{ data: concern }, { data: thread }] = await Promise.all([
      supabase.from("academic_concerns").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("academic_concern_messages")
        .select("*")
        .eq("concern_id", id)
        .order("created_at"),
    ]);
    setItem(concern as AcademicConcern | null);
    setMessages((thread || []) as AcademicConcernMessage[]);
    setLoading(false);
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  useRealtime("academic_concerns", load);
  useRealtime("academic_concern_messages", load);
  async function adminAction(action: string) {
    if (!item) return;
    setBusy(true);
    const { error } = await supabase.rpc("process_academic_concern", {
      concern_id: item.id,
      action,
      action_notes: notes || null,
      scheduled_at: meeting ? new Date(meeting).toISOString() : null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Academic concern updated.");
    if (action === "notify_teacher") setConversationView("teacher");
    setNotes("");
    await load();
  }
  async function continueTeacherDiscussion() {
    if (!item || notes.trim().length < 3) return;
    setBusy(true);
    const { error } = await supabase.rpc(
      "continue_academic_teacher_discussion",
      { concern_id: item.id, message_text: notes },
    );
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Follow-up sent to the teacher.");
    setConversationView("teacher");
    setNotes("");
    await load();
  }
  async function resolveAfterInvestigation() {
    if (!item || notes.trim().length < 3) return;
    setBusy(true);
    const { error } = await supabase.rpc(
      "resolve_academic_concern_after_investigation",
      { concern_id: item.id, resolution_notes: notes },
    );
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Academic concern resolved.");
    setNotes("");
    await load();
  }
  async function respond() {
    if (!item || notes.trim().length < 3)
      return toast.error("Please provide a response of at least 3 characters.");
    setBusy(true);
    const { error } = await supabase.rpc("respond_to_academic_concern", {
      concern_id: item.id,
      response_text: notes,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Response submitted for administrator review.");
    setNotes("");
    await load();
  }
  if (loading) return <LoadingScreen />;
  if (!item)
    return (
      <ErrorState message="This academic concern is unavailable or private." />
    );
  const isAdmin = profile?.role === "admin";
  const isTeacher =
    profile?.account_type === "teacher" && item.teacher_id === profile.id;
  const isStudent =
    profile?.account_type === "student" && item.reporter_id === profile.id;
  const studentThread = messages.filter((x) => x.audience === "student");
  const lastStudentAdmin = [...studentThread]
    .reverse()
    .find((x) => x.sender_role === "admin");
  const lastStudentReply = [...studentThread]
    .reverse()
    .find((x) => x.sender_role === "student");
  const studentHasAnswered =
    !!lastStudentAdmin &&
    !!lastStudentReply &&
    new Date(lastStudentReply.created_at) >
      new Date(lastStudentAdmin.created_at);
  const studentReplyDue =
    isStudent &&
    item.status === "under_review" &&
    !!lastStudentAdmin &&
    !studentHasAnswered;
  const meetingFinished =
    !!item.meeting_at && new Date(item.meeting_at) <= new Date();
  const teacherDiscussionStarted = messages.some(
    (message) => message.audience === "teacher",
  );
  const visibleMessages = isAdmin
    ? messages.filter((message) => message.audience === conversationView)
    : messages;
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-forest-700">{item.concern_number}</p>
          <h1 className="display mt-1 text-4xl">
            {humanize(item.concern_type)}
          </h1>
          <p className="mt-2 text-slate-500">
            {item.subject_name} · {item.teacher_name}
          </p>
        </div>
        <AcademicBadge status={item.status} />
      </div>
      <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="card p-6">
            <h2 className="flex items-center gap-2 font-bold">
              <GraduationCap size={20} />
              Student statement
            </h2>
            <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-600">
              {item.description}
            </p>
            <p className="mt-5 text-xs text-slate-400">
              Submitted {formatDate(item.created_at)}{" "}
              {item.is_confidential ? "· Confidential" : ""}
            </p>
          </section>
          {messages.length > 0 && (
            <section className="card p-6">
              <h2 className="flex items-center gap-2 font-bold">
                <MessageSquareText size={20} />
                Case conversation
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Clarification and response notes are retained as part of the
                case record.
              </p>
              {isAdmin && (
                <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${conversationView === "student" ? "bg-white text-forest-700 shadow-sm" : "text-slate-500"}`}
                    onClick={() => setConversationView("student")}
                  >
                    Student investigation
                  </button>
                  <button
                    type="button"
                    disabled={!teacherDiscussionStarted}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${conversationView === "teacher" ? "bg-white text-forest-700 shadow-sm" : "text-slate-500"}`}
                    onClick={() => setConversationView("teacher")}
                  >
                    Teacher investigation
                  </button>
                </div>
              )}
              <div className="mt-5 space-y-4">
                {visibleMessages.map((message) => {
                  const mine = message.sender_id === profile?.id;
                  const senderLabel =
                    message.sender_role === "student"
                      ? isAdmin
                        ? "Anonymous"
                        : mine
                          ? "You"
                          : "Anonymous"
                      : message.sender_name;
                  return (
                    <article
                      key={message.id}
                      className={`rounded-xl border p-4 ${mine ? "ml-8 border-forest-200 bg-forest-50" : "mr-8 bg-slate-50"}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-bold">
                          {senderLabel}{" "}
                          <span className="font-normal text-slate-400">
                            · {humanize(message.sender_role)}
                          </span>
                        </p>
                        {isAdmin && (
                          <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-500">
                            Admin ↔ {humanize(message.audience)}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {message.message}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        {formatDate(message.created_at)}
                      </p>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
          {item.meeting_at && (
            <section className="card border-cyan-200 bg-cyan-50 p-6">
              <h2 className="flex items-center gap-2 font-bold text-cyan-900">
                <CalendarClock size={20} />
                Office meeting
              </h2>
              <p className="mt-2 text-cyan-800">
                {formatDate(item.meeting_at)}
              </p>
              {!meetingFinished && (
                <p className="mt-2 text-sm text-cyan-700">
                  The administrator can record the final decision after this
                  meeting.
                </p>
              )}
            </section>
          )}
          {item.resolution && (
            <section className="card border-green-200 bg-green-50 p-6">
              <h2 className="font-bold text-green-900">Final decision</h2>
              <p className="mt-2 whitespace-pre-wrap text-green-800">
                {item.resolution}
              </p>
            </section>
          )}
        </div>
        <aside>
          <section className="card p-5">
            <h2 className="font-bold">Case actions</h2>
            {isAdmin && (
              <>
                <textarea
                  className="input mt-4 min-h-24"
                  placeholder={
                    item.status === "meeting_scheduled"
                      ? "Final decision after the meeting"
                      : item.status === "teacher_responded"
                        ? "Teacher follow-up or final decision notes"
                      : item.status === "under_review" && studentHasAnswered
                        ? "Note for the teacher"
                        : "Write a clear case note"
                  }
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                {item.status === "teacher_responded" && (
                  <label className="mt-3 block">
                    <span className="label">Office meeting date and time</span>
                    <input
                      className="input"
                      type="datetime-local"
                      value={meeting}
                      onChange={(e) => setMeeting(e.target.value)}
                    />
                  </label>
                )}
                <div className="mt-3 grid gap-2">
                  {item.status === "submitted" && (
                    <button
                      className="btn-primary"
                      disabled={busy}
                      onClick={() => adminAction("review")}
                    >
                      Start private review
                    </button>
                  )}
                  {item.status === "under_review" && (
                    <>
                      <button
                        className="btn-secondary"
                        disabled={busy || notes.trim().length < 3}
                        onClick={() =>
                          adminAction("request_student_clarification")
                        }
                      >
                        <Send size={17} />
                        {lastStudentAdmin
                          ? "Ask student follow-up"
                          : "Ask student for clarification"}
                      </button>
                      <button
                        className="btn-primary"
                        disabled={
                          busy || !studentHasAnswered || notes.trim().length < 3
                        }
                        onClick={() => adminAction("notify_teacher")}
                      >
                        <Users size={17} />
                        Notify teacher for response
                      </button>
                      <button
                        className="btn-secondary"
                        disabled={busy || notes.trim().length < 3}
                        onClick={() => adminAction("dismiss")}
                      >
                        Dismiss with reason
                      </button>
                      {lastStudentAdmin && !studentHasAnswered && (
                        <p className="text-xs text-amber-700">
                          Waiting for the student to answer the latest
                          clarification.
                        </p>
                      )}
                    </>
                  )}
                  {item.status === "teacher_notified" && (
                    <p className="rounded-lg bg-violet-50 p-3 text-sm text-violet-700">
                      Waiting for the teacher's response.
                    </p>
                  )}
                  {item.status === "teacher_responded" && (
                    <>
                      <p className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-700">
                        Review the teacher's response. You may ask another
                        question, resolve the concern, or schedule a meeting.
                      </p>
                      <button
                        className="btn-secondary"
                        disabled={busy || notes.trim().length < 3}
                        onClick={continueTeacherDiscussion}
                      >
                        <Send size={17} />
                        Ask teacher follow-up
                      </button>
                      <button
                        className="btn-primary"
                        disabled={busy || notes.trim().length < 3}
                        onClick={resolveAfterInvestigation}
                      >
                        Resolve from discussion
                      </button>
                      <button
                        className="btn-secondary"
                        disabled={busy || !meeting}
                        onClick={() => adminAction("schedule_meeting")}
                      >
                        <CalendarClock size={17} />
                        Schedule office meeting
                      </button>
                    </>
                  )}
                  {item.status === "meeting_scheduled" && (
                    <button
                      className="btn-primary"
                      disabled={
                        busy || !meetingFinished || notes.trim().length < 3
                      }
                      onClick={resolveAfterInvestigation}
                    >
                      Resolve after meeting
                    </button>
                  )}
                  {!["resolved", "dismissed", "escalated"].includes(
                    item.status,
                  ) && (
                    <button
                      className="btn-secondary text-red-700"
                      disabled={busy || notes.trim().length < 3}
                      onClick={() => adminAction("escalate")}
                    >
                      Escalate case
                    </button>
                  )}
                </div>
              </>
            )}
            {studentReplyDue && (
              <>
                <textarea
                  className="input mt-4 min-h-32"
                  placeholder="Reply to the administrator's clarification"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <button
                  className="btn-primary mt-3 w-full"
                  disabled={busy || notes.trim().length < 3}
                  onClick={respond}
                >
                  <Send size={17} />
                  Send clarification
                </button>
              </>
            )}
            {isTeacher && item.status === "teacher_notified" && (
              <>
                <textarea
                  className="input mt-4 min-h-32"
                  placeholder="Explain the facts and action taken"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <button
                  className="btn-primary mt-3 w-full"
                  disabled={busy || notes.trim().length < 3}
                  onClick={respond}
                >
                  <Send size={17} />
                  Submit response
                </button>
              </>
            )}
            {!isAdmin &&
              !studentReplyDue &&
              !(isTeacher && item.status === "teacher_notified") && (
                <p className="mt-3 text-sm text-slate-500">
                  The school office will notify you when a response or action is
                  needed.
                </p>
              )}
          </section>
        </aside>
      </div>
    </div>
  );
}
