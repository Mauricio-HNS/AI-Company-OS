export type TaskStatus = 'BACKLOG' | 'PLANNING' | 'EXECUTING' | 'REVIEW' | 'COMPLETED';

export type CompanyTask = {
  id: string;
  title: string;
  department: string;
  agent: string;
  status: TaskStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  progress: number;
};

export type CompanyAgent = {
  id: string;
  name: string;
  role: string;
  department: string;
  status: 'WORKING' | 'WAITING' | 'REVIEW' | 'OFFLINE';
  objective: string;
  performance: number;
};

export const companyAgents: CompanyAgent[] = [
  { id:'ceo', name:'CEO Agent', role:'Strategy & Capital', department:'Executive', status:'WORKING', objective:'Choose the highest-value next company action', performance:98 },
  { id:'research', name:'Research Agent', role:'Market Intelligence', department:'Research', status:'WORKING', objective:'Find validated demand and opportunities', performance:93 },
  { id:'product', name:'Product Agent', role:'Build & Experiments', department:'Product', status:'WORKING', objective:'Turn validated opportunities into products', performance:96 },
  { id:'sales', name:'Sales Agent', role:'Revenue Engine', department:'Sales', status:'WORKING', objective:'Convert qualified demand into revenue', performance:91 },
  { id:'cfo', name:'CFO Agent', role:'Finance & Risk', department:'Finance', status:'REVIEW', objective:'Protect capital and measure unit economics', performance:96 },
  { id:'qa', name:'QA Agent', role:'Quality & Validation', department:'Product', status:'WAITING', objective:'Validate releases before promotion', performance:97 },
];

export const companyTasks: CompanyTask[] = [
  { id:'T-201', title:'Validate enterprise customer segments', department:'Research', agent:'research', status:'COMPLETED', priority:'HIGH', progress:100 },
  { id:'T-202', title:'Build pricing experiment #41', department:'Product', agent:'product', status:'EXECUTING', priority:'HIGH', progress:71 },
  { id:'T-203', title:'Prepare qualified outreach batch', department:'Sales', agent:'sales', status:'PLANNING', priority:'MEDIUM', progress:18 },
  { id:'T-204', title:'Review MVP economics', department:'Finance', agent:'cfo', status:'REVIEW', priority:'HIGH', progress:82 },
  { id:'T-205', title:'Release validation', department:'Product', agent:'qa', status:'BACKLOG', priority:'MEDIUM', progress:0 },
  { id:'T-206', title:'Update company growth plan', department:'Executive', agent:'ceo', status:'BACKLOG', priority:'CRITICAL', progress:0 },
];

export function getCompanyTasks(companyId: string) {
  if (companyId === 'beta') return companyTasks.map(t => ({ ...t, id: t.id.replace('20','30') }));
  if (companyId === 'gamma') return companyTasks.map(t => ({ ...t, id: t.id.replace('20','40') }));
  return companyTasks;
}

export function getCompanyAgents(_companyId: string) {
  return companyAgents;
}

export function summarizeOperations(companyId: string) {
  const tasks = getCompanyTasks(companyId);
  return {
    backlog: tasks.filter(t => t.status === 'BACKLOG').length,
    planning: tasks.filter(t => t.status === 'PLANNING').length,
    executing: tasks.filter(t => t.status === 'EXECUTING').length,
    review: tasks.filter(t => t.status === 'REVIEW').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
  };
}
