import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {emailConfigured,reportMailText,sendIssueReportEmail,type StoredIssueReport} from './report-notification';

const report:StoredIssueReport={
  reference:'ab12cd34-9876-4321-1234-000000000000',
  raceId:'FR-FFC-1234',raceName:'Course de la Paix Juniors',
  issueType:'Wrong date',description:'The official event page confirms a different start date.',
  proofUrl:'https://organizer.example.com/2027-calendar',
  receivedAt:'2026-11-09T20:00:00Z',status:'pending_review',emailStatus:'pending',
};
beforeEach(()=>{
  vi.stubEnv('ISSUE_REPORT_TO_EMAIL','recipient@example.com');
  vi.stubEnv('ISSUE_REPORT_FROM_EMAIL','Young Peloton <reports@youngpeloton.eu>');
  vi.stubEnv('RESEND_API_KEY','test-resend-key');
});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});

describe('Correction email delivery',()=>{
  it('puts race ID, report reference, evidence and correction in plain text',()=>{
    const body=reportMailText(report);
    expect(body).toContain(report.raceName);
    expect(body).toContain('https://www.youngpeloton.eu/race/FR-FFC-1234');
    expect(body).toContain(report.proofUrl);
    expect(body).toContain(report.reference);
    expect(body).toContain(report.description);
  });
  it('never attempts email if provider credential is unavailable',async()=>{
    vi.stubEnv('RESEND_API_KEY','');
    const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
    expect(emailConfigured()).toBe(false);
    expect(await sendIssueReportEmail(report)).toEqual({sent:false,reason:'not_configured'});
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('only marks success after provider returns a valid message ID',async()=>{
    const fetcher=vi.fn(async (_input:RequestInfo | URL, _options?:RequestInit)=>new Response(JSON.stringify({id:'email_123'}),{status:200}));
    vi.stubGlobal('fetch',fetcher);
    expect(await sendIssueReportEmail(report)).toEqual({sent:true,emailId:'email_123'});
    const [endpoint,options]=fetcher.mock.calls[0]!;
    expect(endpoint).toBe('https://api.resend.com/emails');
    expect((options?.headers as Record<string,string>)['Idempotency-Key']).toBe('yp-correction-'+report.reference);
    const payload=JSON.parse(String(options?.body));
    expect(payload.to).toEqual(['recipient@example.com']);
    expect(payload.text).toContain(report.proofUrl);
  });
  it('keeps unsent status when email provider rejects the request',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>new Response('Invalid domain',{status:403})));
    expect(await sendIssueReportEmail(report)).toEqual({sent:false,reason:'provider_error'});
  });
});
