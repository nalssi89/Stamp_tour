import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth.jsx'
import { ROUTES } from './constants'

// Auth components
import LoginForm from './components/auth/LoginForm'
import SignUpForm from './components/auth/SignUpForm'
import ProtectedRoute from './components/auth/ProtectedRoute'

// Layout
import Layout from './components/common/Layout'

// User components
import Dashboard from './components/user/Dashboard'
import MatchRequest from './components/user/MatchRequest'
import MatchResult from './components/user/MatchResult'
import LunchRecord from './components/user/LunchRecord'
import MyStats from './components/user/MyStats'
import Ranking from './components/user/Ranking'

// Admin components
import AdminDashboard from './components/admin/AdminDashboard'
import EmployeeManagement from './components/admin/EmployeeManagement'
import MatchingManagement from './components/admin/MatchingManagement'
import AdminStats from './components/admin/AdminStats'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path={ROUTES.LOGIN} element={<LoginForm />} />
          <Route path={ROUTES.SIGNUP} element={<SignUpForm />} />

          {/* Protected routes */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
            <Route path={ROUTES.MATCH_REQUEST} element={<MatchRequest />} />
            <Route path={ROUTES.MATCH_RESULT} element={<MatchResult />} />
            <Route path={ROUTES.LUNCH_RECORD} element={<LunchRecord />} />
            <Route path={ROUTES.MY_STATS} element={<MyStats />} />
            <Route path={ROUTES.RANKING} element={<Ranking />} />
          </Route>

          {/* Admin routes */}
          <Route
            element={
              <ProtectedRoute adminOnly>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path={ROUTES.ADMIN} element={<AdminDashboard />} />
            <Route path={ROUTES.ADMIN_EMPLOYEES} element={<EmployeeManagement />} />
            <Route path={ROUTES.ADMIN_MATCHING} element={<MatchingManagement />} />
            <Route path={ROUTES.ADMIN_STATS} element={<AdminStats />} />
          </Route>

          {/* Redirect root to dashboard or login */}
          <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.DASHBOARD} replace />} />

          {/* 404 */}
          <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
