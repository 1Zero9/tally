/** Characterization probes: passing means the documented defect was reproduced.
 * All persistence and email are mocked. No production data access. */
import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  prisma: { user: { findUnique: vi.fn(), upsert: vi.fn() }, household: { findUnique: vi.fn(), findMany: vi.fn() }, verificationToken: { findFirst: vi.fn(), deleteMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() }, expense: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() }, transfer: { create: vi.fn() }, databaseBackup: { findUnique: vi.fn() }, $transaction: vi.fn() },
  user: { id: 'review-admin', name: 'Review', email: 'review@example.invalid', householdId: 'house-a', role: 'ADMIN' },
}));
vi.mock('@/src/lib/prisma', () => ({ prisma: m.prisma }));
vi.mock('@/src/lib/auth', () => ({ SESSION_COOKIE: 'tally_session', requireHouseholdUser: async () => ({user:m.user}), requireAdmin: async () => ({user:m.user}) }));
vi.mock('@/src/lib/mail', () => ({ isEmailConfigured: () => true, sendVerificationCodeEmail: vi.fn(), sendInviteEmail: vi.fn() }));
vi.mock('@/src/lib/audit', () => ({logAudit: vi.fn()}));
vi.mock('@/src/lib/duplicateGuard', () => ({findPossibleDuplicate: async () => null}));
import { POST as sendCode } from '../../../app/api/auth/send-code/route';
import { POST as verifyCode } from '../../../app/api/auth/verify-code/route';
import { POST as invite } from '../../../app/api/workspace/invite/route';
import { POST as expense, PUT as updateExpense } from '../../../app/api/expenses/route';
import { POST as transfer } from '../../../app/api/transfers/route';
import { PUT as restore } from '../../../app/api/admin/backup/route';
const req = (body: unknown) => new Request('http://localhost/api/review', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
beforeEach(() => {vi.clearAllMocks(); vi.spyOn(console,'log').mockImplementation(()=>{}); vi.spyOn(console,'error').mockImplementation(()=>{});});
it('SEC-01: existing and unknown accounts return distinguishable messages',async()=>{
 m.prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(m.user);
 m.prisma.verificationToken.findFirst.mockResolvedValue(null);
 const a=await (await sendCode(req({email:'unknown@example.invalid'}))).json();
 const b=await (await sendCode(req({email:'review@example.invalid'}))).json();
 expect(a.message).not.toBe(b.message);
 expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/Verification code.*\d{6}/));
});
it('SEC-02: 20 simultaneous wrong guesses collapse to one persisted attempt',async()=>{
 m.prisma.verificationToken.findFirst.mockImplementation(async()=>({id:'otp',code:'123456',attempts:0}));
 const responses=await Promise.all(Array.from({length:20},()=>verifyCode(req({email:'review@example.invalid',code:'999999'}))));
 expect(responses.every(r=>r.status===400)).toBe(true);
 expect(m.prisma.verificationToken.update).toHaveBeenCalledTimes(20);
 expect(m.prisma.verificationToken.update.mock.calls.every(([a])=>a.data.attempts===1)).toBe(true);
 expect(m.prisma.verificationToken.delete).not.toHaveBeenCalled();
});
it('SEC-03: reinviting sole admin defaults their role to MEMBER',async()=>{
 m.prisma.household.findUnique.mockResolvedValue({id:'house-a',name:'Review'});
 m.prisma.user.findUnique.mockResolvedValue(m.user);
 m.prisma.user.upsert.mockResolvedValue({...m.user,role:'MEMBER'});
 expect((await invite(req({email:m.user.email}))).status).toBe(200);
 expect(m.prisma.user.upsert.mock.calls[0][0].update.role).toBe('MEMBER');
});
it('SEC-04: expense accepts foreign account, goal and creator IDs without ownership lookup',async()=>{
 m.prisma.expense.create.mockImplementation(async({data})=>({id:'expense',...data}));
 expect((await expense(req({name:'Review',amount:10,paymentAccountId:'foreign-account',linkedGoalId:'foreign-goal',createdById:'foreign-user'}))).status).toBe(200);
 expect(m.prisma.expense.create.mock.calls[0][0].data).toMatchObject({householdId:'house-a',paymentAccountId:'foreign-account',linkedGoalId:'foreign-goal',createdById:'foreign-user'});
 expect(m.prisma.user.findUnique).not.toHaveBeenCalled();
});
it('DATA-01: expense commits before paid-transfer failure produces 500',async()=>{
 m.prisma.expense.create.mockImplementation(async({data})=>({id:'persisted-expense',...data}));
 m.prisma.transfer.create.mockRejectedValue(new Error('Synthetic transfer failure'));
 const response=await expense(req({name:'Review',amount:10,isPaidThisCycle:true}));
 expect(response.status).toBe(500); expect(m.prisma.expense.create).toHaveBeenCalledOnce();
 expect(m.prisma.$transaction).not.toHaveBeenCalled();
});
it('DATA-02: negative expense and invalid cycle/date reach persistence',async()=>{
 m.prisma.expense.create.mockImplementation(async({data})=>({id:'expense',...data}));
 expect((await expense(req({name:'Review',amount:-10,billingCycle:'nonsense',nextRenewalDate:'not-a-date'}))).status).toBe(200);
});
it('DATA-03: NaN transfer amount passes positive-amount validation',async()=>{
 m.prisma.transfer.create.mockImplementation(async({data})=>({id:'transfer',...data}));
 await transfer(req({amount:'abc',date:'not-a-date',fromAccountId:'foreign-account'}));
 expect(m.prisma.transfer.create.mock.calls[0][0].data.amount).toBeNaN();
});
it('DATA-04: restore drops FX and reimbursement fields',async()=>{
 const tx=Object.fromEntries(['account','goal','expense','income','transfer'].map(name=>[name,{deleteMany:vi.fn(),create:vi.fn(async (args: {data: Record<string, unknown>})=>({id:'new-id',...args.data}))}]));
 m.prisma.databaseBackup.findUnique.mockResolvedValue({id:'b',householdId:'house-a',payloadJson:{expenses:[{id:'old',name:'Review',amount:100,originalAmount:85,originalCurrency:'GBP',exchangeRate:1.17,rateDate:'2026-09-01',reimbursementReceived:50,reimbursementExpected:50,reimbursementReceivedDate:'2026-09-02'}]}});
 m.prisma.$transaction.mockImplementation(async fn=>fn(tx));
 expect((await restore(req({backupId:'b'}))).status).toBe(200);
 const data=tx.expense.create.mock.calls[0][0].data;
 expect(data).not.toHaveProperty('reimbursementReceived');expect(data).not.toHaveProperty('originalCurrency');
});
it('SEC-05: malformed email type becomes internal error exposed to client',async()=>{
 const r=await sendCode(req({email:123})); expect(r.status).toBe(500);expect((await r.json()).message).toContain('trim');
});
import { encryptField, decryptField, isCurrentKeyVersion } from '../../../src/lib/crypto';
import { parseCsv, matchTransaction, parseDateFlexible, parseAmount } from '../../../src/lib/statementMatching';
import { exportReportCSV } from '../../../src/utils/reportExport';
it('SEC-06: newly encrypted old-key values satisfy rotation skip check',()=>{
 const oldKey=Buffer.alloc(32,1),newKey=Buffer.alloc(32,2);
 const value=encryptField('synthetic-secret',oldKey);
 expect(isCurrentKeyVersion(value)).toBe(true);
 expect(()=>decryptField(value,newKey)).toThrow();
});
it('SEC-07: quoted CSV export retains executable formula prefix',async()=>{
 let blob: Blob | undefined;
 vi.stubGlobal('document',{createElement:()=>({click:vi.fn()}),body:{appendChild:vi.fn(),removeChild:vi.fn()}});
 vi.spyOn(URL,'createObjectURL').mockImplementation(b=>{blob=b as Blob;return 'blob:review';});
 vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 exportReportCSV('review.csv',['Name'],[['=1+1']]);
 expect(await blob!.text()).toContain('"=1+1"');
 vi.unstubAllGlobals();
});
it('IMPORT-01: quoted commas/newlines/escaped quotes round trip',()=>{
 expect(parseCsv('date,description,amount\r\n2026-09-01,"Shop, \"\"Local\"\"\nDublin",12.50')).toEqual([['date','description','amount'],['2026-09-01','Shop, "Local"\nDublin','12.50']]);
 expect(parseDateFlexible('06/09/2026')).toBe('2026-09-06');expect(parseAmount('1,234.56')).toBe(1234.56);
});
it('STRESS-01: parse 10k rows and match 2k rows against 500 candidates',()=>{
 const start=performance.now();
 expect(parseCsv('date,name,amount\n'+Array.from({length:10000},(_,i)=>`2026-09-01,Merchant ${i},10`).join('\n'))).toHaveLength(10001);
 const parseMs=performance.now()-start;
 const expenses=Array.from({length:500},(_,i)=>({id:String(i),name:'merchant '+i,vendor:null,amount:10+i,currency:'EUR',renewalDay:1}));
 const matchStart=performance.now();
 for(let i=0;i<2000;i++)expect(matchTransaction({normalizedDescription:'unknown merchant '+i,amount:10,currency:'EUR',date:'2026-09-01',direction:'DEBIT'},{expenses,transfers:[],aliases:[]})).toHaveProperty('status');
 process.stdout.write(JSON.stringify({parse10000Ms:parseMs,match2000Against500Ms:performance.now()-matchStart})+'\n');
},15000);

