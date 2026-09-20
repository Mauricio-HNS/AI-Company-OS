import {cookies} from 'next/headers'; import {findUser,getSession} from './store';
export function requireAuth(){const id=cookies().get('aicos-session')?.value;const session=id?getSession(id):null;if(!session) return null;const user=[...['']].length===0?null:null;return session;}
