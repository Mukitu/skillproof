import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { LanguageProvider } from './context/LanguageContext';
import { CompanyAuthProvider } from './context/CompanyAuthContext';
import { CompanySubscriptionProvider } from './context/CompanySubscriptionContext';
import { ProtectedRoute, AdminRoute } from './components/auth/ProtectedRoute';
import { CompanyProtectedRoute } from './components/auth/CompanyProtectedRoute';
import { PublicOnlyRoute } from './components/auth/AuthAwareRoute';
import { SubscriptionGuard } from './components/auth/SubscriptionGuard';
import { AppErrorBoundary } from './components/error/AppErrorBoundary';


import { UserLayout } from './components/layout/UserLayout';
import { AdminLayout } from './components/layout/AdminLayout';


import { LandingPage } from './pages/public/LandingPage';
import { HowItWorksPage } from './pages/public/HowItWorksPage';
import { AboutPage } from './pages/public/AboutPage';
import { EmployerVerificationPortal } from './pages/public/EmployerVerificationPortal';
import { CompanyJobsPublicPage } from './pages/public/CompanyJobsPublicPage';
import { CompanyJobDetailPublicPage } from './pages/public/CompanyJobDetailPublicPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { SubscriptionPage } from './pages/auth/SubscriptionPage';
import { SubscriptionOtpPage } from './pages/auth/SubscriptionOtpPage';

import { CompanyPendingPage } from './pages/company/CompanyPendingPage';
import { CompanyDashboardPage } from './pages/company/CompanyDashboardPage';
import { CompanyProfilePage } from './pages/company/CompanyProfilePage';
import { CompanySettingsPage } from './pages/company/CompanySettingsPage';
import { CompanyComingSoonPage } from './pages/company/CompanyComingSoonPage';
import { CompanyCandidatesPage } from './pages/company/CompanyCandidatesPage';
import { CompanyApplicationsPage } from './pages/company/CompanyApplicationsPage';
import { CompanyShortlistPage } from './pages/company/CompanyShortlistPage';
import { CompanyInterviewsPage } from './pages/company/CompanyInterviewsPage';
import { CompanyMessagesPage } from './pages/company/CompanyMessagesPage';
import { CompanyJobsListPage } from './pages/company/CompanyJobsListPage';
import { CompanyJobCreatePage } from './pages/company/CompanyJobCreatePage';
import { CompanyJobEditPage } from './pages/company/CompanyJobEditPage';
import { CompanyJobDetailPage } from './pages/company/CompanyJobDetailPage';
import { CompanyOtpPage } from './pages/company/CompanyOtpPage';
import { CompanySubscriptionPage } from './pages/company/CompanySubscriptionPage';
import { CompanySubscriptionOtpPage } from './pages/company/CompanySubscriptionOtpPage';
import { CompanyLayout } from './components/layout/CompanyLayout';


import { UserDashboard } from './pages/user/UserDashboard';
import { AICareerProfilePage } from './pages/user/AICareerProfilePage';
import { ComingSoonPage } from './pages/user/ComingSoonPage';
import { CareerRoadmapPage } from './pages/user/CareerRoadmapPage';
import { UniversalAssessmentPage } from './pages/user/UniversalAssessmentPage';
import { SkillPassportPage } from './pages/user/SkillPassportPage';
import { UserJobPortalPage } from './pages/user/UserJobPortalPage';
import { JobDetailPage } from './pages/user/JobDetailPage';
import { UserInterviewsPage } from './pages/user/UserInterviewsPage';
import { UserMessagesPage } from './pages/user/UserMessagesPage';
import { UserSettingsPage } from './pages/user/UserSettingsPage';
import { AICareerMentorPage } from './pages/user/AICareerMentorPage';
import { AICareerCenterPage } from './pages/user/AICareerCenterPage'; 
import { AICareerIntelligencePage } from './pages/user/AICareerIntelligencePage';
import { InterviewReportPage } from './pages/user/InterviewReportPage';





import { NotificationsPage } from './pages/user/NotificationsPage';
import { InvitationsPage } from './pages/user/InvitationsPage';


