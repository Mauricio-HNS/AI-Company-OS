import { redirect } from 'next/navigation';
import { requireOwner } from '../../lib/auth/require-auth';
import PortfolioPage from '../portfolio/page';

export default function Dash1Page() {
  const auth=requireOwner();
  if(!auth) redirect('/login');
  return <PortfolioPage />;
}
