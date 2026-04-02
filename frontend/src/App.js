import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MaintenancePage from './pages/MaintenancePage';
import ToastContainer from './components/ToastContainer';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ContactPage from './pages/ContactPage';
import TermsPage from './pages/TermsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import GoalsPage from './pages/GoalsPage';
import GoalDetailPage from './pages/GoalDetailPage';
import CalendarPage from './pages/CalendarPage';
import SettingsPage from './pages/SettingsPage';
import UserDashboardPage from './pages/UserDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminUserDetailPage from './pages/AdminUserDetailPage';
import AdminLogsPage from './pages/AdminLogsPage';
import AdminLogDetailPage from './pages/AdminLogDetailPage';
import AdminCvSitesPage from './pages/AdminCvSitesPage';
import MyCvPage from './pages/MyCvPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import CvPlatformAdminRoute from './components/CvPlatformAdminRoute';
import { initPushNotificationsOnce } from './utils/pushNotifications';

function applyDarkModeFromStorage() {
  try {
    const raw = localStorage.getItem('user_settings');
    const stored = raw ? JSON.parse(raw) : {};
    if (stored.darkMode === true) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {
    document.documentElement.classList.remove('dark');
  }
}

function App() {
  const [isBackendDown, setIsBackendDown] = useState(false);

  useEffect(() => {
    applyDarkModeFromStorage();
    const settingsHandler = () => applyDarkModeFromStorage();
    const downHandler = () => setIsBackendDown(true);
    const upHandler = () => setIsBackendDown(false);

    // Fire-and-forget; skips if not supported or permission denied.
    initPushNotificationsOnce();

    window.addEventListener('userSettingsUpdated', settingsHandler);
    window.addEventListener('backendUnavailable', downHandler);
    window.addEventListener('backendAvailable', upHandler);
    return () => {
      window.removeEventListener('userSettingsUpdated', settingsHandler);
      window.removeEventListener('backendUnavailable', downHandler);
      window.removeEventListener('backendAvailable', upHandler);
    };
  }, []);

  if (isBackendDown) {
    return <MaintenancePage onRecovered={() => setIsBackendDown(false)} />;
  }

  return (
    <Router>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/term" element={<TermsPage />} />
        <Route path="/conditions" element={<PrivacyPolicyPage />} />
        {/* Protected Routes - Require Authentication */}
        <Route path="/daily" element={<Navigate to="/calendar" replace />} />
        <Route path="/goals" element={
          <ProtectedRoute>
            <GoalsPage />
          </ProtectedRoute>
        } />
        <Route path="/goals/:id" element={
          <ProtectedRoute>
            <GoalDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/calendar" element={
          <ProtectedRoute>
            <CalendarPage />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        } />
        <Route path="/settings/general" element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        } />
        <Route path="/settings/goals" element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        } />
        <Route path="/settings/notification" element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        } />
        <Route path="/settings/security" element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <UserDashboardPage />
          </ProtectedRoute>
        } />

        {/* Admin Routes - Require Admin Role */}
        <Route path="/admin/dashboard" element={
          <AdminRoute>
            <AdminDashboardPage />
          </AdminRoute>
        } />
        <Route path="/admin/users" element={
          <AdminRoute>
            <AdminUsersPage />
          </AdminRoute>
        } />
        <Route path="/admin/users/:id" element={
          <AdminRoute>
            <AdminUserDetailPage />
          </AdminRoute>
        } />
        <Route path="/admin/logs" element={
          <AdminRoute>
            <AdminLogsPage />
          </AdminRoute>
        } />
        <Route path="/admin/logs/:fileName" element={
          <AdminRoute>
            <AdminLogDetailPage />
          </AdminRoute>
        } />
        <Route path="/admin/cv-sites" element={
          <CvPlatformAdminRoute>
            <AdminCvSitesPage />
          </CvPlatformAdminRoute>
        } />
        <Route path="/cv" element={
          <ProtectedRoute>
            <MyCvPage />
          </ProtectedRoute>
        } />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;

