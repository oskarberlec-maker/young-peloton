import { createFileRoute } from '@tanstack/react-router';
import {
  jsonResponse,pushConfigured,validSameOrigin,validateSubscription,
  validSaved2026,saveSubscription,removeSubscription,
} from '@/lib/push-server';

export const Route = createFileRoute('/api/push-subscription')({
  server:{handlers:{
    POST:async({request})=>{
      if(!pushConfigured())return jsonResponse({error:'Push service not configured'},503);
      if(!validSameOrigin(request))return jsonResponse({error:'Invalid origin'},403);
      if(!request.headers.get('content-type')?.includes('application/json'))return jsonResponse({error:'Expected JSON'},415);
      try {
        const raw=await request.text();
        if(raw.length>60000)return jsonResponse({error:'Payload too large'},413);
        const data=JSON.parse(raw) as {subscription?:unknown;saved2026?:unknown};
        const subscription=validateSubscription(data.subscription);
        const saved=validSaved2026(data.saved2026);
        if(!subscription||!saved)return jsonResponse({error:'Invalid subscription or saved IDs'},400);
        await saveSubscription(subscription,saved);
        return jsonResponse({success:true,savedCount:saved.length});
      }catch{
        return jsonResponse({error:'Could not save push subscription'},503);
      }
    },
    DELETE:async({request})=>{
      if(!pushConfigured())return jsonResponse({error:'Push service not configured'},503);
      if(!validSameOrigin(request))return jsonResponse({error:'Invalid origin'},403);
      try{
        const raw=await request.text();
        if(raw.length>12000)return jsonResponse({error:'Payload too large'},413);
        const data=JSON.parse(raw) as {subscription?:unknown};
        const subscription=validateSubscription(data.subscription);
        if(!subscription)return jsonResponse({error:'Invalid subscription'},400);
        await removeSubscription(subscription.endpoint);
        return jsonResponse({success:true});
      }catch{
        return jsonResponse({error:'Could not unsubscribe'},503);
      }
    },
  }},
});
