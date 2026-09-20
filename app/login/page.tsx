'use client';
import { FormEvent,useState } from 'react';
import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './auth.css';

export default function Login(){
 const[email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''); const router=useRouter();
 async function submit(e:FormEvent){e.preventDefault();setError('');if(!email||!password){setError('Enter your email and password to continue.');return}
 try{const res=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});const data=await res.json();if(!res.ok){setError(data.error==='TEMPORARILY_LOCKED'?'Account temporarily locked. Try again later.':'Invalid email or password.');return}router.push(data.mfaRequired?'/mfa':'/dash-1')}catch{setError('Authentication service unavailable.');}}
 return <main className="authShell"><div className="authVisual"><div className="authBrand"><span>AI</span><div><b>AI Company OS</b><small>OWNER CONTROL PLANE</small></div></div><div className="authOrb"><div><ShieldCheck size={28}/><b>SECURE ACCESS</b><small>DASH 1 OWNER</small></div></div><p>Authenticated access to the global company control plane.</p></div><section className="authPanel"><div className="authCard"><div className="mobileBrand">AI COMPANY OS</div><div className="authEyebrow">SECURE ACCESS</div><h1>Welcome back.</h1><p className="authLead">Sign in to DASH 1.</p><form onSubmit={submit}><label>Email<div className="inputWrap"><Mail size={16}/><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com"/></div></label><label>Password<div className="inputWrap"><LockKeyhole size={16}/><input required type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/></div></label><div className="formRow"><span/><Link href="/forgot-password">Forgot password?</Link></div>{error&&<div className="formError">{error}</div>}<button className="primaryAuth">Enter DASH 1 <ArrowRight size={16}/></button></form><p className="authLead" style={{marginTop:18}}>New to AI Company OS? <Link href="/signup">Create an account</Link></p></div><Link className="backLink" href="/welcome">← Back to introduction</Link></section></main>
}