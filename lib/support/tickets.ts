/**
 * Support tickets — threaded support between users and admins.
 *
 * Writes go through the service-role client; the calling route/page is
 * responsible for authorization (a user may only touch their own tickets;
 * admins may touch any). RLS provides defense-in-depth for direct reads.
 */

import { getSupabaseAdminClient } from "../supabase/admin";

export const TICKET_CATEGORIES = ["general", "billing", "technical", "account", "feature_request", "bug"] as const;
export const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const TICKET_STATUSES = ["open", "pending", "answered", "closed"] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export interface Attachment {
  name: string;
  key: string;
  size: number;
}

export interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  attachments: Attachment[];
  last_reply_at: string;
  created_at: string;
}

export interface TicketReply {
  id: string;
  ticket_id: string;
  author_id: string;
  author_role: string;
  author_email: string | null;
  body: string;
  attachments: Attachment[];
  created_at: string;
}

export interface TicketListRow extends Ticket {
  user_email: string | null;
  reply_count: number;
}

/** Create a ticket plus its opening message (stored as the first reply). */
export async function createTicket(
  userId: string,
  input: { subject: string; category: TicketCategory; priority: TicketPriority; body: string; attachments?: Attachment[] }
): Promise<string> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("support_tickets")
    .insert({
      user_id: userId,
      subject: input.subject,
      category: input.category,
      priority: input.priority,
      status: "open",
      attachments: input.attachments ?? [],
      last_reply_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "could not create ticket");

  await admin.from("support_ticket_replies").insert({
    ticket_id: data.id,
    author_id: userId,
    author_role: "user",
    body: input.body,
    attachments: input.attachments ?? [],
  });
  return data.id as string;
}

export async function listMyTickets(userId: string): Promise<Ticket[]> {
  const { data } = await getSupabaseAdminClient()
    .from("support_tickets")
    .select("*")
    .eq("user_id", userId)
    .order("last_reply_at", { ascending: false });
  return (data ?? []) as Ticket[];
}

export async function listAllTickets(status?: string): Promise<TicketListRow[]> {
  const admin = getSupabaseAdminClient();
  let q = admin
    .from("support_tickets")
    .select("*, profiles(email)")
    .order("last_reply_at", { ascending: false })
    .limit(200);
  if (status?.trim()) q = q.eq("status", status.trim());
  const { data } = await q;
  return ((data ?? []) as unknown as Array<Record<string, unknown> & { profiles: { email: string } | { email: string }[] | null }>).map((r) => {
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      id: r.id as string,
      user_id: r.user_id as string,
      user_email: p?.email ?? null,
      subject: r.subject as string,
      category: r.category as string,
      priority: r.priority as string,
      status: r.status as string,
      attachments: (r.attachments as Attachment[]) ?? [],
      last_reply_at: r.last_reply_at as string,
      created_at: r.created_at as string,
      reply_count: 0,
    };
  });
}

export async function getTicketWithReplies(ticketId: string): Promise<{ ticket: Ticket; replies: TicketReply[] } | null> {
  const admin = getSupabaseAdminClient();
  const { data: ticket } = await admin.from("support_tickets").select("*").eq("id", ticketId).single();
  if (!ticket) return null;

  const { data: replies } = await admin
    .from("support_ticket_replies")
    .select("*, profiles(email)")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  const mapped = ((replies ?? []) as unknown as Array<Record<string, unknown> & { profiles: { email: string } | { email: string }[] | null }>).map((r) => {
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      id: r.id as string,
      ticket_id: r.ticket_id as string,
      author_id: r.author_id as string,
      author_role: r.author_role as string,
      author_email: p?.email ?? null,
      body: r.body as string,
      attachments: (r.attachments as Attachment[]) ?? [],
      created_at: r.created_at as string,
    };
  });
  return { ticket: ticket as Ticket, replies: mapped };
}

/** Append a reply and advance status (admin reply → answered, user reply → open). */
export async function addReply(
  ticketId: string,
  authorId: string,
  authorRole: "user" | "admin",
  body: string,
  attachments?: Attachment[]
): Promise<void> {
  const admin = getSupabaseAdminClient();
  await admin.from("support_ticket_replies").insert({
    ticket_id: ticketId,
    author_id: authorId,
    author_role: authorRole,
    body,
    attachments: attachments ?? [],
  });
  await admin
    .from("support_tickets")
    .update({
      status: authorRole === "admin" ? "answered" : "open",
      last_reply_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);
}

export async function setTicketStatus(ticketId: string, status: TicketStatus): Promise<void> {
  await getSupabaseAdminClient()
    .from("support_tickets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", ticketId);
}
