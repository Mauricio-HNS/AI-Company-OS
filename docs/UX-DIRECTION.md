# AI Company OS — Guided UX Contract

## Product principle

The user should not learn the system. The system should understand the company and guide the user.

> Tell me what you want. I will determine how to move the company forward.

## Primary experience

The Company Command Center is the main interface. Internal modules remain available as drill-down destinations, but they must not dominate the first experience.

The first screen prioritizes:

1. Current company objective
2. Current operating cycle and progress
3. What the AI team is doing now
4. What requires human attention or approval
5. The next recommended action
6. Persistent natural-language command/conversation entry

## Interaction rules

- Prefer one clear next action over a grid of controls.
- Show context before navigation.
- Explain agent activity in human terms, not only status labels.
- Never hide approval requirements for money, pricing, brand, or external side effects.
- Surface risk, budget exposure, experiment duration, and expected impact before approval.
- Surface statistical evidence before declaring an experiment winner.
- Surface automatic pauses, incidents, and kill-switch actions immediately.
- Keep advanced details available through progressive disclosure.
- The interface must feel operational, calm, and guided—not like an ERP dashboard.

## Guided operating flow

```text
Company context
  → Current objective
  → AI recommendation
  → Human discussion or approval
  → Controlled execution
  → Measured result
  → Evidence-based evaluation
  → Learning
  → Next recommendation
```

## Main product surfaces

- Public/onboarding: explain value quickly and collect company context conversationally.
- Admin Central: platform portfolio, billing, infrastructure, policies, and support.
- Company Command Center: the default customer experience.
- Agent Workspace: deep inspection of a specific agent, its mission, tools, memory, autonomy, and evaluation.

## Acceptance criteria for the next UI iteration

- The Command Center communicates what is happening within five seconds.
- The owner can understand what needs attention without opening multiple modules.
- The owner can express a business goal in natural language.
- Recommendations include expected impact, cost, duration, risk, and approval state.
- Execution activity describes meaningful work performed by agents.
- Safety and statistical evidence are visible at the moment they matter.
- Navigation is secondary to context and conversation.
