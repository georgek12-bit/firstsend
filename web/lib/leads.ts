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
  'SaaS', 'B2B', 'B2C', 'Software', 'Platform', 'AI', 'Machine learning', 'Automation', 'API', 'Cloud', 'Cybersecurity', 'Data', 'Analytics',
  'Fintech', 'Proptech', 'Healthtech', 'Edtech', 'Martech', 'Insurtech', 'Legaltech', 'HR tech', 'Logistics software', 'CRM', 'ERP', 'IT support', 'Managed services', 'MSP',
  // Commerce
  'E-commerce', 'Ecommerce', 'Shopify', 'WooCommerce', 'Amazon', 'DTC', 'Subscription', 'Marketplace', 'Retail', 'Wholesale', 'Manufacturing', 'Distribution',
  // Agencies and services
  'Agency', 'Marketing agency', 'Digital agency', 'Creative agency', 'SEO', 'PPC', 'Paid social', 'Google Ads', 'Facebook ads', 'Lead generation', 'Outbound', 'Cold email',
  'Web design', 'Branding', 'Content marketing', 'Social media', 'PR', 'Video production', 'Consultancy', 'Consulting', 'Coaching', 'Training', 'Outsourcing',
  'Recruitment', 'Staffing', 'Executive search', 'Accounting', 'Bookkeeping', 'Tax', 'Law firm', 'Legal services', 'Financial advice', 'Wealth management', 'Insurance broker', 'Mortgage',
  // Local and trades
  'Dental', 'Dentist', 'Invisalign', 'Implants', 'Cosmetic', 'Aesthetics', 'Clinic', 'Physiotherapy', 'Veterinary', 'Healthcare', 'Care home', 'Pharmacy',
  'Real estate', 'Estate agent', 'Property management', 'Construction', 'Roofing', 'Solar', 'HVAC', 'Plumbing', 'Electrical', 'Landscaping', 'Cleaning', 'Security',
  'Restaurant', 'Hospitality', 'Hotel', 'Gym', 'Fitness', 'Wellness', 'Salon', 'Events', 'Travel', 'Education', 'School', 'Nonprofit', 'Charity',
  'Logistics', 'Freight', 'Transport', 'Automotive', 'Energy', 'Renewables', 'Engineering', 'Architecture', 'Interior design', 'Printing', 'Packaging',
  // Stage
  'Startup', 'Scale-up', 'Venture-backed', 'Family-owned', 'Franchise', 'Enterprise', 'SME', 'Small business',
];
