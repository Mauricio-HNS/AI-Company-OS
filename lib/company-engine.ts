export type MissionStageStatus = 'complete' | 'active' | 'pending';

export type MissionStage = {
  id: string;
  title: string;
  agent: string;
  objective: string;
  status: MissionStageStatus;
  progress: number;
  authority: string;
  risk: 'low' | 'medium' | 'high';
};

export type MissionEvent = {
  id: number;
  time: string;
  agent: string;
  message: string;
  type: 'success' | 'info' | 'warning';
};

export type CompanyMission = {
  id: string;
  title: string;
  objective: string;
  progress: number;
  capital: number;
  expectedRevenue: number;
  stages: MissionStage[];
  events: MissionEvent[];
};

export const autonomousSaaSMission: CompanyMission = {
  id: 'mission-alpha',
  title: 'Launch a revenue-generating SaaS',
  objective: 'Turn €1,000 of simulated capital into €2,000 of validated revenue.',
  progress: 71,
  capital: 320,
  expectedRevenue: 2000,
  stages: [
    { id: 'strategy', title: 'CEO Strategy', agent: 'CEO Agent', objective: 'Define the revenue thesis and operating constraints.', status: 'complete', progress: 100, authority: 'Strategic decisions', risk: 'low' },
    { id: 'research', title: 'Market Research', agent: 'Research Agent', objective: 'Validate high-intent customer segments and buying signals.', status: 'complete', progress: 100, authority: 'Research and analysis', risk: 'low' },
    { id: 'mvp', title: 'Build MVP', agent: 'Product Agent', objective: 'Ship the smallest product capable of testing willingness to pay.', status: 'active', progress: 71, authority: 'Product changes within budget', risk: 'medium' },
    { id: 'growth', title: 'Growth Experiment', agent: 'Sales Agent', objective: 'Run a controlled acquisition experiment against validated segments.', status: 'pending', progress: 0, authority: 'Simulated outreach only', risk: 'medium' },
    { id: 'learn', title: 'Measure & Learn', agent: 'CFO Agent', objective: 'Measure unit economics, ROI and decide the next capital allocation.', status: 'pending', progress: 0, authority: 'Financial analysis only', risk: 'high' },
  ],
  events: [
    { id: 1, time: '09:41', agent: 'Product Agent', message: 'Created pricing experiment #41.', type: 'success' },
    { id: 2, time: '09:36', agent: 'Research Agent', message: 'Validated 3 high-intent customer segments.', type: 'success' },
    { id: 3, time: '09:28', agent: 'CEO Agent', message: 'Approved MVP scope and €320 budget.', type: 'info' },
    { id: 4, time: '09:17', agent: 'QA Agent', message: 'Opened release validation task.', type: 'warning' },
  ],
};

export function advanceMission(mission: CompanyMission): CompanyMission {
  const index = mission.stages.findIndex((stage) => stage.status === 'active');
  if (index < 0) return mission;

  const stages = mission.stages.map((stage, stageIndex) => {
    if (stageIndex === index) return { ...stage, status: 'complete' as const, progress: 100 };
    if (stageIndex === index + 1) return { ...stage, status: 'active' as const, progress: 8 };
    return stage;
  });

  const completed = stages.filter((stage) => stage.status === 'complete').length;
  const progress = Math.round((completed / stages.length) * 100);
  const next = stages[index + 1];

  return {
    ...mission,
    stages,
    progress,
    events: [
      {
        id: Date.now(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agent: next?.agent ?? 'CEO Agent',
        message: next ? `Dispatched ${next.title} to ${next.agent}.` : 'Mission reached the final stage.',
        type: 'info',
      },
      ...mission.events,
    ],
  };
}
