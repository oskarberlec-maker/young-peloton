import { createFileRoute } from '@tanstack/react-router';
import { put } from '@vercel/blob';
import { validateReport } from '@/lib/issue-report';

const reply = (data:unknown, status=200) =>
  new Response(JSON.stringify(data),{
    status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},
  });

export const Route = createFileRoute('/api/report-issue')({
  server:{handlers:{
    POST:async({request})=>{
      const url=new URL(request.url);
      if(request.headers.get('origin')!==url.origin) return reply({error:'Invalid origin.'},403);
      if(!request.headers.get('content-type')?.includes('application/json'))
        return reply({error:'Expected JSON.'},415);
      const length=Number(request.headers.get('content-length')||0);
      if(length>7000) return reply({error:'Report too long.'},413);
      let data:unknown;
      try {
        const input=await request.text();
        if(input.length>7000)return reply({error:'Report too long.'},413);
        data=JSON.parse(input);
      }catch{return reply({error:'Could not read the report.'},400);}
      const report=validateReport(data);
      if(report.spam)return reply({success:true}); // Honeypot: do not store bot submissions
      if(!report.value)return reply({error:report.error||'Invalid report.'},400);
      const token=process.env['BLOB_READ_WRITE_TOKEN'];
      if(!token)return reply({error:'Reporting is temporarily unavailable.'},503);
      const now=new Date();
      const reference=crypto.randomUUID();
      const date=now.toISOString().slice(0,10);
      try{
        await put('corrections/v1/'+date+'/'+reference+'.json',JSON.stringify({
          reference,receivedAt:now.toISOString(),status:'pending_review',
          ...report.value,
        }),{
          token,access:'private',addRandomSuffix:false,allowOverwrite:false,
          contentType:'application/json',
        });
      }catch{return reply({error:'Could not submit your report. Please retry.'},503);}
      return reply({success:true,reference},201);
    },
  }},
});
