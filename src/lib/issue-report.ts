/** Anonymous, evidence-backed correction reports. No account or email required. */
export const REPORT_TYPES = [
  'Wrong date', 'Wrong category / eligibility', 'Wrong race level',
  'Wrong location', 'Cancelled or missing race', 'Incorrect source', 'Other',
] as const;
export type ReportType = typeof REPORT_TYPES[number];
export type ReportInput = {
  raceId: string;
  raceName: string;
  issueType: ReportType;
  description: string;
  proofUrl: string;
  website?: string;
  startedAt: number;
};
export type ValidReport = Omit<ReportInput,'website'|'startedAt'>;

function isPublicEvidenceUrl(raw: string) {
  if (typeof raw !== 'string' || raw.length > 1500 || !/^https:\/\//i.test(raw)) return false;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password ||
        host === 'localhost' || host.endsWith('.localhost') ||
        host.endsWith('.local') || host.endsWith('.internal') ||
        host.endsWith('.invalid') || host.endsWith('.test') ||
        host === '0.0.0.0' || host === '[::1]' ||
        /^\d+\.\d+\.\d+\.\d+$/.test(host) || !host.includes('.')) return false;
    return true;
  } catch { return false; }
}
export function validateReport(raw: unknown, now = Date.now()): {value?:ValidReport;error?:string;spam?:boolean} {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {error:'Invalid report.'};
  const r = raw as Record<string,unknown>;
  if (typeof r['website'] === 'string' && r['website'].trim()) return {spam:true};
  if (typeof r['startedAt'] !== 'number' || now-r['startedAt'] < 2000 ||
      now-r['startedAt'] > 24*60*60*1000) return {error:'Please try submitting the report again.'};
  if (typeof r['raceId'] !== 'string' || r['raceId'].length > 180 ||
      /[<>\u0000-\u001f]/.test(r['raceId'])) return {error:'Invalid race ID.'};
  if (typeof r['raceName'] !== 'string' || r['raceName'].trim().length < 3 ||
      r['raceName'].length > 200) return {error:'Enter the name of the race.'};
  if (!REPORT_TYPES.includes(r['issueType'] as ReportType)) return {error:'Select the incorrect information.'};
  if (typeof r['description'] !== 'string' ||
      r['description'].trim().length < 12 || r['description'].length > 1800)
    return {error:'Describe what is incorrect and what should be changed (at least 12 characters).'};
  if (typeof r['proofUrl'] !== 'string' || !isPublicEvidenceUrl(r['proofUrl']))
    return {error:'A public HTTPS link proving the correction is required.'};
  return {value:{
    raceId:r['raceId'].trim(),raceName:r['raceName'].trim(),
    issueType:r['issueType'] as ReportType,
    description:r['description'].trim(),
    proofUrl:r['proofUrl'].trim(),
  }};
}
