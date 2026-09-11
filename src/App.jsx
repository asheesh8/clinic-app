import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useAuth } from './hooks/useAuth'
import { TERMS_VERSION } from './lib/legal'
import AppLayout from './components/layout/AppLayout'
import ConsentScreen from './components/ConsentScreen'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Terms from './pages/legal/Terms'
import Dashboard from './pages/dashboard/Dashboard'
import Profile from './pages/profile/Profile'
import PersonProfile from './pages/people/PersonProfile'
import Workflow from './pages/workflow/Workflow'
import Similarity from './pages/similarity/Similarity'
import Network from './pages/network/Network'
import CustomWorkflow from './pages/workflow/CustomWorkflow'
import OrgProfile from './pages/org/OrgProfile'
import Messages from './pages/messages/Messages'
import Settings from './pages/settings/Settings'

function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuthStore()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (profile && profile.terms_version !== TERMS_VERSION) return <ConsentScreen />
  return <AppLayout>{children}</AppLayout>
}

function PublicRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  useAuth()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/people/:uid" element={<ProtectedRoute><PersonProfile /></ProtectedRoute>} />
        <Route path="/workflow" element={<ProtectedRoute><Workflow /></ProtectedRoute>} />
        <Route path="/similarity" element={<ProtectedRoute><Similarity /></ProtectedRoute>} />
        <Route path="/compatibility" element={<Navigate to="/similarity" replace />} />
        <Route path="/network" element={<ProtectedRoute><Network /></ProtectedRoute>} />
        <Route path="/workflow/custom" element={<ProtectedRoute><CustomWorkflow /></ProtectedRoute>} />
        <Route path="/org" element={<ProtectedRoute><OrgProfile /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
