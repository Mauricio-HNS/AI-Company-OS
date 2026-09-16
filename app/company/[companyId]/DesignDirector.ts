/**
 * AI Company OS — Design Director
 *
 * Single source of truth for product-level visual decisions.
 * New screens should consume these tokens/patterns instead of inventing
 * page-specific visual language.
 */
export const DESIGN_DIRECTOR = {
  product: 'AI Company OS',
  visualLanguage: 'premium enterprise dark SaaS',
  principles: [
    'consistent hierarchy',
    'intentional spacing',
    'restrained effects',
    'clear information density',
    'same component language across every module',
  ],
  tokens: {
    radius: { sm: 8, md: 12, lg: 16 },
    spacing: { xs: 6, sm: 10, md: 14, lg: 20, xl: 28 },
    accent: '#3B8CFF',
    success: '#55C99A',
    danger: '#E36B75',
    background: '#07131B',
    surface: '#0B1B25',
    surfaceRaised: '#0F232E',
    border: '#173442',
    text: '#EAF2F4',
    muted: '#78909B',
  },
  rules: {
    useSharedShell: true,
    useSharedPanels: true,
    useSharedTypography: true,
    useSharedStatus: true,
    useSharedActions: true,
    avoidPageSpecificColors: true,
    avoidDecorativeGradients: true,
  },
} as const;
