import { describe,expect,it } from 'vitest';
import { validateReport } from './issue-report';

const now=Date.parse('2026-11-07T13:00:00Z');
const base={
  raceId:'ES-RFEC-32095-M',
  raceName:'Volta Castello',
  issueType:'Wrong date',
  description:'The race is listed one day too early; please correct the published date.',
  proofUrl:'https://federation.example.org/calendar/2027',
  startedAt:now-10000,
};

describe('anonymous race correction reports',()=>{
  it('requires credible correction explanation and an HTTPS evidence link',()=>{
    expect(validateReport(base,now).value?.raceName).toBe('Volta Castello');
    expect(validateReport({...base,description:'wrong'},now).error).toContain('12 characters');
    expect(validateReport({...base,proofUrl:''},now).error).toContain('HTTPS');
    expect(validateReport({...base,proofUrl:'http://example.org/evidence'},now).error).toContain('HTTPS');
  });
  it('does not allow localhost, private IP or userinfo proof links',()=>{
    for(const url of ['https://localhost/x','https://127.0.0.1/x','https://user:password@example.org/x',
      'https://example.local/x','https://invalid/x']){
      expect(validateReport({...base,proofUrl:url},now).value).toBeUndefined();
    }
  });
  it('accepts a report without an ID and rejects bots or implausible submission timing',()=>{
    expect(validateReport({...base,raceId:''},now).value?.raceId).toBe('');
    expect(validateReport({...base,website:'https://spam.example'},now).spam).toBe(true);
    expect(validateReport({...base,startedAt:now-200},now).value).toBeUndefined();
  });
  it('rejects unsupported issue categories and huge fields',()=>{
    expect(validateReport({...base,issueType:'not allowed'},now).value).toBeUndefined();
    expect(validateReport({...base,raceName:'x'.repeat(201)},now).value).toBeUndefined();
    expect(validateReport({...base,proofUrl:'https://example.org/'+('a'.repeat(1800))},now).value).toBeUndefined();
  });
});
