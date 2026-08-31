import { supabase } from "../lib/supabase";
import type { Complaint, ComplaintPriority, ComplaintStatus } from "../types";

const details =
  "*, category:complaint_categories(*), location:locations(*), reporter:profiles!complaints_reporter_id_fkey(id,full_name,student_id,email,contact_number,account_type,avatar_url), assigned_staff:profiles!complaints_assigned_staff_id_fkey(id,full_name,specialization)";
export const complaintService = {
  list: async () =>
    supabase
      .from("complaints")
      .select(details)
      .order("submitted_at", { ascending: false }),
  get: async (id: string) =>
    supabase.from("complaints").select(details).eq("id", id).single(),
  create: async (input: {
    reporter_id: string;
    title: string;
    description: string;
    category_id: string;
    other_category: string | null;
    location_id: string;
    priority?: ComplaintPriority;
  }) => supabase.from("complaints").insert(input).select().single(),
  updatePriority: async (id: string, priority: ComplaintPriority) =>
    supabase.rpc("set_maintenance_complaint_priority", {
      p_complaint_id: id,
      p_priority: priority,
    }),
  updateStatus: async (
    id: string,
    status: ComplaintStatus,
    fields: Partial<Complaint> = {},
  ) =>
    supabase
      .from("complaints")
      .update({ status, ...fields })
      .eq("id", id)
      .select()
      .single(),
  assign: async (
    complaintId: string,
    staffId: string,
    assignedBy: string,
    notes: string,
  ) => {
    const result = await supabase
      .from("maintenance_assignments")
      .insert({
        complaint_id: complaintId,
        staff_id: staffId,
        assigned_by: assignedBy,
        assignment_notes: notes,
      });
    if (!result.error)
      await supabase
        .from("complaints")
        .update({ assigned_staff_id: staffId, status: "assigned" })
        .eq("id", complaintId);
    return result;
  },
  categories: async () =>
    supabase
      .from("complaint_categories")
      .select("*")
      .eq("is_active", true)
      .order("name"),
  locations: async () =>
    supabase
      .from("locations")
      .select("*")
      .eq("is_active", true)
      .order("building")
      .order("room"),
};
