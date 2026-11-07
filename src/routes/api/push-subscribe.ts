import { createFileRoute } from '@tanstack/react-router';
import {
  jsonResponse, pushConfigured, removeSubscription, saveSubscription,
  validSameOrigin, validateSubscription,
} from '@/lib/push-server';

export const Route = createFileRoute('/api/push-subscribe')({
  server:{handlers:{
    POST:async ({request})=>{
      if(!validSameOrigin(request)) return jsonResponse({error:'Invalid request origin'},403);
      if(!pushConfigured()) return jsonResponse({error:'Web Push is not available'},503);
      if(Number(request.headers.get('content-length')||0)>10000) return jsonResponse({error:'Request too large'},413);
      try{
        const body=await request.json() as {subscription?:unknown};
        const subscription=validateSubscription(body.subscription);
        if(!subscription) return jsonResponse({error:'Invalid push subscription'},400);
        await saveSubscription(subscription);
        return jsonResponse({ok:true});
      }catch {return jsonResponse({error:'Could not register notification device'},500);}
    },
    DELETE:async ({request})=>{
      if(!validSameOrigin(request)) return jsonResponse({error:'Invalid request origin'},403);
      if(!pushConfigured()) return jsonResponse({error:'Web Push is not available'},503);
      try{
        const body=await request.json() as {subscription?:unknown};
        const subscription=validateSubscription(body.subscription);
        if(!subscription) return jsonResponse({error:'Invalid push subscription'},400);
        await removeSubscription(subscription.endpoint);
        return jsonResponse({ok:true});
      }catch {return jsonResponse({error:'Could not remove notification subscription'},500);}
    },
  }},
});
