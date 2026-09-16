import AgentsPageClient from './AgentsPageClient';

const companies = ['alpha', 'beta', 'gamma'];

export function generateStaticParams() {
  return companies.map((companyId) => ({ companyId }));
}

export default function AgentsPage({ params }: { params: { companyId: string } }) {
  return <AgentsPageClient companyId={params.companyId} />;
}
