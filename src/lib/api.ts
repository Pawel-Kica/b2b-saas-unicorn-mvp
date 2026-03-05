import type {
  Competitor,
  Lead,
  Outreach,
  Post,
  PostWithComments,
  FetchLeadsResponse,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || `API error: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Competitors
export const getCompetitors = (params?: { search?: string }) => {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  const query = qs.toString();
  return request<Competitor[]>(`/competitors/${query ? `?${query}` : ""}`);
};
export const getCompetitor = (id: number) => request<Competitor>(`/competitors/${id}/`);
export const createCompetitor = (data: { name: string; linkedin_url: string }) =>
  request<Competitor>("/competitors/", { method: "POST", body: JSON.stringify(data) });
export const deleteCompetitor = (id: number) =>
  request<void>(`/competitors/${id}/`, { method: "DELETE" });
export const fetchLeads = (id: number, params?: { max_posts?: number; max_comments?: number }) =>
  request<FetchLeadsResponse>(`/competitors/${id}/fetch_leads/`, {
    method: "POST",
    body: params ? JSON.stringify(params) : undefined,
  });
export const getCompetitorPosts = (id: number) =>
  request<PostWithComments[]>(`/competitors/${id}/posts/`);

// Leads
export const getLeads = (params?: { search?: string; ordering?: string; competitor?: string }) => {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.ordering) qs.set("ordering", params.ordering);
  if (params?.competitor) qs.set("competitor", params.competitor);
  const query = qs.toString();
  return request<Lead[]>(`/leads/${query ? `?${query}` : ""}`);
};
export const getLead = (id: number) => request<Lead>(`/leads/${id}/`);
export const deleteLead = (id: number) =>
  request<void>(`/leads/${id}/`, { method: "DELETE" });

export const enrichLead = (id: number) =>
  request<{ status: string; lead: Lead }>(`/leads/${id}/enrich/`, { method: "POST" }).then(r => r.lead);
export const updateLead = (id: number, data: Partial<Lead>) =>
  request<Lead>(`/leads/${id}/`, { method: "PATCH", body: JSON.stringify(data) });

// Outreach
export const createOutreach = (leadId: number, data: { method: string; status: string; date: string; notes?: string }) =>
  request<Outreach>(`/leads/${leadId}/outreach/`, { method: "POST", body: JSON.stringify(data) });
export const updateOutreach = (leadId: number, outreachId: number, data: Partial<Outreach>) =>
  request<Outreach>(`/leads/${leadId}/outreach/${outreachId}/`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteOutreach = (leadId: number, outreachId: number) =>
  request<void>(`/leads/${leadId}/outreach/${outreachId}/`, { method: "DELETE" });

// Posts
export const getPost = (id: number) => request<Post>(`/posts/${id}/`);
export const getPostPreview = (id: number) => request<PostWithComments>(`/posts/${id}/preview/`);
export const getPosts = (params?: { search?: string; ordering?: string; competitor?: string }) => {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.ordering) qs.set("ordering", params.ordering);
  if (params?.competitor) qs.set("competitor", params.competitor);
  const query = qs.toString();
  return request<Post[]>(`/posts/${query ? `?${query}` : ""}`);
};

