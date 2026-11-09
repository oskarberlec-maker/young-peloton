import { createFileRoute } from '@tanstack/react-router';
import { get, list, put } from '@vercel/blob';
import { emailConfigured, sendIssueReportEmail, type StoredIssueReport } from '@/lib/report-notification';

const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{
  status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},
});

export const Route = createFileRoute('/api/report-mail-retry')({
  server:{handlers:{
    GET:async({request})=>{
      const secret=process.env['CRON_SECRET'];
      if(!secret||request.headers.get('authorization')!=='Bearer '+secret)
        return reply({error:'Unauthorized'},401);
      const token=process.env['BLOB_READ_WRITE_TOKEN'];
      if(!token||!emailConfigured())return reply({configured:false,pending:true},503);
      let scanned=0,attempted=0,sent=0,failures=0;
      let cursor:string|undefined;
      try {
        // Bounded by the function's execution limits. Later cron runs continue
        // unsent reports; a failure must never erase a saved correction.
        for(let page=0;page<5 && attempted<80;page++){
          const result=await list({
            token,prefix:'corrections/v1/',limit:100,
            ...(cursor?{cursor}:{}),
          });
          for(const blob of result.blobs){
            scanned++;
            const response=await get(blob.pathname,{token,access:'private'});
            if(!response?.stream||response.statusCode!==200)continue;
            const report=await new Response(response.stream).json() as Partial<StoredIssueReport>;
            if(report.emailStatus!=='pending'||
              typeof report.reference!=='string'||typeof report.raceName!=='string'||
              typeof report.proofUrl!=='string'||typeof report.receivedAt!=='string')continue;
            attempted++;
            const submitted=await sendIssueReportEmail(report as StoredIssueReport);
            if(!submitted.sent){failures++;continue;}
            const completed:StoredIssueReport={
              ...report,emailStatus:'sent',emailAttemptedAt:new Date().toISOString(),
              emailSentAt:new Date().toISOString(),emailId:submitted.emailId,
            } as StoredIssueReport;
            await put(blob.pathname,JSON.stringify(completed),{
              token,access:'private',allowOverwrite:true,addRandomSuffix:false,
              contentType:'application/json',
            });
            sent++;
            if(attempted>=80)break;
          }
          if(!result.hasMore||!result.cursor||attempted>=80)break;
          cursor=result.cursor;
        }
        return reply({success:true,scanned,attempted,sent,failures});
      }catch{
        return reply({error:'Retry was interrupted; unsent reports remain stored.',scanned,attempted,sent},503);
      }
    },
  }},
});
