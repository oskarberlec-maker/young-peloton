import { createFileRoute } from '@tanstack/react-router';
import {
  deliverOne,extractNew2027Confirmations,jsonResponse,listSubscriptions,
  pendingForSubscription,pushConfigured,removeSubscription,saveUpdatedSubscription,
} from '@/lib/push-server';

const DATA_ROOT='https://raw.githubusercontent.com/oskarberlec-maker/young-peloton/race-source-data/';
const loadJson=async(path:string):Promise<unknown>=>{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch(DATA_ROOT+path,{cache:'no-store',signal:controller.signal});
    if(!response.ok)throw new Error('Published '+path+' unavailable');
    return response.json();
  }finally{clearTimeout(timer);}
};

export const Route = createFileRoute('/api/push-dispatch')({
  server:{handlers:{
    GET:async({request})=>{
      const secret=process.env.CRON_SECRET;
      if(!secret||request.headers.get('authorization')!=='Bearer '+secret)
        return jsonResponse({error:'Not authorized'},401);
      if(!pushConfigured())return jsonResponse({error:'Push service not configured'},503);
      try{
        const [history,overrides]=await Promise.all([loadJson('history.json'),loadJson('overrides.json')]);
        const events=extractNew2027Confirmations(history,overrides);
        if(!events.length)return jsonResponse({success:true,confirmations:0,attempted:0,sent:0});
        const subscriptions=await listSubscriptions();
        let sent=0,attempted=0,expired=0,errors=0;
        // Keep a bounded workload for serverless functions; remaining events
        // will still be pending in the private per-device sent history tomorrow.
        for(const {path,entry} of subscriptions.slice(0,300)){
          const pending=(await pendingForSubscription(entry,events)).slice(0,10);
          if(!pending.length)continue;
          let remove=false;
          for(const event of pending){
            attempted++;
            try{
              const response=await deliverOne(entry.subscription,event);
              if(response.ok){
                sent++;entry.sent.push(event.id);
              }else if(response.status===404||response.status===410){
                remove=true;expired++;break;
              }else{
                errors++;
              }
            }catch{errors++;}
          }
          if(remove){
            await removeSubscription(entry.subscription.endpoint);
          }else if(pending.some(e=>entry.sent.includes(e.id))){
            await saveUpdatedSubscription(path,{...entry,sent:[...new Set(entry.sent)].slice(-800)});
          }
        }
        return jsonResponse({success:true,confirmations:events.length,
          subscribers:subscriptions.length,attempted,sent,expired,errors});
      }catch{
        return jsonResponse({error:'Daily notification check failed; no status reset'},503);
      }
    },
  }},
});
