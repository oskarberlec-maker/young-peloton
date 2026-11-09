/** Email an evidence-backed race correction from a server-side Vercel route.
 * Public submissions contain untrusted text and are never allowed to select
 * the recipient or email sender. Resend API credentials stay server-side.
 */
import type { ValidReport } from './issue-report';

export type StoredIssueReport = ValidReport & {
  reference:string;
  receivedAt:string;
  status:'pending_review';
  emailStatus:'pending'|'sent';
  emailAttemptedAt?:string;
  emailSentAt?:string;
  emailId?:string;
};

export const EMAIL_SENDER_DOMAIN = 'youngpeloton.eu';

export function reportMailText(report:StoredIssueReport):string {
  const raceLink=report.raceId
    ? 'https://www.youngpeloton.eu/race/'+encodeURIComponent(report.raceId)
    : 'Not supplied';
  return [
    'A visitor reported a possible error in Young Peloton race data.',
    'Please check the submitted evidence before changing the calendar.',
    '',
    'Race: '+report.raceName,
    'Race ID: '+(report.raceId||'Not supplied'),
    'Race page: '+raceLink,
    'Issue type: '+report.issueType,
    '',
    'Suggested correction:',
    report.description,
    '',
    'Evidence URL (visitor-supplied, not verified):',
    report.proofUrl,
    '',
    'Submitted: '+report.receivedAt,
    'Report reference: '+report.reference,
    'Review status: pending',
    '',
    'This is an automated notification. Do not change race data without confirming the source.',
  ].join('\n');
}

export function emailConfigured():boolean {
  return Boolean(process.env['RESEND_API_KEY']
    && process.env['ISSUE_REPORT_TO_EMAIL']
    && process.env['ISSUE_REPORT_FROM_EMAIL']);
}
export type EmailResult={sent:true;emailId:string}|{sent:false;reason:'not_configured'|'provider_error'|'network_error'};

export async function sendIssueReportEmail(report:StoredIssueReport):Promise<EmailResult> {
  const key=process.env['RESEND_API_KEY'];
  const to=process.env['ISSUE_REPORT_TO_EMAIL'];
  const from=process.env['ISSUE_REPORT_FROM_EMAIL'];
  if(!key||!to||!from) return {sent:false,reason:'not_configured'};
  const subject='[Young Peloton] Correction: '+report.raceName.replace(/[\r\n\t]/g,' ').slice(0,100);
  try{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),10000);
    let response:Response;
    try{
      response=await fetch('https://api.resend.com/emails',{
        method:'POST',
        headers:{
          'Authorization':'Bearer '+key,
          'Content-Type':'application/json',
          'Idempotency-Key':'yp-correction-'+report.reference,
        },
        body:JSON.stringify({
          from,to:[to],
          subject,
          text:reportMailText(report),
        }),
        signal:controller.signal,
      });
    }finally{clearTimeout(timer);}
    if(!response.ok) return {sent:false,reason:'provider_error'};
    const parsed=await response.json() as {id?:unknown};
    if(typeof parsed.id!=='string'||!parsed.id)return {sent:false,reason:'provider_error'};
    return {sent:true,emailId:parsed.id};
  }catch{
    return {sent:false,reason:'network_error'};
  }
}
