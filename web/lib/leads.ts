// Free leads (GetLeads). The search itself runs in supabase/functions/leads.

/** Most leads in one list. No daily cap. Keep in sync with MAX_PER_REQUEST in supabase/functions/leads. */
export const LEAD_MAX = 5000;
export const LEAD_AMOUNTS = [100, 500, 1000, 2500, 5000];

export const LEAD_SENIORITY = [
  { v: 'c-level', l: 'C-level / Owner' },
  { v: 'vp', l: 'VP' },
  { v: 'director', l: 'Director' },
  { v: 'manager', l: 'Manager' },
  { v: 'senior', l: 'Senior' },
  { v: 'junior', l: 'Junior' },
];

export const LEAD_SIZES = ['1 to 10', '11 to 50', '51 to 200', '201 to 500', '501 to 1000', '1001 to 5000', '5001 to 10000', '10001+'];

export type LeadFilters = {
  job_titles: string[];
  exclude_job_titles: string[];
  seniority: string[];
  industries: string[];
  countries: string[];
  company_size: string[];
  keywords: string[];
};

export type LeadRequest = {
  id: string;
  summary: string;
  requested: number;
  status: 'running' | 'ready' | 'failed';
  rows: number;
  skipped: number;
  error: string | null;
  created_at: string;
};
