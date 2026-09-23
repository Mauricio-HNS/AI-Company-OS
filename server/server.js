import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "change-this-in-production";
const MASTER_EMAIL = process.env.MASTER_EMAIL || "master@aicompanyos.local";
const MASTER_PASSWORD = process.env.MASTER_PASSWORD || "ChangeMe123!";
const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.join(ROOT, "uploads");
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "ai-company-os.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  country TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  revenue REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'CLIENT',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id)
);
CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id)
);
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  ticket_number INTEGER NOT NULL,
  company_id TEXT NOT NULL,
  requester_id TEXT,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Normal',
  status TEXT NOT NULL DEFAULT 'NOVO',
  sla_hours INTEGER NOT NULL DEFAULT 24,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id)
);
CREATE TABLE IF NOT EXISTS support_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  author_id TEXT,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(ticket_id) REFERENCES support_tickets(id)
);
CREATE TABLE IF NOT EXISTS support_attachments (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  uploaded_by TEXT,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY(ticket_id) REFERENCES support_tickets(id)
);
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  payload TEXT,
  created_at TEXT NOT NULL
);
`);

function now() { return new Date().toISOString(); }
function id() { return crypto.randomUUID(); }
function hashToken(token) { return crypto.createHash("sha256").update(token).digest("hex"); }
function sign(user) { return jwt.sign({ sub:user.id, role:user.role, companyId:user.company_id || null }, JWT_SECRET, { expiresIn:"12h" }); }
function auth(req,res,next) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) return res.status(401).json({error:"AUTH_REQUIRED"});
  try { req.user = jwt.verify(h.slice(7), JWT_SECRET); next(); }
  catch { return res.status(401).json({error:"INVALID_TOKEN"}); }
}
function master(req,res,next) {
  auth(req,res,()=> req.user.role === "MASTER" ? next() : res.status(403).json({error:"MASTER_REQUIRED"}));
}
function audit(actorId,action,type,entity,payload={}) {
  db.prepare("INSERT INTO audit_log VALUES (?,?,?,?,?,?,?)").run(id(),actorId,action,type,entity,JSON.stringify(payload),now());
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req,_file,cb)=>cb(null,UPLOAD_DIR),
    filename: (_req,file,cb)=>cb(null, id()+"-"+file.originalname.replace(/[^a-zA-Z0-9._-]/g,"_"))
  }),
  limits:{ fileSize: 15*1024*1024 }
});

app.use(cors({ origin:true, credentials:false }));
app.use(express.json({limit:"2mb"}));

app.get("/api/health", (_req,res)=>res.json({ok:true,service:"ai-company-os-server",time:now()}));

app.post("/api/auth/master", async (req,res)=>{
  const {email,password}=req.body||{};
  if(email!==MASTER_EMAIL || password!==MASTER_PASSWORD) return res.status(401).json({error:"INVALID_CREDENTIALS"});
  let u=db.prepare("SELECT * FROM users WHERE email=?").get(MASTER_EMAIL);
  if(!u) {
    const t=now(), hash=await bcrypt.hash(MASTER_PASSWORD,12);
    u={id:id(),company_id:null,name:"Master Administrator",email:MASTER_EMAIL,password_hash:hash,role:"MASTER",active:1,created_at:t};
    db.prepare("INSERT INTO users VALUES (?,?,?,?,?,?,?,?)").run(u.id,null,u.name,u.email,u.password_hash,u.role,1,t);
  }
  audit(u.id,"MASTER_LOGIN","user",u.id);
  res.json({token:sign(u),user:{id:u.id,name:u.name,email:u.email,role:u.role}});
});

app.post("/api/auth/client/signup", async (req,res)=>{
  const {inviteToken,name,email,password}=req.body||{};
  if(!inviteToken||!name||!email||!password||password.length<8) return res.status(400).json({error:"INVALID_INPUT"});
  const inv=db.prepare("SELECT * FROM invites WHERE token_hash=?").get(hashToken(inviteToken));
  if(!inv || inv.revoked_at || (inv.expires_at && inv.expires_at < now())) return res.status(400).json({error:"INVALID_OR_EXPIRED_INVITE"});
  const company=db.prepare("SELECT * FROM companies WHERE id=?").get(inv.company_id);
  if(!company || company.status==="CONGELADA" || company.status==="ENCERRADA") return res.status(403).json({error:"COMPANY_ACCESS_BLOCKED"});
  if(db.prepare("SELECT id FROM users WHERE email=?").get(email)) return res.status(409).json({error:"EMAIL_ALREADY_EXISTS"});
  const u={id:id(),company_id:company.id,name,email,password_hash:await bcrypt.hash(password,12),role:"CLIENT",active:1,created_at:now()};
  db.prepare("INSERT INTO users VALUES (?,?,?,?,?,?,?,?)").run(u.id,u.company_id,u.name,u.email,u.password_hash,u.role,1,u.created_at);
  audit(u.id,"CLIENT_SIGNUP","company",company.id);
  res.json({token:sign(u),user:{id:u.id,name:u.name,email:u.email,role:u.role},company});
});

app.post("/api/auth/client/login", async (req,res)=>{
  const {email,password}=req.body||{};
  const u=db.prepare("SELECT * FROM users WHERE email=? AND role='CLIENT'").get(email);
  if(!u || !u.active || !(await bcrypt.compare(password,u.password_hash))) return res.status(401).json({error:"INVALID_CREDENTIALS"});
  const company=db.prepare("SELECT * FROM companies WHERE id=?").get(u.company_id);
  if(!company || ["CONGELADA","ENCERRADA","SUSPENSA"].includes(company.status)) return res.status(403).json({error:"COMPANY_ACCESS_BLOCKED"});
  res.json({token:sign(u),user:{id:u.id,name:u.name,email:u.email,role:u.role},company});
});

app.get("/api/me",auth,(req,res)=>{
  const u=db.prepare("SELECT id,name,email,role,company_id FROM users WHERE id=?").get(req.user.sub);
  if(!u) return res.status(404).json({error:"USER_NOT_FOUND"});
  const company=u.company_id?db.prepare("SELECT * FROM companies WHERE id=?").get(u.company_id):null;
  res.json({user:u,company});
});

app.get("/api/master/companies",master,(_req,res)=>{
  res.json(db.prepare("SELECT * FROM companies ORDER BY created_at DESC").all());
});

app.post("/api/master/companies",master,(req,res)=>{
  const {name,type="",country="",revenue=0}=req.body||{};
  if(!name?.trim()) return res.status(400).json({error:"NAME_REQUIRED"});
  const t=now(), c={id:id(),name:name.trim(),type,country,status:"ACTIVE",revenue:Number(revenue)||0,created_at:t,updated_at:t};
  db.prepare("INSERT INTO companies VALUES (?,?,?,?,?,?,?,?)").run(c.id,c.name,c.type,c.country,c.status,c.revenue,c.created_at,c.updated_at);
  audit(req.user.sub,"COMPANY_CREATED","company",c.id,c);
  res.status(201).json(c);
});

app.patch("/api/master/companies/:id",master,(req,res)=>{
  const c=db.prepare("SELECT * FROM companies WHERE id=?").get(req.params.id);
  if(!c)return res.status(404).json({error:"COMPANY_NOT_FOUND"});
  const allowed=["ACTIVE","EM_IMPLANTACAO","PAGAMENTO_PENDENTE","INADIMPLENTE","SUSPENSA","CONGELADA","ENCERRADA","ARQUIVADA"];
  const status=req.body?.status;
  if(status && !allowed.includes(status)) return res.status(400).json({error:"INVALID_STATUS"});
  const next={...c,...req.body,updated_at:now()};
  db.prepare("UPDATE companies SET name=?,type=?,country=?,status=?,revenue=?,updated_at=? WHERE id=?").run(next.name,next.type,next.country,next.status,Number(next.revenue)||0,next.updated_at,c.id);
  audit(req.user.sub,"COMPANY_UPDATED","company",c.id,{before:c,after:next});
  res.json(next);
});

app.post("/api/master/companies/:id/invites",master,(req,res)=>{
  const c=db.prepare("SELECT * FROM companies WHERE id=?").get(req.params.id);
  if(!c)return res.status(404).json({error:"COMPANY_NOT_FOUND"});
  db.prepare("UPDATE invites SET revoked_at=? WHERE company_id=? AND revoked_at IS NULL").run(now(),c.id);
  const token=crypto.randomBytes(32).toString("hex"), t=now();
  db.prepare("INSERT INTO invites VALUES (?,?,?,?,?,?)").run(id(),c.id,hashToken(token),null,null,t);
  audit(req.user.sub,"INVITE_CREATED","company",c.id);
  res.status(201).json({token,company:c.id,createdAt:t});
});

app.delete("/api/master/companies/:id",master,(req,res)=>{
  return res.status(409).json({error:"HARD_DELETE_DISABLED",message:"Use status ARQUIVADA or ENCERRADA. Histórico financeiro, suporte e auditoria devem ser preservados."});
});

app.get("/api/master/support/tickets",master,(_req,res)=>{
  const rows=db.prepare(`SELECT t.*,c.name company_name FROM support_tickets t JOIN companies c ON c.id=t.company_id ORDER BY t.created_at DESC`).all();
  res.json(rows);
});

app.get("/api/support/tickets",auth,(req,res)=>{
  if(req.user.role==="MASTER") return res.json(db.prepare("SELECT * FROM support_tickets ORDER BY created_at DESC").all());
  const rows=db.prepare("SELECT * FROM support_tickets WHERE company_id=? ORDER BY created_at DESC").all(req.user.companyId);
  res.json(rows);
});

app.post("/api/support/tickets",auth,(req,res)=>{
  if(!["CLIENT","MASTER"].includes(req.user.role)) return res.status(403).json({error:"FORBIDDEN"});
  const companyId=req.user.role==="MASTER"?req.body.companyId:req.user.companyId;
  const {subject,description,priority="Normal"}=req.body||{};
  if(!companyId||!subject||!description)return res.status(400).json({error:"INVALID_INPUT"});
  const n=db.prepare("SELECT COALESCE(MAX(ticket_number),0)+1 n FROM support_tickets").get().n;
  const t={id:id(),ticket_number:n,company_id:companyId,requester_id:req.user.sub,subject,description,priority,status:"NOVO",sla_hours:priority==="Crítica"?4:priority==="Alta"?8:24,created_at:now(),updated_at:now()};
  db.prepare("INSERT INTO support_tickets VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(...Object.values(t));
  audit(req.user.sub,"TICKET_CREATED","support_ticket",t.id,t);
  res.status(201).json(t);
});

app.get("/api/support/tickets/:id",auth,(req,res)=>{
  const t=db.prepare("SELECT * FROM support_tickets WHERE id=?").get(req.params.id);
  if(!t)return res.status(404).json({error:"TICKET_NOT_FOUND"});
  if(req.user.role!=="MASTER" && t.company_id!==req.user.companyId)return res.status(403).json({error:"FORBIDDEN"});
  const messages=db.prepare("SELECT id,author_id,message,created_at FROM support_messages WHERE ticket_id=? ORDER BY created_at").all(t.id);
  const attachments=db.prepare("SELECT id,file_name,mime_type,size_bytes,created_at FROM support_attachments WHERE ticket_id=? ORDER BY created_at").all(t.id);
  res.json({ticket:t,messages,attachments});
});

app.post("/api/support/tickets/:id/messages",auth,(req,res)=>{
  const t=db.prepare("SELECT * FROM support_tickets WHERE id=?").get(req.params.id);
  if(!t || (req.user.role!=="MASTER" && t.company_id!==req.user.companyId))return res.status(404).json({error:"TICKET_NOT_FOUND"});
  const message=String(req.body?.message||"").trim();if(!message)return res.status(400).json({error:"MESSAGE_REQUIRED"});
  const m={id:id(),ticket_id:t.id,author_id:req.user.sub,message,created_at:now()};
  db.prepare("INSERT INTO support_messages VALUES (?,?,?,?,?)").run(...Object.values(m));
  db.prepare("UPDATE support_tickets SET updated_at=? WHERE id=?").run(now(),t.id);
  audit(req.user.sub,"TICKET_MESSAGE","support_ticket",t.id);
  res.status(201).json(m);
});

app.patch("/api/support/tickets/:id",master,(req,res)=>{
  const t=db.prepare("SELECT * FROM support_tickets WHERE id=?").get(req.params.id);
  if(!t)return res.status(404).json({error:"TICKET_NOT_FOUND"});
  const statuses=["NOVO","EM ATENDIMENTO","AGUARDANDO CLIENTE","AGUARDANDO AI","RESOLVIDO","FECHADO"];
  if(req.body?.status && !statuses.includes(req.body.status))return res.status(400).json({error:"INVALID_STATUS"});
  const status=req.body.status||t.status,priority=req.body.priority||t.priority;
  db.prepare("UPDATE support_tickets SET status=?,priority=?,updated_at=? WHERE id=?").run(status,priority,now(),t.id);
  audit(req.user.sub,"TICKET_UPDATED","support_ticket",t.id,{status,priority});
  res.json({...t,status,priority,updated_at:now()});
});

app.post("/api/support/tickets/:id/attachments",auth,upload.array("files",10),(req,res)=>{
  const t=db.prepare("SELECT * FROM support_tickets WHERE id=?").get(req.params.id);
  if(!t || (req.user.role!=="MASTER" && t.company_id!==req.user.companyId))return res.status(404).json({error:"TICKET_NOT_FOUND"});
  const rows=[];
  for(const f of req.files||[]){
    const r={id:id(),ticket_id:t.id,uploaded_by:req.user.sub,file_name:f.originalname,storage_path:f.filename,mime_type:f.mimetype,size_bytes:f.size,created_at:now()};
    db.prepare("INSERT INTO support_attachments VALUES (?,?,?,?,?,?,?)").run(...Object.values(r));rows.push(r);
  }
  res.status(201).json(rows.map(x=>({id:x.id,file_name:x.file_name,mime_type:x.mime_type,size_bytes:x.size_bytes})));
});

app.use("/api/files",auth,(req,res,next)=>{
  const file=req.path.replace(/^\//,"");
  const row=db.prepare("SELECT * FROM support_attachments WHERE storage_path=?").get(file);
  if(!row)return res.status(404).end();
  const t=db.prepare("SELECT * FROM support_tickets WHERE id=?").get(row.ticket_id);
  if(req.user.role!=="MASTER" && t?.company_id!==req.user.companyId)return res.status(403).end();
  res.sendFile(path.join(UPLOAD_DIR,file));
});

app.get("/api/master/audit",master,(_req,res)=>res.json(db.prepare("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 500").all()));

const seed=db.prepare("SELECT COUNT(*) n FROM companies").get().n;
if(!seed) {
  const t=now();
  for(const c of [
    {id:"destiny7-software",name:"Destiny7 Software",type:"SaaS",country:"Spain",revenue:82400},
    {id:"novaflow",name:"NovaFlow",type:"Automation",country:"Portugal",revenue:61800}
  ]) db.prepare("INSERT INTO companies VALUES (?,?,?,?,?,?,?,?)").run(c.id,c.name,c.type,c.country,"ACTIVE",c.revenue,t,t);
}

app.listen(PORT,()=>console.log(`AI Company OS backend running on :${PORT}`));
