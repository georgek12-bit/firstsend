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

/** Suggestions for the job title box. Anything else can still be typed. */
export const LEAD_TITLES = [
  'Founder', 'Co-Founder', 'CEO', 'Owner', 'Managing Director', 'Director', 'Partner', 'President', 'General Manager',
  'COO', 'CFO', 'CTO', 'CMO', 'CRO', 'Chief Revenue Officer', 'Chief Marketing Officer',
  'Head of Sales', 'Sales Director', 'VP Sales', 'Sales Manager', 'Business Development Manager', 'Head of Business Development',
  'Head of Marketing', 'Marketing Director', 'VP Marketing', 'Marketing Manager', 'Growth Manager', 'Head of Growth',
  'Demand Generation Manager', 'Head of Partnerships', 'Account Executive',
  'Head of Operations', 'Operations Director', 'Operations Manager',
  'Head of People', 'HR Director', 'HR Manager', 'Talent Acquisition Manager', 'Recruitment Manager',
  'Head of Finance', 'Finance Director', 'Financial Controller',
  'Head of IT', 'IT Director', 'IT Manager', 'Head of Engineering', 'VP Engineering', 'Engineering Manager',
  'Head of Product', 'Product Manager', 'Head of Customer Success', 'Customer Success Manager',
  'Practice Manager', 'Clinic Owner', 'Agency Owner', 'Store Owner', 'E-commerce Manager', 'Procurement Manager',
];

export const LEAD_EXCLUDE_TITLES = ['Intern', 'Assistant', 'Student', 'Freelance', 'Consultant', 'Advisor', 'Board Member', 'Investor', 'Volunteer', 'Retired', 'Junior', 'Trainee'];

/**
 * Suggestions for the keywords box: words that often appear in company descriptions.
 * Not a fixed list on GetLeads' side, so anything typed works too.
 */
export const LEAD_KEYWORDS = [
  // Software and tech
  'SaaS', 'B2B', 'B2C', 'software', 'platform', 'AI', 'machine learning', 'automation', 'API', 'cloud', 'cybersecurity', 'data', 'analytics',
  'fintech', 'proptech', 'healthtech', 'edtech', 'martech', 'insurtech', 'legaltech', 'HR tech', 'logistics software', 'CRM', 'ERP', 'IT support', 'managed services', 'MSP',
  // Commerce
  'e-commerce', 'ecommerce', 'Shopify', 'WooCommerce', 'Amazon', 'DTC', 'subscription', 'marketplace', 'retail', 'wholesale', 'manufacturing', 'distribution',
  // Agencies and services
  'agency', 'marketing agency', 'digital agency', 'creative agency', 'SEO', 'PPC', 'paid social', 'Google Ads', 'Facebook ads', 'lead generation', 'outbound', 'cold email',
  'web design', 'branding', 'content marketing', 'social media', 'PR', 'video production', 'consultancy', 'consulting', 'coaching', 'training', 'outsourcing',
  'recruitment', 'staffing', 'executive search', 'accounting', 'bookkeeping', 'tax', 'law firm', 'legal services', 'financial advice', 'wealth management', 'insurance broker', 'mortgage',
  // Local and trades
  'dental', 'dentist', 'Invisalign', 'implants', 'cosmetic', 'aesthetics', 'clinic', 'physiotherapy', 'veterinary', 'healthcare', 'care home', 'pharmacy',
  'real estate', 'estate agent', 'property management', 'construction', 'roofing', 'solar', 'HVAC', 'plumbing', 'electrical', 'landscaping', 'cleaning', 'security',
  'restaurant', 'hospitality', 'hotel', 'gym', 'fitness', 'wellness', 'salon', 'events', 'travel', 'education', 'school', 'nonprofit', 'charity',
  'logistics', 'freight', 'transport', 'automotive', 'energy', 'renewables', 'engineering', 'architecture', 'interior design', 'printing', 'packaging',
  // Stage
  'startup', 'scale-up', 'venture-backed', 'family-owned', 'franchise', 'enterprise', 'SME', 'small business',
];
