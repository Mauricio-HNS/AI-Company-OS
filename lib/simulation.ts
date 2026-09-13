export type AgentId = 'CEO' | 'RESEARCH' | 'STRATEGY' | 'PRODUCT' | 'SALES' | 'FINANCE' | 'OPS';

export type SimulationState = {
  tick: number;
  capital: number;
  revenue: number;
  costs: number;
  profit: number;
  opportunities: number;
  selectedOpportunities: number;
  products: number;
  leads: number;
  customers: number;
  activeTasks: number;
  completedTasks: number;
  phase: string;
  lastDecision: string;
  activity: string[];
};

export const initialSimulation: SimulationState = {
  tick: 0,
  capital: 1000,
  revenue: 0,
  costs: 0,
  profit: 0,
  opportunities: 0,
  selectedOpportunities: 0,
  products: 0,
  leads: 0,
  customers: 0,
  activeTasks: 1,
  completedTasks: 0,
  phase: 'CEO is defining the first objective',
  lastDecision: 'Find a revenue opportunity',
  activity: ['CEO created objective: grow capital through revenue'],
};

const money = (value: number) => `€${Math.round(value).toLocaleString('en-US')}`;

export function stepSimulation(previous: SimulationState): SimulationState {
  const tick = previous.tick + 1;
  const next = { ...previous, tick, activity: [...previous.activity] };
  const push = (message: string) => next.activity = [message, ...next.activity].slice(0, 8);

  if (tick % 2 === 0 && previous.opportunities < 127) {
    next.opportunities = Math.min(127, previous.opportunities + 17);
    next.phase = 'Research is scanning markets and customer problems';
    next.activeTasks = 3;
    push(`RESEARCH analyzed ${next.opportunities} opportunities`);
  }

  if (tick === 6) {
    next.selectedOpportunities = 3;
    next.phase = 'Strategy selected 3 opportunities for validation';
    next.activeTasks = 4;
    push('STRATEGY selected 3 opportunities with highest expected return');
  }

  if (tick === 8) {
    next.products = 2;
    next.phase = 'Product agents created 2 validation offers';
    next.activeTasks = 5;
    push('PRODUCT created 2 offers for automated validation');
  }

  if (tick >= 9 && tick % 2 === 1) {
    next.leads = Math.min(43, previous.leads + 7);
    next.phase = 'Sales is qualifying potential customers';
    push(`SALES found ${next.leads} qualified leads`);
  }

  if (tick >= 12 && tick % 3 === 0) {
    next.customers = Math.min(8, previous.customers + 2);
    const newRevenue = next.customers * 355;
    next.revenue = Math.max(previous.revenue, newRevenue);
    next.costs = Math.round(next.revenue * 0.216);
    next.profit = next.revenue - next.costs;
    next.capital = 1000 + next.profit;
    next.completedTasks += 2;
    next.activeTasks = Math.max(2, next.activeTasks - 1);
    next.phase = 'Finance evaluated the experiment and CEO is deciding reinvestment';
    next.lastDecision = next.profit > 1200 ? `Reinvest ${money(1500)}` : 'Continue validation';
    push(`FINANCE measured ${money(next.revenue)} revenue and ${money(next.profit)} profit`);
  }

  if (tick >= 18 && tick % 6 === 0) {
    next.phase = 'CEO closed cycle and created the next growth plan';
    next.completedTasks += 3;
    next.activeTasks = 3;
    push(`CEO: ${next.lastDecision} and starting the next cycle`);
  }

  return next;
}
