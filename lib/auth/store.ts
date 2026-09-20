import type { AuthUser } from './types';

type UserRecord = AuthUser & { passwordHash:string; failedAttempts:number; lockedUntil:number };
type SessionRecord = { id:string; userId:string; expiresAt:number };
const users = new Map<string,UserRecord>();
const sessions = new Map<string,SessionRecord>();

export function createUser(email:string,displayName:string,passwordHash:string):AuthUser {
  const normalized=email.trim().toLowerCase();
  if (users.has(normalized)) throw new Error('ACCOUNT_EXISTS');
  const user:UserRecord={id:crypto.randomUUID(),email:normalized,displayName,role:'OWNER',mfaEnabled:false,passwordHash,failedAttempts:0,lockedUntil:0};
  users.set(normalized,user); return publicUser(user);
}
export function findUser(email:string){ return users.get(email.trim().toLowerCase()); }
export function publicUser(user:UserRecord):AuthUser { const {passwordHash,failedAttempts,lockedUntil,...safe}=user; return safe; }
export function createSession(userId:string){const id=crypto.randomUUID();const expiresAt=Date.now()+1000*60*60*8;sessions.set(id,{id,userId,expiresAt});return {id,expiresAt};}
export function getSession(id:string){const s=sessions.get(id);if(!s||s.expiresAt<Date.now()){sessions.delete(id);return null}return s;}
export function revokeSession(id:string){sessions.delete(id)}
export function registerFailure(user:UserRecord){user.failedAttempts++;if(user.failedAttempts>=5)user.lockedUntil=Date.now()+15*60*1000}
export function clearFailures(user:UserRecord){user.failedAttempts=0;user.lockedUntil=0}
