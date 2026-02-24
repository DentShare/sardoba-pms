import { redirect } from 'next/navigation';

/**
 * Dashboard root page - redirects to /calendar (the chess board view).
 */
export default function DashboardPage() {
  redirect('/calendar');
}
