import { NextResponse } from 'next/server';
import { hashPassword } from '../../../../lib/auth/password';
import { createSession, createUser } from '../../../../lib/auth/store';

export async function POST(req:Request){
  const body=await req.json().catch(()=>null);
  const email=String(body?.email??'').trim().toLowerCase();
  const password=String(body?.password??'');
  const displayName=String(body?.name??'').trim();
  if(!/^\S+@\S+\.\S+$/.test(email)||password.length<12||!displayName)
    return NextResponse.json({ok:false,error:'INVALID_INPUT'},{status:400});
  try {
    const user=createUser(email,displayName,await hashPassword(password));
    const session=createSession(user.id);
    const res=NextResponse.json({ok:true,user});
    res.cookies.set('aicos-session',session.id,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*8});
    return res;
  } catch(e) {
    if(e instanceof Error&&e.message==='ACCOUNT_EXISTS')
      return NextResponse.json({ok:false,error:'ACCOUNT_EXISTS'},{status:409});
    return NextResponse.json({ok:false,error:'SIGNUP_FAILED'},{status:500});
  }
}