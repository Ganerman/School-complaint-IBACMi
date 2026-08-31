import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  MapPin,
  MessageSquare,
  Upload,
  XCircle,
} from "lucide-react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { PriorityBadge, StatusBadge } from "../../components/common/Badge";
import { ErrorState, LoadingScreen } from "../../components/common/States";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import { complaintService } from "../../services/complaintService";
import {
  deleteComplaintPhoto,
  signedPhotoUrl,
  uploadComplaintPhoto,
} from "../../services/storageService";
import type {
  Complaint,
  ComplaintPhoto,
  ComplaintPriority,
  ComplaintStatus,
  ComplaintStatusHistory,
  Feedback,
  Profile,
} from "../../types";
import { formatDate, humanize, slaText } from "../../utils/format";
const nextByRole: {
  [k: string]: { label: string; status: ComplaintStatus }[];
} = {
  admin: [
    { label: "Start review", status: "under_review" },
    { label: "Verify", status: "verified" },
    { label: "Reject", status: "rejected" },
    { label: "Close", status: "closed" },
  ],
  maintenance: [{ label: "Start work", status: "in_progress" }],
  student: [{ label: "Reopen complaint", status: "reopened" }],
};
export function ComplaintDetailPage() {
  const { id } = useParams();
  const { profile, user } = useAuth();
  const [item, setItem] = useState<Complaint | null>(null);
  const [history, setHistory] = useState<ComplaintStatusHistory[]>([]);
  const [photos, setPhotos] = useState<ComplaintPhoto[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [workflowAction, setWorkflowAction] = useState<
    "resolved" | "not_resolved" | ""
  >("");
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState("");
  const [uploadingType, setUploadingType] = useState<
    "progress" | "after" | null
  >(null);
  const [uploadError, setUploadError] = useState("");
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!id) return;
    const [{ data, error }, { data: h }, { data: p }, { data: f }] =
      await Promise.all([
        complaintService.get(id),
        supabase
          .from("complaint_status_history")
          .select("*")
          .eq("complaint_id", id)
          .order("created_at"),
        supabase
          .from("complaint_photos")
          .select("*")
          .eq("complaint_id", id)
          .order("created_at"),
        supabase
          .from("feedback")
          .select("*")
          .eq("complaint_id", id)
          .maybeSingle(),
      ]);
    if (error) {
      setError(
        "This complaint is unavailable or you do not have permission to view it.",
      );
      setLoading(false);
      return;
    }
    setItem(data as unknown as Complaint);
    setHistory((h || []) as ComplaintStatusHistory[]);
    setFeedback(f as Feedback | null);
    const resolved = await Promise.all(
      ((p || []) as ComplaintPhoto[]).map(async (x) => ({
        ...x,
        signed_url: (await signedPhotoUrl(x.storage_path)).data?.signedUrl,
      })),
    );
    setPhotos(resolved);
    setLoading(false);
  }, [id]);
  useEffect(() => {
    void load();
    if (profile?.role === "admin")
      void supabase
        .from("profiles")
        .select("*")
        .eq("role", "maintenance")
        .eq("account_status", "active")
        .then(({ data }) => setStaff((data || []) as Profile[]));
  }, [load, profile?.role]);
  if (loading) return <LoadingScreen />;
  if (error || !item)
    return <ErrorState message={error || "Complaint not found."} />;
  const hasAfterPhoto = photos.some((photo) => photo.photo_type === "after");
  const allowed = (status: ComplaintStatus) => {
    const s = item.status;
    if (profile?.role === "admin")
      return (
        (status === "under_review" && s === "submitted") ||
        (status === "verified" && s === "under_review") ||
        (status === "rejected" && s === "under_review") ||
        (status === "closed" && s === "resolved")
      );
    if (profile?.role === "maintenance")
      return (
        (status === "in_progress" &&
          ["assigned", "waiting_for_materials", "reopened"].includes(s)) ||
        (status === "waiting_for_materials" && s === "in_progress") ||
        (status === "resolved" && s === "in_progress")
      );
    return status === "reopened" && ["resolved", "closed"].includes(s);
  };
  async function change(status: ComplaintStatus) {
    const fields: Partial<Complaint> = {};
    if (status === "resolved") {
      if (!hasAfterPhoto)
        return toast.error("Upload an after-repair photo first.");
      if (!notes.trim())
        return toast.error("Describe the completed repair first.");
      fields.resolution_details = notes.trim();
    }
    if (status === "waiting_for_materials") {
      if (!notes.trim())
        return toast.error("Explain why the repair is not resolved.");
      fields.maintenance_notes = notes.trim();
    }
    if (status === "rejected") fields.rejection_reason = notes;
    const { error } = await complaintService.updateStatus(
      item!.id,
      status,
      fields,
    );
    if (error)
      return toast.error(
        status === "resolved"
          ? "An after photo and resolution details are required."
          : status === "waiting_for_materials"
            ? "A maintenance comment is required."
            : "That status change is not permitted.",
      );
    toast.success(
      status === "waiting_for_materials"
        ? "Update sent to the administrator."
        : `Complaint marked ${humanize(status)}.`,
    );
    setNotes("");
    setWorkflowAction("");
    void load();
  }
  async function submitMaintenanceAction() {
    if (workflowAction === "resolved") return change("resolved");
    if (workflowAction === "not_resolved")
      return change("waiting_for_materials");
    toast.error("Choose a workflow action first.");
  }
  async function assign(staffId: string) {
    if (!staffId || !profile) return;
    const { error } = await complaintService.assign(
      item!.id,
      staffId,
      profile.id,
      notes,
    );
    if (error) return toast.error("Unable to assign staff.");
    toast.success("Maintenance staff assigned.");
    void load();
  }
  async function updatePriority(priority: ComplaintPriority) {
    const { error } = await complaintService.updatePriority(item!.id, priority);
    if (error) {
      console.error("Priority update failed", error);
      return toast.error(error.message || "Unable to update complaint priority.");
    }
    toast.success("Priority updated.");
    void load();
  }
  async function upload(file?: File, type: "progress" | "after" = "progress") {
    if (!file || !user) return;
    setUploadingType(type);
    setUploadError("");
    try {
      const { error } = await uploadComplaintPhoto(
        file,
        item!.id,
        user.id,
        type,
      );
      if (error) {
        setUploadError(
          "Upload failed. Check your connection and try the photo again.",
        );
        return toast.error("Photo upload failed. Please try again.");
      }
      toast.success(
        type === "after"
          ? "After-repair photo uploaded successfully."
          : "Progress photo uploaded successfully.",
      );
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Photo upload failed.";
      setUploadError(message);
      toast.error(message);
    } finally {
      setUploadingType(null);
    }
  }
  async function removePhoto(photo: ComplaintPhoto) {
    if (!confirm(`Remove this ${photo.photo_type} photo?`)) return;
    setDeletingPhotoId(photo.id);
    const { error } = await deleteComplaintPhoto(photo.id, photo.storage_path);
    setDeletingPhotoId(null);
    if (error)
      return toast.error(
        "Photo could not be removed. Apply the latest Supabase SQL update and try again.",
      );
    toast.success("Photo removed.");
    await load();
  }
  async function submitFeedback() {
    if (!user) return;
    const { error } = await supabase
      .from("feedback")
      .insert({ complaint_id: item!.id, user_id: user.id, rating, comments });
    if (error) return toast.error("Feedback could not be submitted.");
    toast.success("Thank you for your feedback.");
    void load();
  }
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-forest-600">
            {item.complaint_number}
          </p>
          <h1 className="display mt-1 text-4xl">{item.title}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <PriorityBadge priority={item.priority} />
            <StatusBadge status={item.status} />
          </div>
        </div>
        <div className="rounded-xl border bg-white p-3 text-sm">
          <span className="flex items-center gap-2 font-semibold">
            <Clock3 size={17} />
            {slaText(item.sla_deadline, item.status)}
          </span>
          <small className="mt-1 block text-slate-400">
            {formatDate(item.sla_deadline)}
          </small>
        </div>
      </div>
      <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="font-bold">Complaint details</h2>
            <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-600">
              {item.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-5 border-t pt-5 text-sm text-slate-500">
              <span className="flex gap-2">
                <MapPin size={18} />
                {item.location?.building} {item.location?.floor}{" "}
                {item.location?.room}
              </span>
              <span>
                Category:{" "}
                <b>
                  {item.category?.name === "Other" && item.other_category
                    ? `Other — ${item.other_category}`
                    : item.category?.name || "—"}
                </b>
              </span>
              <span>Submitted: {formatDate(item.submitted_at)}</span>
            </div>
            {item.maintenance_notes && profile?.role !== "student" && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <b className="text-amber-900">Maintenance update</b>
                <p className="mt-1 whitespace-pre-wrap text-sm text-amber-800">
                  {item.maintenance_notes}
                </p>
              </div>
            )}
            {item.resolution_details && (
              <div className="mt-5 rounded-xl border border-forest-100 bg-forest-50 p-4">
                <b className="text-forest-800">Resolution</b>
                <p className="mt-1 text-sm text-forest-700">
                  {item.resolution_details}
                </p>
              </div>
            )}
            {item.rejection_reason && (
              <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                <b>Reason for rejection:</b> {item.rejection_reason}
              </div>
            )}
          </section>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">Photo evidence</h2>
              {profile?.role === "admin" && (
                <span className="rounded-full bg-forest-50 px-3 py-1 text-xs font-semibold text-forest-700">
                  {photos.length} evidence file{photos.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            {photos.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {photos.map((p) => (
                  <figure className="card relative overflow-hidden" key={p.id}>
                    {profile?.role === "maintenance" &&
                      p.uploaded_by === user?.id &&
                      [
                        "assigned",
                        "in_progress",
                        "waiting_for_materials",
                        "reopened",
                      ].includes(item.status) && (
                        <button
                          type="button"
                          className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-red-600 text-white shadow-lg transition hover:bg-red-700"
                          onClick={() => removePhoto(p)}
                          disabled={deletingPhotoId === p.id}
                          aria-label={`Remove ${p.photo_type} photo`}
                          title="Remove wrong photo"
                        >
                          <XCircle size={22} />
                        </button>
                      )}
                    {p.signed_url ? (
                      <a
                        href={p.signed_url}
                        target="_blank"
                        rel="noreferrer"
                        title="Open full-size evidence"
                      >
                        <img
                          className="h-64 w-full object-cover transition hover:opacity-90"
                          src={p.signed_url}
                          alt={`${p.photo_type} evidence`}
                        />
                      </a>
                    ) : (
                      <div className="grid h-64 place-items-center bg-slate-100 text-sm text-slate-500">
                        Private photo could not be loaded
                      </div>
                    )}
                    <figcaption className="flex items-center justify-between gap-3 p-3 text-sm font-semibold">
                      <span>{humanize(p.photo_type)} photo</span>
                      <span className="font-normal text-slate-400">
                        {deletingPhotoId === p.id
                          ? "Removing…"
                          : formatDate(p.created_at)}
                      </span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <div className="card grid place-items-center px-5 py-10 text-center">
                <p className="text-sm font-semibold text-slate-600">
                  No photo evidence attached
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Uploaded before, progress, and after photos will appear here.
                </p>
              </div>
            )}
          </section>
          {profile?.role === "maintenance" && (
            <section className="card p-6">
              <h2 className="font-bold">Upload repair evidence</h2>
              <p className="mt-1 text-sm text-slate-500">
                Upload progress photos while working. An after-repair photo is
                required before completion.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {(["progress", "after"] as const).map((type) => (
                  <label
                    key={type}
                    className={`btn-secondary cursor-pointer ${uploadingType ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <Upload size={17} />
                    {uploadingType === type
                      ? "Uploading…"
                      : `Upload ${type} photo`}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={uploadingType !== null}
                      onChange={(e) => {
                        void upload(e.target.files?.[0], type);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                ))}
              </div>
              <p
                className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-sm font-semibold ${hasAfterPhoto ? "bg-forest-50 text-forest-700" : "bg-red-50 text-red-700"}`}
              >
                {hasAfterPhoto ? (
                  <CheckCircle2 size={19} />
                ) : (
                  <XCircle size={19} />
                )}
                After-repair photo:{" "}
                {hasAfterPhoto ? "successfully uploaded" : "not uploaded yet"}
              </p>
              {uploadError && (
                <p
                  role="alert"
                  className="mt-2 flex items-center gap-2 text-sm font-medium text-red-600"
                >
                  <XCircle size={17} />
                  {uploadError}
                </p>
              )}
            </section>
          )}
          {profile?.role === "student" &&
            ["resolved", "closed"].includes(item.status) &&
            !feedback && (
              <section className="card p-6">
                <h2 className="font-bold">Rate this resolution</h2>
                <div className="mt-4 flex gap-2">
                  {[1, 2, 3, 4, 5].map((x) => (
                    <button
                      className={`h-10 w-10 rounded-full ${rating === x ? "bg-amber-400 font-bold" : "bg-slate-100"}`}
                      onClick={() => setRating(x)}
                      key={x}
                    >
                      {x}
                    </button>
                  ))}
                </div>
                <textarea
                  className="input mt-4"
                  placeholder="Optional comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                />
                <button className="btn-primary mt-3" onClick={submitFeedback}>
                  Submit feedback
                </button>
              </section>
            )}
        </div>
        <aside className="space-y-5">
          <section className="card p-5">
            <h2 className="font-bold">Workflow actions</h2>
            {profile?.role === "maintenance" &&
              ["assigned", "in_progress", "waiting_for_materials", "reopened"].includes(item.status) && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <label className="label" htmlFor="maintenance-priority">
                    Assess complaint priority
                  </label>
                  <select
                    id="maintenance-priority"
                    className="input"
                    value={item.priority}
                    onChange={(e) => void updatePriority(e.target.value as ComplaintPriority)}
                  >
                    <option value="low">Low — minor issue</option>
                    <option value="medium">Medium — affects normal use</option>
                    <option value="high">High — significant disruption or risk</option>
                    <option value="emergency">Emergency — immediate safety risk</option>
                  </select>
                  <p className="mt-1 text-xs text-amber-800">
                    Set the urgency based on the actual facility risk.
                  </p>
                </div>
              )}
            {profile?.role === "admin" &&
              ["verified", "reopened"].includes(item.status) && (
                <div className="mt-4">
                  <label className="label">Assign maintenance staff</label>
                  <select
                    className="input"
                    defaultValue=""
                    onChange={(e) => assign(e.target.value)}
                  >
                    <option value="">Choose staff member</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} · {s.specialization || "General"}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            {profile?.role === "maintenance" &&
            item.status === "in_progress" ? (
              <div className="mt-4">
                <label className="label" htmlFor="maintenance-action">
                  Choose action
                </label>
                <select
                  id="maintenance-action"
                  className="input"
                  value={workflowAction}
                  onChange={(e) => {
                    setWorkflowAction(e.target.value as typeof workflowAction);
                    setNotes("");
                  }}
                >
                  <option value="">Select workflow action</option>
                  <option value="resolved">Resolved</option>
                  <option value="not_resolved">Not resolved</option>
                </select>
                {workflowAction && (
                  <textarea
                    className="input mt-4"
                    aria-label={
                      workflowAction === "resolved"
                        ? "Resolution description"
                        : "Not resolved explanation"
                    }
                    placeholder={
                      workflowAction === "resolved"
                        ? "Describe the completed repair (required)"
                        : "Explain the problem and why it is not resolved (required)"
                    }
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                )}{" "}
                {workflowAction === "resolved" && (
                  <div className="mt-3 space-y-2 rounded-xl border bg-slate-50 p-3">
                    <p
                      className={`flex items-center gap-2 text-sm font-semibold ${hasAfterPhoto ? "text-forest-700" : "text-red-700"}`}
                    >
                      {hasAfterPhoto ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <XCircle size={18} />
                      )}
                      After-repair photo{" "}
                      {hasAfterPhoto ? "uploaded" : "not uploaded"}
                    </p>
                    <p
                      className={`flex items-center gap-2 text-sm font-semibold ${notes.trim() ? "text-forest-700" : "text-red-700"}`}
                    >
                      {notes.trim() ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <XCircle size={18} />
                      )}
                      Resolution description{" "}
                      {notes.trim() ? "added" : "required"}
                    </p>
                    {!hasAfterPhoto && (
                      <label
                        className={`btn-secondary mt-2 w-full cursor-pointer ${uploadingType ? "pointer-events-none opacity-60" : ""}`}
                      >
                        <Upload size={17} />
                        {uploadingType === "after"
                          ? "Uploading after photo…"
                          : "Try upload after photo"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          disabled={uploadingType !== null}
                          onChange={(e) => {
                            void upload(e.target.files?.[0], "after");
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>
                    )}
                    {uploadError && (
                      <p
                        role="alert"
                        className="text-xs font-medium text-red-600"
                      >
                        {uploadError}
                      </p>
                    )}
                  </div>
                )}
                {workflowAction && (
                  <button
                    className="btn-primary mt-3 w-full"
                    disabled={
                      !notes.trim() ||
                      (workflowAction === "resolved" && !hasAfterPhoto)
                    }
                    onClick={() => void submitMaintenanceAction()}
                  >
                    {workflowAction === "resolved"
                      ? "Mark resolved"
                      : "Submit not resolved"}
                  </button>
                )}
              </div>
            ) : (
              <>
                {profile?.role !== "maintenance" && (
                  <textarea
                    className="input mt-4"
                    aria-label="Workflow notes"
                    placeholder="Notes / resolution / rejection reason"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                )}
                <div className="mt-3 grid gap-2">
                  {nextByRole[profile?.role || "student"]
                    .filter((x) => allowed(x.status))
                    .map((x) => (
                      <button
                        key={x.status}
                        className="btn-primary"
                        onClick={() => change(x.status)}
                      >
                        {x.label}
                      </button>
                    ))}
                </div>
              </>
            )}
          </section>
          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-bold">
              <MessageSquare size={18} />
              Status timeline
            </h2>
            <div className="mt-5 space-y-0">
              {history.map((h, i) => (
                <div
                  className="relative border-l-2 border-slate-100 pb-5 pl-5 last:pb-0"
                  key={h.id}
                >
                  <i
                    className={`absolute -left-[7px] top-0 h-3 w-3 rounded-full ${i === history.length - 1 ? "bg-amber-400" : "bg-forest-600"}`}
                  />
                  <b className="block text-sm">{humanize(h.new_status)}</b>
                  <small className="text-slate-400">
                    {formatDate(h.created_at)}
                  </small>
                  {h.notes && (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-slate-500">
                      {h.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
