import { NextResponse } from 'next/server';
import { hashPassword } from '../../../../lib/auth/password';
import { createUser } from '../../../../lib/auth/store';
export async function POST(req:Request){
  const body=await req.json().catch(()=>null);
  const email=String(body?.email??'').trim().toLowerCase(), password=String(body?.password??''), displayName=String(body?.name??'').trim();
  if(!/^\\S+@\\S+\\.\\S+$/.test(email)||password.length<12||!displayName) return NextResponse.json({ok:false,error:'INVALID_INPUT'},{status:400});
  try { const user=createUser(email,displayName,await hashPassword(password)); return NextResponse.json({ok:true,user}); }
  catch(e){ if(e instanceof Error&&e.message==='ACCOUNT_EXISTS') return NextResponse.json({ok:false,error:'ACCOUNT_EXISTS'},{status:409}); throw e; }
}
