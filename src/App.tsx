import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ProtectedRoute, AdminRoute } from './components/auth/ProtectedRoute';

// Layouts
import { UserLayout } from './components/layout/UserLayout';
import { AdminLayout } from './components/layout/AdminLayout';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { HowItWorksPage } from './pages/public/HowItWorksPage';
import { AboutPage } from './pages/public/AboutPage';
import { PublicVerificationPage } from './pages/public/PublicVerificationPage';
import { EmployerVerificationPortal } from './pages/public/EmployerVerificationPortal';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

// User Pages
import { UserDashboard } from './pages/user/UserDashboard';
import { AICareerProfilePage } from './pages/user/AICareerProfilePage';
import { CareerRoadmapPage } from './pages/user/CareerRoadmapPage';
import { UniversalAssessmentPage } from './pages/user/UniversalAssessmentPage';
import { SkillPassportPage } from './pages/user/SkillPassportPage';
import { UserJobPortalPage } from './pages/user/UserJobPortalPage';
import { UserProfilePage } from './pages/user/UserProfilePage';
import { UserSettingsPage } from './pages/user/UserSettingsPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRoadmapTemplatesPage from './pages/admin/AdminRoadmapTemplatesPage';
import AdminSkillVerificationPage from './pages/admin/AdminSkillVerificationPage';
import AdminAssessmentReviewPage from './pages/admin/AdminAssessmentReviewPage';
import AdminPassportReviewPage from './pages/admin/AdminPassportReviewPage';
import AdminPassportRenewalPage from './pages/admin/AdminPassportRenewalPage';
import AdminJobsPage from './pages/admin/AdminJobsPage';
import AdminTaxonomyPage from './pages/admin/AdminTaxonomyPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage';
import AdminAuditLogsPage from './pages/admin/AdminAuditLogsPage';
import AdminGovernancePage from './pages/admin/AdminGovernancePage';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage';
import AdminEmployerVerificationsPage from './pages/admin/AdminEmployerVerificationsPage';

export function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/passport/:passportNumber" element={<PublicVerificationPage />} />
      <Route path="/verify" element={<EmployerVerificationPortal />} />
      <Route path="/verify/:passportNumber" element={<EmployerVerificationPortal />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* User dashboard */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<UserLayout />}>
          <Route index element={<UserDashboard />} />
          <Route path="profile" element={<AICareerProfilePage />} />
          <Route path="roadmap" element={<CareerRoadmapPage />} />
          <Route path="roadmap/:enrollmentId" element={<CareerRoadmapPage />} />
          <Route path="roadmap/:enrollmentId/day/:dayNumber" element={<CareerRoadmapPage />} />
          <Route path="verify" element={<UniversalAssessmentPage />} />
          <Route path="passport" element={<SkillPassportPage />} />
          <Route path="jobs" element={<UserJobPortalPage />} />
          <Route path="user-profile" element={<UserProfilePage />} />
          <Route path="settings" element={<UserSettingsPage />} />
        </Route>
      </Route>

      {/* Admin */}
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="roadmap-templates" element={<AdminRoadmapTemplatesPage />} />
          <Route path="skill-verification" element={<AdminSkillVerificationPage />} />
          <Route path="assessment-review" element={<AdminAssessmentReviewPage />} />
          <Route path="passport-review" element={<AdminPassportReviewPage />} />
          <Route path="passport-renewals" element={<AdminPassportRenewalPage />} />
          <Route path="jobs" element={<AdminJobsPage />} />
          <Route path="taxonomy" element={<AdminTaxonomyPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="users/:id" element={<AdminUserDetailPage />} />
          <Route path="audit-logs" element={<AdminAuditLogsPage />} />
          <Route path="governance" element={<AdminGovernancePage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          <Route path="employer-verifications" element={<AdminEmployerVerificationsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <Router>
      <LanguageProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </LanguageProvider>
    </Router>
  );
}

export default App;
