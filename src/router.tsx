import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/auth/Login'
import { AuthCallback } from './pages/auth/Callback'
import { Claim } from './pages/auth/Claim'
import { Passport } from './pages/customer/Passport'
import { MerchantDashboard } from './pages/merchant/Dashboard'
import { MerchantSettings } from './pages/merchant/Settings'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/passport" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/auth/callback',
    element: <AuthCallback />,
  },
  {
    path: '/claim',
    element: <Claim />,
  },
  {
    path: '/passport',
    element: (
      <ProtectedRoute>
        <Passport />
      </ProtectedRoute>
    ),
  },
  {
    path: '/passport/:merchantSlug',
    element: (
      <ProtectedRoute>
        <Passport />
      </ProtectedRoute>
    ),
  },
  {
    path: '/m/:merchantSlug',
    element: (
      <ProtectedRoute>
        <MerchantDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/m/:merchantSlug/settings',
    element: (
      <ProtectedRoute>
        <MerchantSettings />
      </ProtectedRoute>
    ),
  },
])
