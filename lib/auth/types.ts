export type AuthRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type AuthUser = { id:string; email:string; displayName:string; role:AuthRole; mfaEnabled:boolean };
export type AuthSession = { id:string; userId:string; expiresAt:string };
