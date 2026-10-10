import { parseInvitationDocument } from '@/pages/app/invitations/[invitationId]/edit/documentValidator';
import { describe,it,expect } from 'vitest';
import { accountDestination,safeReturnPath,selectedPlan } from '../signupIntent';
import { csvCell,makeCsv,calendarExport } from '../planningExports';
import { weddingLocalToUtc } from '../../../supabase/functions/_shared/weddingTime';
describe('Customer journey boundaries',()=>{
 it('retains a saved invitation background when loading the guest design',()=>{const parsed=parseInvitationDocument({canvas:{width:400,height:600,background:{color:'#faf5ef',pattern:'dots'}},layers:[]});expect(parsed.document?.canvas.background).toEqual({color:'#faf5ef',pattern:'dots'});});
 it('preserves a paid plan through signup',()=>expect(accountDestination({selected_plan:'complete'})).toBe('/app/onboarding?plan=complete'));
 it('returns invited collaborators to their join link',()=>expect(accountDestination({selected_plan:'complete',signup_return_to:'/join/token'})).toBe('/join/token'));
 it('rejects external return URLs',()=>{for(const path of ['https://bad.example','//bad.example','/\\bad.example','/\nattack'])expect(safeReturnPath(path)).toBeNull();});
 it('rejects unknown billing plans',()=>expect(selectedPlan('owner')).toBeNull());
 it('escapes CSV quotes and spreadsheet formulas',()=>{expect(csvCell('=IMPORTXML("url")')).toBe('"\'=IMPORTXML(""url"")"');expect(makeCsv([{name:'A,B'}],['name'])).toContain('"A,B"');});
 it('exports only dated calendar events and escapes descriptions',()=>{const ics=calendarExport([{id:'event',name:'Ceremony',start_at:'2027-06-20T12:00:00Z',description:'One, two\nthree'},{id:'undecided',name:'Undecided'}]);expect(ics).toContain('DTSTART:20270620T120000Z');expect(ics).toContain('DESCRIPTION:One\\, two\\nthree');expect(ics).not.toContain('Undecided');});
 it('handles British summer time and winter time',()=>{expect(weddingLocalToUtc('2027-06-20','13:00','Europe/London')).toBe('2027-06-20T12:00:00.000Z');expect(weddingLocalToUtc('2027-01-20','13:00','Europe/London')).toBe('2027-01-20T13:00:00.000Z');});
 it('rejects a time skipped when clocks change',()=>expect(()=>weddingLocalToUtc('2027-03-28','01:30','Europe/London')).toThrow('clocks change'));
});
