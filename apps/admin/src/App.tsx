import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, createMemoryRouter, Navigate, RouterProvider } from 'react-router';

import { AuthProvider } from '@/lib/auth';
import { IS_DEMO } from '@/lib/env';
import { ToastProvider } from '@/ui/kit';
import { Layout } from '@/ui/Layout';

import AuditPage from '@/pages/AuditPage';
import DashboardPage from '@/pages/DashboardPage';
import LoginPage from '@/pages/LoginPage';
import MemberDetailPage from '@/pages/MemberDetailPage';
import MembersPage from '@/pages/MembersPage';
import OffersPage from '@/pages/OffersPage';
import OrdersPage from '@/pages/OrdersPage';
import ProgramDetailPage from '@/pages/ProgramDetailPage';
import ProgramsPage from '@/pages/ProgramsPage';
import RulesPage from '@/pages/RulesPage';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

// Bản demo chạy trong trang nhúng → giữ đường dẫn trong bộ nhớ, không đổi địa chỉ trang.
const router = (IS_DEMO ? createMemoryRouter : createBrowserRouter)([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'members', element: <MembersPage /> },
      { path: 'members/:id', element: <MemberDetailPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'rules', element: <RulesPage /> },
      { path: 'offers', element: <OffersPage /> },
      { path: 'programs', element: <ProgramsPage /> },
      { path: 'programs/:id', element: <ProgramDetailPage /> },
      { path: 'audit', element: <AuditPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
