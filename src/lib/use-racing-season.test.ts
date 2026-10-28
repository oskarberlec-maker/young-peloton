import {beforeEach,describe,it,expect,vi} from 'vitest';
import {renderHook,waitFor,cleanup} from '@testing-library/react';
const auth=vi.hoisted(()=>({getUser:vi.fn(),onAuthStateChange:vi.fn(()=>({data:{subscription:{unsubscribe:vi.fn()}}}))}));
// Use a stable client just like production, so effect dependencies remain stable.
const client=vi.hoisted(()=>({auth}));
vi.mock('./supabase-client',()=>({seasonDatabase:()=>client}));
import {useRacingSeason} from './use-racing-season';
beforeEach(()=>{cleanup();localStorage.clear();});
describe('guest authentication',()=>{
 it('loads the local season without showing an error for a missing session',async()=>{
  localStorage.setItem('young-peloton-saved-races',JSON.stringify(['uci-2027-80539']));
  auth.getUser.mockResolvedValue({data:{user:null},error:{name:'AuthSessionMissingError',message:'Auth session missing!'}});
  const {result}=renderHook(()=>useRacingSeason());
  await waitFor(()=>expect(result.current.ready).toBe(true));
  expect(result.current.error).toBe('');expect(result.current.saved).toEqual(['uci-2027-80539']);
 });
 it('still shows genuine authentication failures',async()=>{
  auth.getUser.mockResolvedValue({data:{user:null},error:{name:'AuthApiError',message:'Server unavailable'}});
  const {result}=renderHook(()=>useRacingSeason());
  await waitFor(()=>expect(result.current.ready).toBe(true));
  expect(result.current.error).toBe('Server unavailable');
 });
});
