import { Suspense, lazy } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { LoadingState } from '../components/ui'
import { useAuth } from '../features/auth/auth-context'
import { LoginPage, RegisterPage } from '../features/auth'
import { AdminShell, AppShell } from '../components/layout'
import { DashboardPage } from '../features/dashboard/pages/DashboardPage'

/*
 * Only the sign-in screens and the dashboard are worth loading up front. The
 * rest arrives when a worker actually opens it, which matters on a cheap phone
 * over a slow connection — charts and the admin desk are the heaviest pieces
 * here and most sessions never touch them.
 */
const RecordsPage = lazy(() => import('../features/income/pages/RecordsPage').then((m) => ({ default: m.RecordsPage })))
const TrendsPage = lazy(() => import('../features/trends/pages/TrendsPage').then((m) => ({ default: m.TrendsPage })))
const ImportsPage = lazy(() => import('../features/mpesa/pages/ImportsPage').then((m) => ({ default: m.ImportsPage })))
const StatementsPage = lazy(() => import('../features/statements/pages/StatementsPage').then((m) => ({ default: m.StatementsPage })))
const StatementDetailPage = lazy(() => import('../features/statements/pages/StatementDetailPage').then((m) => ({ default: m.StatementDetailPage })))
const SharedStatementPage = lazy(() => import('../features/statements/pages/SharedStatementPage').then((m) => ({ default: m.SharedStatementPage })))
const ProfilePage = lazy(() => import('../features/profile/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const AdminOverviewPage = lazy(() => import('../features/admin/pages/AdminOverviewPage').then((m) => ({ default: m.AdminOverviewPage })))
const AdminWorkersPage = lazy(() => import('../features/admin/pages/AdminWorkersPage').then((m) => ({ default: m.AdminWorkersPage })))
const AdminWorkerDetailPage = lazy(() => import('../features/admin/pages/AdminWorkerDetailPage').then((m) => ({ default: m.AdminWorkerDetailPage })))

function ProtectedRoute() {
  const { status, user } = useAuth()
  const location = useLocation()
  if (status === 'booting') return <LoadingState label="Opening your record" />
  if (!user) return <Navigate replace state={{ from: location }} to="/login" />
  // An admin has no income of their own, so the worker dashboard would only
  // ever show them zeros.
  if (user.role === 'admin') return <Navigate replace to="/admin" />
  return <Outlet />
}

function AdminRoute() {
  const { status, user } = useAuth()
  const location = useLocation()
  if (status === 'booting') return <LoadingState label="Opening the verification desk" />
  if (!user) return <Navigate replace state={{ from: location }} to="/login" />
  if (user.role !== 'admin') return <Navigate replace to="/app" />
  return <Outlet />
}

function AuthRoute() {
  const { status, user } = useAuth()
  if (status === 'booting') return <LoadingState label="Opening your record" />
  if (user) return <Navigate replace to={user.role === 'admin' ? '/admin' : '/app'} />
  return <Outlet />
}

export function AppRouter() {
  return (
    <Suspense fallback={<LoadingState label="Opening your record" />}>
    <Routes>
      {/* Public: a lender opens this with no account and no session. */}
      <Route element={<SharedStatementPage />} path="/s/:token" />
      <Route element={<AuthRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />} path="/app">
          <Route index element={<DashboardPage />} />
          <Route path="records" element={<RecordsPage />} />
          <Route path="trends" element={<TrendsPage />} />
          <Route path="imports" element={<ImportsPage />} />
          <Route path="statements" element={<StatementsPage />} />
          <Route path="statements/:statementId" element={<StatementDetailPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>
      <Route element={<AdminRoute />}>
        <Route element={<AdminShell />} path="/admin">
          <Route index element={<AdminOverviewPage />} />
          <Route path="workers" element={<AdminWorkersPage />} />
          <Route path="workers/:workerId" element={<AdminWorkerDetailPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>
      <Route element={<Navigate replace to="/app" />} path="*" />
    </Routes>
    </Suspense>
  )
}
