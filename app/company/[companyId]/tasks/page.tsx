import TasksPageClient from './TasksPageClient';

const companies = ['alpha', 'beta', 'gamma'];

export function generateStaticParams() {
  return companies.map((companyId) => ({ companyId }));
}

export default function TasksPage({ params }: { params: { companyId: string } }) {
  return <TasksPageClient companyId={params.companyId} />;
}