import { GET as backupCron } from '../../../app/api/cron/backup/route';
it('SEC-08: missing cron secret permits unauthenticated handler execution',async()=>{
 vi.stubEnv('CRON_SECRET','');m.prisma.household.findMany.mockResolvedValue([]);
 expect((await backupCron(new Request('http://localhost/api/cron/backup'))).status).toBe(200);
 expect(m.prisma.household.findMany).toHaveBeenCalledOnce();vi.unstubAllEnvs();
});
it('SEC-09: configured cron secret rejects unauthenticated request',async()=>{
 vi.stubEnv('CRON_SECRET','synthetic-review-secret');
 expect((await backupCron(new Request('http://localhost/api/cron/backup'))).status).toBe(401);
 expect(m.prisma.household.findMany).not.toHaveBeenCalled();vi.unstubAllEnvs();
});

it('DATA-05: paid-unpaid-paid creates two ledger transfers',async()=>{
 let row={id:'e',householdId:'house-a',name:'Review',amount:10,currency:'EUR',isPaidThisCycle:false};
 m.prisma.expense.findUnique.mockImplementation(async()=>({...row}));
 m.prisma.expense.update.mockImplementation(async({data})=>{row={...row,...data};return row;});
 m.prisma.transfer.create.mockResolvedValue({id:'t'});
 for(const paid of [true,false,true])expect((await updateExpense(req({...row,isPaidThisCycle:paid}))).status).toBe(200);
 expect(m.prisma.transfer.create).toHaveBeenCalledTimes(2);
});
