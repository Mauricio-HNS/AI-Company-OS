import express from "express";
import { db } from "../db/index.js";
import { master } from "../auth/index.js";
import { audit } from "../audit/index.js";
import { id, now } from "../core/utils.js";

const router = express.Router();

router.get("/api/master/products",master,(_req,res)=>{
  res.json(db.prepare("SELECT * FROM products ORDER BY active DESC,name").all());
});
router.post("/api/master/products",master,(req,res)=>{
  const {name,description="",type="SERVICE",price=0,billing_cycle="MONTHLY"}=req.body||{};
  if(!String(name||"").trim()) return res.status(400).json({error:"NAME_REQUIRED"});
  const p={id:id(),name:String(name).trim(),description,type,price:Number(price)||0,billing_cycle,active:1,created_at:now()};
  db.prepare("INSERT INTO products VALUES (?,?,?,?,?,?,?,?)").run(...Object.values(p));
  audit(req.user.sub,"PRODUCT_CREATED","product",p.id,p); res.status(201).json(p);
});
router.patch("/api/master/products/:id",master,(req,res)=>{
  const p=db.prepare("SELECT * FROM products WHERE id=?").get(req.params.id);
  if(!p)return res.status(404).json({error:"PRODUCT_NOT_FOUND"});
  const n={...p,...req.body}; db.prepare("UPDATE products SET name=?,description=?,type=?,price=?,billing_cycle=?,active=? WHERE id=?").run(n.name,n.description,n.type,Number(n.price)||0,n.billing_cycle,n.active?1:0,p.id);
  audit(req.user.sub,"PRODUCT_UPDATED","product",p.id,{before:p,after:n});res.json(n);
});
router.get("/api/master/companies/:id/erp",master,(req,res)=>{
  const company=db.prepare("SELECT * FROM companies WHERE id=?").get(req.params.id);
  if(!company)return res.status(404).json({error:"COMPANY_NOT_FOUND"});
  const subscriptions=db.prepare("SELECT s.*,p.name product_name,p.billing_cycle FROM subscriptions s JOIN products p ON p.id=s.product_id WHERE s.company_id=? ORDER BY s.created_at DESC").all(company.id);
  const invoices=db.prepare("SELECT * FROM invoices WHERE company_id=? ORDER BY due_date DESC").all(company.id);
  const payments=db.prepare("SELECT * FROM payments WHERE company_id=? ORDER BY paid_at DESC").all(company.id);
  const contracts=db.prepare("SELECT * FROM contracts WHERE company_id=? ORDER BY created_at DESC").all(company.id);
  const events=db.prepare("SELECT * FROM company_events WHERE company_id=? ORDER BY created_at DESC LIMIT 100").all(company.id);
  res.json({company,subscriptions,invoices,payments,contracts,events});
});
router.post("/api/master/companies/:id/subscriptions",master,(req,res)=>{
  const company=db.prepare("SELECT * FROM companies WHERE id=?").get(req.params.id);
  const product=db.prepare("SELECT * FROM products WHERE id=? AND active=1").get(req.body?.productId);
  if(!company)return res.status(404).json({error:"COMPANY_NOT_FOUND"});
  if(!product)return res.status(404).json({error:"PRODUCT_NOT_FOUND"});
  const quantity=Math.max(1,Number(req.body.quantity)||1), unitPrice=Number(req.body.unitPrice ?? product.price)||0;
  const start=req.body.startDate||now().slice(0,10);
  const sub={id:id(),company_id:company.id,product_id:product.id,status:"ACTIVE",quantity,unit_price:unitPrice,start_date:start,next_billing_date:req.body.nextBillingDate||null,end_date:null,created_at:now(),updated_at:now()};
  db.prepare("INSERT INTO subscriptions VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(...Object.values(sub));
  db.prepare("INSERT INTO company_events VALUES (?,?,?,?,?,?)").run(id(),company.id,"SUBSCRIPTION_CREATED","Assinatura criada: "+product.name,req.user.sub,now());
  audit(req.user.sub,"SUBSCRIPTION_CREATED","subscription",sub.id,sub);res.status(201).json(sub);
});
router.post("/api/master/companies/:id/invoices",master,(req,res)=>{
  const company=db.prepare("SELECT * FROM companies WHERE id=?").get(req.params.id);
  if(!company)return res.status(404).json({error:"COMPANY_NOT_FOUND"});
  const subtotal=Number(req.body?.subtotal)||0,tax=Number(req.body?.tax)||0,total=subtotal+tax;
  const seq=db.prepare("SELECT COUNT(*) n FROM invoices").get().n+1;
  const invoice={id:id(),company_id:company.id,subscription_id:req.body?.subscriptionId||null,number:"INV-"+String(seq).padStart(6,"0"),status:"OPEN",issue_date:req.body?.issueDate||now().slice(0,10),due_date:req.body?.dueDate||now().slice(0,10),subtotal,tax,total,paid_amount:0,created_at:now(),updated_at:now()};
  db.prepare("INSERT INTO invoices VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").run(...Object.values(invoice));
  db.prepare("INSERT INTO company_events VALUES (?,?,?,?,?,?)").run(id(),company.id,"INVOICE_CREATED","Fatura "+invoice.number+" criada",req.user.sub,now());
  audit(req.user.sub,"INVOICE_CREATED","invoice",invoice.id,invoice);res.status(201).json(invoice);
});
router.post("/api/master/invoices/:id/payments",master,(req,res)=>{
  const invoice=db.prepare("SELECT * FROM invoices WHERE id=?").get(req.params.id);
  if(!invoice)return res.status(404).json({error:"INVOICE_NOT_FOUND"});
  const amount=Number(req.body?.amount)||0;
  if(amount<=0)return res.status(400).json({error:"INVALID_AMOUNT"});
  const payment={id:id(),invoice_id:invoice.id,company_id:invoice.company_id,amount,method:req.body?.method||"OTHER",reference:req.body?.reference||"",paid_at:req.body?.paidAt||now(),created_at:now()};
  db.prepare("INSERT INTO payments VALUES (?,?,?,?,?,?,?)").run(...Object.values(payment));
  const paid=Math.min(invoice.total,invoice.paid_amount+amount);
  const status=paid>=invoice.total?"PAID":"PARTIALLY_PAID";
  db.prepare("UPDATE invoices SET paid_amount=?,status=?,updated_at=? WHERE id=?").run(paid,status,now(),invoice.id);
  audit(req.user.sub,"PAYMENT_RECORDED","invoice",invoice.id,payment);res.status(201).json({...payment,invoice_status:status,paid_amount:paid});
});
router.post("/api/master/companies/:id/contracts",master,(req,res)=>{
  const company=db.prepare("SELECT * FROM companies WHERE id=?").get(req.params.id);
  if(!company)return res.status(404).json({error:"COMPANY_NOT_FOUND"});
  const c={id:id(),company_id:company.id,title:String(req.body?.title||"Contrato"),status:req.body?.status||"ACTIVE",start_date:req.body?.startDate||null,end_date:req.body?.endDate||null,monthly_value:Number(req.body?.monthlyValue)||0,notes:req.body?.notes||"",created_at:now(),updated_at:now()};
  db.prepare("INSERT INTO contracts VALUES (?,?,?,?,?,?,?,?,?,?)").run(...Object.values(c));
  audit(req.user.sub,"CONTRACT_CREATED","contract",c.id,c);res.status(201).json(c);
});
router.post("/api/master/companies/:id/status",master,(req,res)=>{
  const c=db.prepare("SELECT * FROM companies WHERE id=?").get(req.params.id);
  if(!c)return res.status(404).json({error:"COMPANY_NOT_FOUND"});
  const allowed=["ACTIVE","EM_IMPLANTACAO","PAGAMENTO_PENDENTE","INADIMPLENTE","SUSPENSA","CONGELADA","ENCERRADA","ARQUIVADA"];
  if(!allowed.includes(req.body?.status))return res.status(400).json({error:"INVALID_STATUS"});
  db.prepare("UPDATE companies SET status=?,updated_at=? WHERE id=?").run(req.body.status,now(),c.id);
  db.prepare("INSERT INTO company_events VALUES (?,?,?,?,?,?)").run(id(),c.id,"STATUS_CHANGED","Status alterado de "+c.status+" para "+req.body.status,req.user.sub,now());
  audit(req.user.sub,"COMPANY_STATUS_CHANGED","company",c.id,{from:c.status,to:req.body.status});
  res.json(db.prepare("SELECT * FROM companies WHERE id=?").get(c.id));
});



export { router as erpRouter };
