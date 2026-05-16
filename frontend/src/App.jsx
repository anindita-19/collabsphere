
import AcceptInvite from '@/pages/AcceptInvite'

import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import useAppStore from '@/store/appStore'
import AppLayout from '@/components/layout/AppLayout'
import LoadingScreen from '@/components/ui/LoadingScreen'

// Lazy-loaded pages
const Landing = lazy(() => import('@/pages/Landing'))
const Login = lazy(() => import('@/pages/Login'))
const Register = lazy(() => import('@/pages/Register'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const WorkspacePage = lazy(() => import('@/pages/WorkspacePage'))
const ProjectPage = lazy(() => import('@/pages/ProjectPage'))
const KanbanPage = lazy(() => import('@/pages/KanbanPage'))
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'))
const DocumentsPage = lazy(() => import('@/pages/DocumentsPage'))
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuthStore()
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  const { initAuth } = useAuthStore()
  const { initTheme } = useAppStore()

  useEffect(() => {
    initAuth()
    initTheme()
  }, [])

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Protected */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/workspace/:workspaceId" element={<WorkspacePage />} />
          <Route path="/workspace/:workspaceId/project/:projectId" element={<ProjectPage />} />
          <Route path="/workspace/:workspaceId/project/:projectId/kanban" element={<KanbanPage />} />
          <Route path="/workspace/:workspaceId/project/:projectId/analytics" element={<AnalyticsPage />} />
          <Route path="/workspace/:workspaceId/project/:projectId/docs" element={<DocumentsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="/invite/accept" element={<AcceptInvite />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
