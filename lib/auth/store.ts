import type { AuthUser } from './types';

type UserRecord = AuthUser & { passwordHash:string; failedAttempts:number; lockedUntil:number };
type SessionRecord = { id:string; userId:string; expiresAt:number };
type RecoveryRecord = { tokenHash:string; userId:string; expiresAt:number; used:boolean };

const users = new Map<string,UserRecord>();
const sessions = new Map<string,SessionRecord>();
const recovery = new Map<string,RecoveryRecord>();

export function createUser(email:string,displayName:string,passwordHash:string):AuthUser {
  const normalized=email.trim().toLowerCase();
  if (users.has(normalized)) throw new Error('ACCOUNT_EXISTS');
  const user:UserRecord={id:crypto.randomUUID(),email:normalized,displayName,role:'OWNER',mfaEnabled:false,passwordHash,failedAttempts:0,lockedUntil:0};
  users.set(normalized,user); return publicUser(user);
}
export function findUser(email:string){ return users.get(email.trim().toLowerCase()); }
export function findUserById(id:string){ return [...users.values()].find(user=>user.id===id) ?? null; }
export function publicUser(user:UserRecord):AuthUser { const {passwordHash,failedAttempts,lockedUntil,...safe}=user; return safe; }
export function createSession(userId:string){const id=crypto.randomUUID();const expiresAt=Date.now()+1000*60*60*8;sessions.set(id,{id,userId,expiresAt});return {id,expiresAt};}
export function getSession(id:string){const s=sessions.get(id);if(!s||s.expiresAt<Date.now()){sessions.delete(id);return null}return s;}
export function revokeSession(id:string){sessions.delete(id)}
export function revokeUserSessions(userId:string){for(const [id,s] of sessions) if(s.userId===userId) sessions.delete(id)}
export function registerFailure(user:UserRecord){user.failedAttempts++;if(user.failedAttempts>=5)user.lockedUntil=Date.now()+15*60*1000}
export function clearFailures(user:UserRecord){user.failedAttempts=0;user.lockedUntil=0}

async function sha256(value:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,'0')).join('')}
export async function createRecoveryToken(userId:string){
  const raw=`${crypto.randomUUID()}.${crypto.randomUUID()}`;
  recovery.set(await sha256(raw),{tokenHash:await sha256(raw),userId,expiresAt:Date.now()+15*60*1000,used:false});
  return raw;
}
export async function consumeRecoveryToken(raw:string){
  const hash=await sha256(raw), record=recovery.get(hash);
  if(!record||record.used||record.expiresAt<Date.now()) return null;
  record.used=true; return findUserById(record.userId);
}
