import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { LoadingState } from '../components/ui'
import { useAuth } from '../features/auth/auth-context'
import { LoginPage, RegisterPage } from '../features/auth'
import { AdminShell, AppShell } from '../components/layout'
import { AdminOverviewPage, AdminWorkerDetailPage, AdminWorkersPage } from '../features/admin'
import { DashboardPage } from '../features/dashboard/pages/DashboardPage'
import { ImportsPage } from '../features/mpesa/pages/ImportsPage'
import { ProfilePage } from '../features/profile/pages/ProfilePage'
import { RecordsPage } from '../features/income/pages/RecordsPage'
import { StatementDetailPage } from '../features/statements/pages/StatementDetailPage'
import { StatementsPage } from '../features/statements/pages/StatementsPage'
import { TrendsPage } from '../features/trends/pages/TrendsPage'

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
    <Routes>
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
  )
}
