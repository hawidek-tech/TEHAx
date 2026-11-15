import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { AnnouncerProvider } from '../a11y/announcer'
import { AudioGuideProvider } from '../a11y/audioGuide'
import { PreferencesProvider } from '../a11y/preferences'
import { Loading } from '../design-system/Layout'
import { useT } from '../i18n/useT'
import { SessionProvider } from '../lib/session'
import { AppShell } from './AppShell'
import { RequireAuth } from './guards'

// Route-level code splitting keeps the first download small on slow connections.
const WelcomePage = lazy(() => import('../features/onboarding/WelcomePage'))
const PreviewPage = lazy(() => import('../features/onboarding/PreviewPage'))
const RegisterPage = lazy(() => import('../features/onboarding/RegisterPage'))
const SignInPage = lazy(() => import('../features/onboarding/SignInPage'))
const ProfileFlowPage = lazy(() => import('../features/onboarding/ProfileFlowPage'))
const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage'))
const JobsPage = lazy(() => import('../features/jobs/JobsPage'))
const JobDetailPage = lazy(() => import('../features/jobs/JobDetailPage'))
const SavedJobsPage = lazy(() => import('../features/jobs/SavedJobsPage'))
const ApplyPage = lazy(() => import('../features/applications/ApplyPage'))
const ApplicationsPage = lazy(() => import('../features/applications/ApplicationsPage'))
const ApplicationDetailPage = lazy(() => import('../features/applications/ApplicationDetailPage'))
const ProfilePage = lazy(() => import('../features/profile/ProfilePage'))
const ProfileEditPage = lazy(() => import('../features/profile/ProfileEditPage'))
const SupportPage = lazy(() => import('../features/support/SupportPage'))
const SupportRequestPage = lazy(() => import('../features/support/SupportRequestPage'))
const IdentityPage = lazy(() => import('../features/support/IdentityPage'))
const SettingsPage = lazy(() => import('../features/settings/SettingsPage'))
const AccountPage = lazy(() => import('../features/settings/AccountPage'))
const HelpPage = lazy(() => import('../features/help/HelpPage'))
const EmployerDashboard = lazy(() => import('../features/employer/EmployerDashboard'))
const EmployerJobForm = lazy(() => import('../features/employer/EmployerJobForm'))
const EmployerApplications = lazy(() => import('../features/employer/EmployerApplications'))
const StaffPage = lazy(() => import('../features/staff/StaffPage'))
const DevelopersPage = lazy(() => import('../features/info/DevelopersPage'))
const PrivacyPage = lazy(() => import('../features/info/PrivacyPage'))
const AccessibilityStatementPage = lazy(() => import('../features/info/AccessibilityStatementPage'))
const NotFoundPage = lazy(() => import('../features/info/NotFoundPage'))
const EmbedPage = lazy(() => import('../features/embed/EmbedPage'))
const AssistantPage = lazy(() => import('../assistant/AssistantPage'))

function Fallback() {
  const t = useT()
  return <Loading label={t('app.loading')} />
}

export function AppRoutes() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route path="/embed/:component" element={<EmbedPage />} />
        <Route
          path="*"
          element={
            <AppShell>
              <Suspense fallback={<Fallback />}>
                <Routes>
                  <Route path="/" element={<WelcomePage />} />
                  <Route path="/preview" element={<PreviewPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/sign-in" element={<SignInPage />} />
                  <Route path="/assistant" element={<AssistantPage />} />
                  <Route path="/jobs" element={<JobsPage />} />
                  <Route path="/jobs/:id" element={<JobDetailPage />} />
                  <Route path="/help" element={<HelpPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/developers" element={<DevelopersPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/accessibility" element={<AccessibilityStatementPage />} />
                  <Route
                    path="/onboarding"
                    element={
                      <RequireAuth>
                        <ProfileFlowPage />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <RequireAuth>
                        <DashboardPage />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/saved"
                    element={
                      <RequireAuth>
                        <SavedJobsPage />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/jobs/:id/apply"
                    element={
                      <RequireAuth>
                        <ApplyPage />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/applications"
                    element={
                      <RequireAuth>
                        <ApplicationsPage />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/applications/:id"
                    element={
                      <RequireAuth>
                        <ApplicationDetailPage />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <RequireAuth>
                        <ProfilePage />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/profile/edit"
                    element={
                      <RequireAuth>
                        <ProfileEditPage />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/support"
                    element={
                      <RequireAuth>
                        <SupportPage />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/support/new"
                    element={
                      <RequireAuth>
                        <SupportRequestPage />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/identity"
                    element={
                      <RequireAuth>
                        <IdentityPage />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/account"
                    element={
                      <RequireAuth>
                        <AccountPage />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/employer"
                    element={
                      <RequireAuth requiredRole="EMPLOYER">
                        <EmployerDashboard />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/employer/jobs/new"
                    element={
                      <RequireAuth requiredRole="EMPLOYER">
                        <EmployerJobForm />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/employer/jobs/:id/edit"
                    element={
                      <RequireAuth requiredRole="EMPLOYER">
                        <EmployerJobForm />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/employer/jobs/:id/applications"
                    element={
                      <RequireAuth requiredRole="EMPLOYER">
                        <EmployerApplications />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/staff"
                    element={
                      <RequireAuth requiredRole="SUPPORT_STAFF">
                        <StaffPage />
                      </RequireAuth>
                    }
                  />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </AppShell>
          }
        />
      </Routes>
    </Suspense>
  )
}

export function App() {
  return (
    <PreferencesProvider>
      <AnnouncerProvider>
        <AudioGuideProvider>
          <SessionProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </SessionProvider>
        </AudioGuideProvider>
      </AnnouncerProvider>
    </PreferencesProvider>
  )
}
