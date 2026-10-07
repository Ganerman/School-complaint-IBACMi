import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { complaintService } from "../../services/complaintService";
import { useAuth } from "../../hooks/useAuth";
import type { ComplaintCategory, Location } from "../../types";
import { friendlyError } from "../../utils/errors";
import { useComplaintDraft } from "../../hooks/useComplaintDraft";
import { LoadingScreen } from "../../components/common/States";
import { useComplaintPhotos } from "../../hooks/useComplaintPhotos";
import { ComplaintPhotoPicker } from "../../components/complaints/ComplaintPhotoUpload";

export function NewComplaintPage() {
  const { user } = useAuth();
  return user ? <ComplaintForm key={user.id} userId={user.id} /> : <LoadingScreen />;
}

function ComplaintForm({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<ComplaintCategory[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const photoQueue = useComplaintPhotos();
  const [savedComplaint, setSavedComplaint] = useState<{ id: string; number: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const { form, setForm, clearDraft, restored, unavailable, hasDraft } = useComplaintDraft(userId);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [optionsAttempt, setOptionsAttempt] = useState(0);
  const [submitError, setSubmitError] = useState("");
  const submitting = useRef(false);

  useEffect(() => {
    let active = true;
    setOptionsLoading(true);
    setOptionsError("");
    async function loadOptions() {
      try {
        const [categoryResult, locationResult] = await Promise.all([
          complaintService.categories(), complaintService.locations(),
        ]);
        if (categoryResult.error) throw categoryResult.error;
        if (locationResult.error) throw locationResult.error;
        if (!active) return;
        setCategories((categoryResult.data || []) as ComplaintCategory[]);
        setLocations((locationResult.data || []) as Location[]);
        if (!categoryResult.data?.length || !locationResult.data?.length) {
          setOptionsError("Complaint categories or locations are not available yet. Contact the school office, or try loading them again.");
        }
      } catch (error) {
        console.error("Complaint options could not be loaded", error);
        if (active) setOptionsError("We could not load the categories and locations. Check your connection and try again. You can keep writing below.");
      } finally {
        if (active) setOptionsLoading(false);
      }
    }
    void loadOptions();
    return () => { active = false; };
  }, [optionsAttempt]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === form.category_id),
    [categories, form.category_id],
  );
  const isOtherCategory = selectedCategory?.name.toLowerCase() === "other";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current || savedComplaint || optionsLoading || optionsError || photoQueue.preparing || photoQueue.uploading) return;
    setSubmitError("");
    if (!categories.some(category => category.id === form.category_id) ||
        !locations.some(location => location.id === form.location_id)) {
      setSubmitError("Please choose an available category and location before submitting.");
      return;
    }
    const title = form.title.trim();
    const description = form.description.trim();
    const otherCategory = form.other_category.trim();
    if (title.length < 3)
      return toast.error("Complaint title must contain at least 3 characters.");
    if (description.length < 10)
      return toast.error("Description must contain at least 10 characters.");
    if (isOtherCategory && otherCategory.length < 3)
      return toast.error(
        "Please specify the other category using at least 3 characters.",
      );

    submitting.current = true;
    setBusy(true);
    try {
      const { data, error } = await complaintService.create({
        reporter_id: userId,
        title,
        description,
        category_id: form.category_id,
        other_category: isOtherCategory ? otherCategory : null,
        location_id: form.location_id,
      });
      if (error) {
        console.error("Complaint submission failed", error);
        let constraintMessage =
          "Please check the complaint details and try again.";
        if (error.message.includes("complaints_title_check"))
          constraintMessage =
            "Complaint title must contain between 3 and 150 characters.";
        if (error.message.includes("complaints_description_check"))
          constraintMessage =
            "Description must contain between 10 and 2,000 characters.";
        if (error.message.includes("other complaint category"))
          constraintMessage =
            "Please specify the other category using at least 3 characters.";
        const messages: Record<string, string> = {
          "42501":
            "Your account cannot submit complaints right now. Please contact the school office for help.",
          "23502":
            "We could not save your complaint right now. Please try again later or contact the school office.",
          "23514": constraintMessage,
          "23503":
            "The selected category or location is no longer available. Reload the choices and select another one.",
          PGRST301: "Your login session has expired. Sign out and sign in again.",
        };
        setSubmitError(
          messages[error.code] ||
            friendlyError(
              error,
              "We could not submit your complaint. Check your connection and try again. Your entries are still here.",
            ),
        );
        if (error.code === "23503") setOptionsAttempt(attempt => attempt + 1);
        return;
      }
      if (!data) throw new Error("Complaint response was empty");
      setSavedComplaint({ id: data.id, number: data.complaint_number });
      clearDraft();
      toast.success("Complaint submitted successfully.");
      const complete = await photoQueue.uploadAll(data.id, userId, "before");
      if (complete) navigate(`/student/complaints/${data.id}`);
    } catch (error) {
      console.error("Complaint submission failed", error);
      setSubmitError(friendlyError(error, "We could not confirm your submission. Check My facility complaints before trying again to avoid a duplicate. Your entries are still here."));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  if (savedComplaint) {
    const pending = photoQueue.photos.some(photo => photo.status !== "uploaded");
    return <section className="card mx-auto max-w-3xl space-y-5 p-6 md:p-8">
      <div className="flex items-start gap-3"><CheckCircle2 className="mt-1 shrink-0 text-green-600" /><div><h1 className="display text-3xl">Complaint submitted</h1><p className="mt-2 text-sm text-slate-600">{savedComplaint.number} is saved. Upload or retry the remaining photos here.</p></div></div>
      <ComplaintPhotoPicker queue={photoQueue} disabled={busy} />
      <p className="text-sm text-slate-500">Keep this page open until uploads finish. You can also open this complaint later and add any missing photos.</p>
      <div className="flex flex-wrap gap-3">
        {pending && <button type="button" className="btn-primary" disabled={busy || photoQueue.uploading || photoQueue.preparing} onClick={() => void photoQueue.uploadAll(savedComplaint.id, userId, "before")}><RefreshCw size={16} />{photoQueue.uploading ? "Uploading photos…" : "Retry remaining photos"}</button>}
        <button type="button" className="btn-secondary" disabled={busy || photoQueue.uploading || photoQueue.preparing} onClick={() => navigate(`/student/complaints/${savedComplaint.id}`)}>View complaint</button>
      </div>
    </section>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-forest-600">
        Student report
      </p>
      <h1 className="display mt-1 text-4xl">Submit a complaint</h1>
      <p className="mt-2 text-slate-500">
        Give the maintenance team clear, specific information.
      </p>
      <form className="card mt-7 p-6 md:p-8" onSubmit={submit} aria-busy={busy}>
        <fieldset disabled={busy} className="grid min-w-0 gap-5">
          <legend className="sr-only">Complaint details</legend>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4 text-sm">
            <div>
              <p className="font-semibold text-slate-700">{unavailable ? "Draft saving is unavailable" : restored ? "Your draft has been restored" : hasDraft ? "Draft saved in this tab" : "Your writing will be saved in this tab"}</p>
              <p className="mt-1 text-xs text-slate-500">{unavailable ? "Keep this page open until you submit. Your browser could not save a draft." : "You can refresh or return to this form in the same tab. Photos must be selected again after leaving."}</p>
            </div>
            {(hasDraft || photoQueue.photos.length > 0) && <button type="button" className="btn-ghost btn-sm" disabled={photoQueue.preparing} onClick={() => { if (confirm("Discard this draft and the selected photos?")) { clearDraft(); photoQueue.clear(); setSubmitError(""); } }}>Discard draft</button>}
          </div>
          {optionsLoading && <p role="status" className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle size={16} className="animate-spin" />Loading categories and locations…</p>}
          {optionsError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="flex items-start gap-2"><AlertCircle size={18} className="shrink-0" />{optionsError}</p><button type="button" className="btn-secondary btn-sm mt-3" onClick={() => setOptionsAttempt(attempt => attempt + 1)}><RefreshCw size={15} />Retry loading choices</button></div>}
          <div>
            <label className="label" htmlFor="complaint-title">Complaint title</label>
            <input
              id="complaint-title"
              className="input"
              minLength={3}
              maxLength={150}
              required
              placeholder="e.g. Leaking pipe in second-floor restroom"
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
            />
            <small className="mt-1 block text-slate-400">3–150 characters</small>
          </div>
          <div>
            <label className="label" htmlFor="complaint-description">Description</label>
            <textarea
              id="complaint-description"
              className="input min-h-32 resize-y"
              minLength={10}
              maxLength={2000}
              required
              placeholder="Describe what you observed and when it started…"
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
            <small className="mt-1 block text-slate-400">
              At least 10 characters
            </small>
          </div>
          <div className="grid items-start gap-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="complaint-category">Category</label>
              <select
                id="complaint-category"
                disabled={optionsLoading || Boolean(optionsError)}
                className="input"
                required
                value={form.category_id}
                onChange={(event) =>
                  setForm({
                    ...form,
                    category_id: event.target.value,
                    other_category: "",
                  })
                }
              >
                <option value="">Select a category</option>
                {form.category_id && !selectedCategory && <option value={form.category_id} disabled>Previous category unavailable — select another</option>}
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {isOtherCategory && (
                <div className="mt-3">
                  <label className="label" htmlFor="other-category">
                    Specify other category
                  </label>
                  <input
                    id="other-category"
                    className="input"
                    required
                    autoFocus
                    minLength={3}
                    maxLength={100}
                    placeholder="e.g. School signage"
                    value={form.other_category}
                    onChange={(event) =>
                      setForm({ ...form, other_category: event.target.value })
                    }
                  />
                  <small className="mt-1 block text-slate-400">
                    Describe the type of facility concern.
                  </small>
                </div>
              )}
            </div>
            <div>
              <label className="label" htmlFor="complaint-location">Building / room</label>
              <select
                id="complaint-location"
                disabled={optionsLoading || Boolean(optionsError)}
                className="input"
                required
                value={form.location_id}
                onChange={(event) =>
                  setForm({ ...form, location_id: event.target.value })
                }
              >
                <option value="">Select a location</option>
                {form.location_id && !locations.some(location => location.id === form.location_id) && <option value={form.location_id} disabled>Previous location unavailable — select another</option>}
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.building} {location.floor && `· ${location.floor}`}{" "}
                    {location.room && `· ${location.room}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <b>Priority will be assessed by maintenance.</b>
            <p className="mt-1 text-amber-800">
              Please describe the problem and any safety risk clearly so the
              maintenance team can set the correct urgency.
            </p>
          </div>
          <div>
            <h2 className="label">Photo evidence <span className="font-normal text-slate-400">(optional)</span></h2>
            <ComplaintPhotoPicker queue={photoQueue} disabled={busy} />
          </div>
          {submitError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{submitError}</div>}
          <div className="flex flex-wrap justify-end gap-3 border-t pt-5">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
            <button className="btn-primary" disabled={busy || optionsLoading || Boolean(optionsError) || photoQueue.preparing}>
              {busy ? "Submitting…" : photoQueue.preparing ? "Preparing photos…" : "Submit complaint"}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
