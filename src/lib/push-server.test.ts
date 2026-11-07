import { describe,expect,it } from 'vitest';
import { extractNew2027Confirmations,pendingForSubscription,validSaved2026,validateSubscription } from './push-server';
import type { StoredSubscription } from './push-server';

const testSubscription={
  endpoint:'https://fcm.googleapis.com/fcm/send/example',
  expirationTime:null,
  keys:{p256dh:'A'.repeat(87),auth:'B'.repeat(22)},
};

describe('2026 to 2027 push notification safety',()=>{
  it('only accepts public HTTPS endpoints from trusted push services',()=>{
    expect(validateSubscription(testSubscription)?.endpoint).toBe(testSubscription.endpoint);
    expect(validateSubscription({...testSubscription,endpoint:'http://fcm.googleapis.com/send'})).toBeNull();
    expect(validateSubscription({...testSubscription,endpoint:'https://fcm.googleapis.com.attacker.com/send'})).toBeNull();
    expect(validateSubscription({...testSubscription,endpoint:'https://127.0.0.1/send'})).toBeNull();
  });
  it('filters saved IDs and rejects unexpected payloads',()=>{
    expect(validSaved2026(['BG-RACE-123','BG-RACE-123','uci-2027-1234']))
      .toEqual(['BG-RACE-123']);
    expect(validSaved2026(['OK','<script>'])).toBeNull();
  });
  it('only announces newly confirmed 2027 editions with a 2026 source ID',()=>{
    const history={changes:[
      {raceId:'uci-2027-999',at:'2026-11-07T07:00:00Z',before:null,
        after:{id:'uci-2027-999',source2026Id:'BG-RACE-123',date:'2027-05-20'}},
      {raceId:'uci-2027-998',at:'2026-11-07T07:00:00Z',before:null,
        after:{id:'uci-2027-998',date:'2027-03-20'}},
      {raceId:'uci-2027-997',at:'2026-11-07T07:00:00Z',before:{date:'2027-04-20'},after:{date:'2027-04-21'}},
    ]};
    const published={confirmed2027:{
      'uci-2027-999':{date:'2027-05-20',enddate:'2027-05-20',name:'Example Junior race',source2026Id:'BG-RACE-123',sourceUrl:'https://www.uci.org/competition-details/2027/ROA/999'},
      'uci-2027-998':{date:'2027-03-20',enddate:'2027-03-20',name:'Unlinked',source2026Id:'',sourceUrl:'https://www.uci.org/competition-details/2027/ROA/998'},
    }};
    const events=extractNew2027Confirmations(history,published);
    expect(events.map(e=>e.id)).toEqual(['uci-2027-999']);
    const entry:StoredSubscription={
      subscription:testSubscription,saved2026:['BG-RACE-123'],sent:[],
      createdAt:'2026-11-06T08:00:00Z',updatedAt:'2026-11-06T08:00:00Z',
    };
    expect(pendingForSubscription(entry,events)).toHaveLength(1);
    expect(pendingForSubscription({...entry,sent:['uci-2027-999']},events)).toEqual([]);
    expect(pendingForSubscription({...entry,createdAt:'2026-11-08T08:00:00Z'},events)).toEqual([]);
    expect(pendingForSubscription({...entry,saved2026:['OTHER']},events)).toEqual([]);
  });
});
