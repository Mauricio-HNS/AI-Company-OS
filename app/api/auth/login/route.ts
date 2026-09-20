import { NextResponse } from 'next/server';
import { hashPassword, verifyPassword } from '../../../../lib/auth/password';
import { clearFailures, createSession, findUser, registerFailure } from '../../../../lib/auth/store';
const DUMMY=hashPassword('dummy-password-value-for-timing').catch(()=> '');
export async function POST(req:Request){
  const body=await req.json().catch(()=>null); const email=String(body?.email??'').trim().toLowerCase(), password=String(body?.password??'');
  const user=findUser(email); const hash=user?.passwordHash ?? await DUMMY; const valid=await verifyPassword(password,hash);
  if(!user||!valid){if(user)registerFailure(user);return NextResponse.json({ok:false,error:'INVALID_CREDENTIALS'},{status:401});}
  if(user.lockedUntil>Date.now()) return NextResponse.json({ok:false,error:'TEMPORARILY_LOCKED'},{status:423});
  clearFailures(user);
  const session=createSession(user.id);
  const res=NextResponse.json({ok:true,user:{id:user.id,email:user.email,displayName:user.displayName,role:user.role,mfaEnabled:user.mfaEnabled},mfaRequired:user.mfaEnabled});
  res.cookies.set('aicos-session',session.id,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*8});
  return res;
}
