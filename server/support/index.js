import express from "express";
import multer from "multer";
import path from "node:path";
import { db } from "../db/index.js";
import { auth, master } from "../auth/index.js";
import { audit } from "../audit/index.js";
import { UPLOAD_DIR } from "../config/paths.js";
import { id, now } from "../core/utils.js";

const router = express.Router();
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => cb(null, id() + "-" + file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_"))
  }),
  limits: { fileSize: 15 * 1024 * 1024 }
});

router.get("/api/master/support/tickets",master,(_req,res)=>{
  const rows=db.prepare(`SELECT t.*,c.name company_name FROM support_tickets t JOIN companies c ON c.id=t.company_id ORDER BY t.created_at DESC`).all();
  res.json(rows);
});

router.get("/api/support/tickets",auth,(req,res)=>{
  if(req.user.role==="MASTER") return res.json(db.prepare("SELECT * FROM support_tickets ORDER BY created_at DESC").all());
  const rows=db.prepare("SELECT * FROM support_tickets WHERE company_id=? ORDER BY created_at DESC").all(req.user.companyId);
  res.json(rows);
});

router.post("/api/support/tickets",auth,(req,res)=>{
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

router.get("/api/support/tickets/:id",auth,(req,res)=>{
  const t=db.prepare("SELECT * FROM support_tickets WHERE id=?").get(req.params.id);
  if(!t)return res.status(404).json({error:"TICKET_NOT_FOUND"});
  if(req.user.role!=="MASTER" && t.company_id!==req.user.companyId)return res.status(403).json({error:"FORBIDDEN"});
  const messages=db.prepare("SELECT id,author_id,message,created_at FROM support_messages WHERE ticket_id=? ORDER BY created_at").all(t.id);
  const attachments=db.prepare("SELECT id,file_name,mime_type,size_bytes,created_at FROM support_attachments WHERE ticket_id=? ORDER BY created_at").all(t.id);
  res.json({ticket:t,messages,attachments});
});

router.post("/api/support/tickets/:id/messages",auth,(req,res)=>{
  const t=db.prepare("SELECT * FROM support_tickets WHERE id=?").get(req.params.id);
  if(!t || (req.user.role!=="MASTER" && t.company_id!==req.user.companyId))return res.status(404).json({error:"TICKET_NOT_FOUND"});
  const message=String(req.body?.message||"").trim();if(!message)return res.status(400).json({error:"MESSAGE_REQUIRED"});
  const m={id:id(),ticket_id:t.id,author_id:req.user.sub,message,created_at:now()};
  db.prepare("INSERT INTO support_messages VALUES (?,?,?,?,?)").run(...Object.values(m));
  db.prepare("UPDATE support_tickets SET updated_at=? WHERE id=?").run(now(),t.id);
  audit(req.user.sub,"TICKET_MESSAGE","support_ticket",t.id);
  res.status(201).json(m);
});

router.patch("/api/support/tickets/:id",master,(req,res)=>{
  const t=db.prepare("SELECT * FROM support_tickets WHERE id=?").get(req.params.id);
  if(!t)return res.status(404).json({error:"TICKET_NOT_FOUND"});
  const statuses=["NOVO","EM ATENDIMENTO","AGUARDANDO CLIENTE","AGUARDANDO AI","RESOLVIDO","FECHADO"];
  if(req.body?.status && !statuses.includes(req.body.status))return res.status(400).json({error:"INVALID_STATUS"});
  const status=req.body.status||t.status,priority=req.body.priority||t.priority;
  db.prepare("UPDATE support_tickets SET status=?,priority=?,updated_at=? WHERE id=?").run(status,priority,now(),t.id);
  audit(req.user.sub,"TICKET_UPDATED","support_ticket",t.id,{status,priority});
  res.json({...t,status,priority,updated_at:now()});
});

router.post("/api/support/tickets/:id/attachments",auth,upload.array("files",10),(req,res)=>{
  const t=db.prepare("SELECT * FROM support_tickets WHERE id=?").get(req.params.id);
  if(!t || (req.user.role!=="MASTER" && t.company_id!==req.user.companyId))return res.status(404).json({error:"TICKET_NOT_FOUND"});
  const rows=[];
  for(const f of req.files||[]){
    const r={id:id(),ticket_id:t.id,uploaded_by:req.user.sub,file_name:f.originalname,storage_path:f.filename,mime_type:f.mimetype,size_bytes:f.size,created_at:now()};
    db.prepare("INSERT INTO support_attachments VALUES (?,?,?,?,?,?,?)").run(...Object.values(r));rows.push(r);
  }
  res.status(201).json(rows.map(x=>({id:x.id,file_name:x.file_name,mime_type:x.mime_type,size_bytes:x.size_bytes})));
});

router.use("/api/files",auth,(req,res,next)=>{
  const file=req.path.replace(/^\//,"");
  const row=db.prepare("SELECT * FROM support_attachments WHERE storage_path=?").get(file);
  if(!row)return res.status(404).end();
  const t=db.prepare("SELECT * FROM support_tickets WHERE id=?").get(row.ticket_id);
  if(req.user.role!=="MASTER" && t?.company_id!==req.user.companyId)return res.status(403).end();
  res.sendFile(path.join(UPLOAD_DIR,file));
});



export { router as supportRouter };
