import { cookies } from 'next/headers';
import { findUserById, getSession } from './store';
import type { AuthUser } from './types';

export function requireAuth(): { sessionId:string; user:AuthUser } | null {
  const id=cookies().get('aicos-session')?.value;
  const session=id?getSession(id):null;
  if(!session) return null;
  const user=findUserById(session.userId);
  if(!user) return null;
  return {sessionId:session.id,user};
}
export function requireOwner() {
  const auth=requireAuth();
  return auth?.user.role === 'OWNER' ? auth : null;
}