import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRoadmapTemplatesPage from './pages/admin/AdminRoadmapTemplatesPage';
import AdminSkillVerificationPage from './pages/admin/AdminSkillVerificationPage';
import AdminAssessmentReviewPage from './pages/admin/AdminAssessmentReviewPage';
import AdminPassportReviewPage from './pages/admin/AdminPassportReviewPage';
import AdminPassportRenewalPage from './pages/admin/AdminPassportRenewalPage';
import AdminRoadmapCompletionReviewPage from './pages/admin/AdminRoadmapCompletionReviewPage';
import AdminRoadmapModuleExamReviewPage from './pages/admin/AdminRoadmapModuleExamReviewPage';
import AdminCourseCertificatesPage from './pages/admin/AdminCourseCertificatesPage';
import AdminJobsPage from './pages/admin/AdminJobsPage';
import AdminTaxonomyPage from './pages/admin/AdminTaxonomyPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage';
import AdminAuditLogsPage from './pages/admin/AdminAuditLogsPage';
import AdminGovernancePage from './pages/admin/AdminGovernancePage';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage';
import AdminEmployerVerificationsPage from './pages/admin/AdminEmployerVerificationsPage';
import AdminCompaniesPage from './pages/admin/AdminCompaniesPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';

export function AppRoutes() {
  return (
    <Routes>
      {}
      <Route path="/verify" element={<EmployerVerificationPortal />} />
      <Route path="/company-jobs" element={<CompanyJobsPublicPage />} />
      <Route path="/company-jobs/detail" element={<CompanyJobDetailPublicPage />} />

      {}
      <Route path="/passport" element={<PassportRedirect />} />
      <Route path="/passport/:id" element={<PassportRedirect />} />
      <Route path="/profile/:id" element={<ProfileRedirect />} />
      <Route path="/certificate/:id" element={<CertificateRedirect />} />

      {}
      <Route element={<PublicOnlyRoute />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {}
      <Route path="/company/pending" element={<CompanyPendingPage />} />
      <Route path="/company/verify" element={<CompanyOtpPage />} />

      {}
      <Route element={<SubscriptionGuard />}>
        <Route path="/subscription" element={<SubscriptionPage />} />
        <Route path="/subscription/otp" element={<SubscriptionOtpPage />} />
      </Route>

      {}
      <Route element={<SubscriptionGuard />}>
        <Route path="/dashboard" element={<UserLayout />}>
          <Route index element={<UserDashboard />} />
          <Route path="profile" element={<AICareerProfilePage />} />
          {}
          <Route path="skillproof-ml" element={<AICareerIntelligencePage />} />
          <Route path="ai-center" element={<Navigate to="/dashboard/skillproof-ml" replace />} />
          <Route path="ai-career-intelligence" element={<Navigate to="/dashboard/skillproof-ml" replace />} />
          <Route path="coming-soon" element={<ComingSoonPage />} />
          <Route path="roadmap" element={<CareerRoadmapPage />} />
          <Route path="roadmap/:enrollmentId" element={<CareerRoadmapPage />} />
          <Route path="roadmap/:enrollmentId/day/:dayNumber" element={<CareerRoadmapPage />} />
          <Route path="verify" element={<UniversalAssessmentPage />} />
          <Route path="passport" element={<SkillPassportPage />} />
          <Route path="mentor" element={<AICareerMentorPage />} />
          <Route path="mentor/report/:sessionId" element={<InterviewReportPage />} />
          {}
          <Route path="interview-history" element={<Navigate to="mentor" replace />} />
          <Route path="jobs" element={<UserJobPortalPage />} />
          <Route path="jobs/:jobId" element={<JobDetailPage />} />
          <Route path="interviews" element={<UserInterviewsPage />} />
          <Route path="messages" element={<UserMessagesPage />} />
          {}
          <Route path="user-profile" element={<Navigate to="profile?tab=edit" replace />} />
          <Route path="settings" element={<UserSettingsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="invitations" element={<InvitationsPage />} />
        </Route>
      </Route>

      {}
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="roadmap-templates" element={<AdminRoadmapTemplatesPage />} />
          <Route path="skill-verification" element={<AdminSkillVerificationPage />} />
          <Route path="assessment-review" element={<AdminAssessmentReviewPage />} />
          <Route path="passport-review" element={<AdminPassportReviewPage />} />
          <Route path="passport-renewals" element={<AdminPassportRenewalPage />} />
          <Route path="roadmap-completion" element={<AdminRoadmapCompletionReviewPage />} />
          <Route path="roadmap-module-exams" element={<AdminRoadmapModuleExamReviewPage />} />
          <Route path="course-certificates" element={<AdminCourseCertificatesPage />} />
          <Route path="jobs" element={<AdminJobsPage />} />
          <Route path="taxonomy" element={<AdminTaxonomyPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="users/:id" element={<AdminUserDetailPage />} />
          <Route path="audit-logs" element={<AdminAuditLogsPage />} />
          <Route path="governance" element={<AdminGovernancePage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          <Route path="employer-verifications" element={<AdminEmployerVerificationsPage />} />
          <Route path="companies" element={<AdminCompaniesPage />} />
          <Route path="admin-settings" element={<AdminSettingsPage />} />
        </Route>
      </Route>

      {}
      <Route element={<CompanyProtectedRoute />}>
        <Route path="/company/subscription" element={<CompanySubscriptionPage />} />
        <Route path="/company/subscription/otp" element={<CompanySubscriptionOtpPage />} />
        <Route path="/company/verify" element={<CompanyOtpPage />} />
        <Route path="/company" element={<CompanyLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<CompanyDashboardPage />} />
          <Route path="profile" element={<CompanyProfilePage />} />
          <Route path="settings" element={<CompanySettingsPage />} />
          <Route path="jobs" element={<CompanyJobsListPage />} />
          <Route path="jobs/create" element={<CompanyJobCreatePage />} />
          <Route path="jobs/:jobId/edit" element={<CompanyJobEditPage />} />
          <Route path="jobs/:jobId" element={<CompanyJobDetailPage />} />
          <Route path="candidates" element={<CompanyCandidatesPage />} />
          <Route path="applications" element={<CompanyApplicationsPage />} />
          <Route path="shortlisted" element={<CompanyShortlistPage />} />
          <Route path="interviews" element={<CompanyInterviewsPage />} />
          <Route path="messages" element={<CompanyMessagesPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <AppErrorBoundary label="App">
      <Router>
        <LanguageProvider>
          <AuthProvider>
            <SubscriptionProvider>
              <CompanyAuthProvider>
                <CompanySubscriptionProvider>
                  <AppErrorBoundary label="Routes">
                    <AppRoutes />
                  </AppErrorBoundary>
                </CompanySubscriptionProvider>
              </CompanyAuthProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </LanguageProvider>
      </Router>
    </AppErrorBoundary>
  );
}

export default App;


/**
 * Friendly legacy /passport/:id aliases — every QR code, share link, or
 * bookmark that ever pointed at the old single-passport page now lands on
 * the unified /verify portal with the Passport ID pre-filled.
 *
 * Accepts BOTH path-param style (`/passport/SP-BD-…`) AND query-string
 * style (`/passport?id=SP-BD-…`) so any existing share URL keeps working.
 */
function PassportRedirect() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const queryId = params.get('id');
  const finalId = (queryId ?? id ?? '').trim();
  const target = finalId
    ? `/verify?id=${encodeURIComponent(finalId)}`
    : '/verify';
  return <Navigate to={target} replace />;
}

function ProfileRedirect() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const queryId = params.get('id');
  const finalId = (queryId ?? id ?? '').trim();
  const target = finalId
    ? `/verify?id=${encodeURIComponent(finalId)}`
    : '/verify';
  return <Navigate to={target} replace />;
}

function CertificateRedirect() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const queryId = params.get('id');
  const finalId = (queryId ?? id ?? '').trim();
  const target = finalId
    ? `/verify?id=${encodeURIComponent(finalId)}`
    : '/verify';
  return <Navigate to={target} replace />;
}
