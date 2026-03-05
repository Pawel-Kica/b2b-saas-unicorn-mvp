export interface Competitor {
  id: number;
  name: string;
  linkedin_url: string;
  post_count: number;
  lead_count: number;
}

export interface Comment {
  id: number;
  comment_text: string | null;
  comment_url: string | null;
  commented_at: string | null;
  post_content: string;
  post_url: string;
  created_at: string;
}

export interface Outreach {
  id: number;
  lead: number;
  method: "email" | "linkedin";
  status: "pending" | "no_reply" | "interested" | "not_interested";
  date: string;
  notes: string;
  created_at: string;
}

export interface Lead {
  id: number;
  full_name: string;
  linkedin_profile: string;
  company: string | null;
  headline: string | null;
  picture_url: string | null;
  email: string | null;
  job_title: string | null;
  followers: number | null;
  connections: number | null;
  company_website: string | null;
  country: string | null;
  comments: Comment[];
  outreach_records: Outreach[];
  competitors: string[];
}

export interface Post {
  id: number;
  post_id: string;
  competitor: number;
  competitor_name: string;
  content: string;
  url: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  images: string[];
  lead_count: number;
}

export interface FetchLeadsResponse {
  status: string;
  stats: { posts: number; leads: number; comments: number };
}

export interface TestScrapeResponse {
  status: string;
  items: unknown[];
}

export interface PostComment {
  id: number;
  comment_text: string | null;
  comment_url: string | null;
  commented_at: string | null;
  lead_id: number;
  lead_name: string;
  lead_picture: string | null;
  lead_headline: string | null;
  lead_linkedin: string;
}

export interface PostWithComments extends Post {
  post_comments: PostComment[];
}
