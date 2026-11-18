import { Component } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter, HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import { isDesktop } from '@/api/desktop/runtime';
import { AuthProvider } from '@/lib/AuthContext';
import Layout from '@/components/Layout';
import Overview from '@/pages/Overview';
import ContentCalendar from '@/pages/ContentCalendar';
import PostTemplates from '@/pages/PostTemplates';
import CreateTemplate from '@/pages/CreateTemplate';
import CreatePost from '@/pages/CreatePost';
import ChatAgent from '@/pages/ChatAgent';
import AllPosts from '@/pages/AllPosts';
import ContentStrategy from '@/pages/ContentStrategy';
import Campaigns from '@/pages/Campaigns';
import ContentPillars from '@/pages/ContentPillars';
import ContentAngles from '@/pages/ContentAngles';
import Analytics from '@/pages/Analytics';
import MediaLibrary from '@/pages/MediaLibrary';
import SocialAccounts from '@/pages/SocialAccounts';
import Brands from '@/pages/Brands';
import Settings from '@/pages/Settings';
import Tools from '@/pages/Tools';
import TiktokShop from '@/pages/TiktokShop';
import ShopeeAffiliate from '@/pages/ShopeeAffiliate';
import SocialInbox from '@/pages/SocialInbox';
import AdminLicenses from '@/pages/AdminLicenses';
import InteractiveImages from '@/pages/InteractiveImages';
import Shortlinks from '@/pages/Shortlinks';
import DashboardV2 from '@/pages/DashboardV2';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsOfService from '@/pages/TermsOfService';
import CookiePolicy from '@/pages/CookiePolicy';
import DataDeletion from '@/pages/DataDeletion';
import LandingPage from '@/pages/LandingPage';
import LandingPage2 from '@/pages/LandingPage2';
import LandingPage3 from '@/pages/LandingPage3';
import ContentStrategy2 from '@/pages/ContentStrategy2';
import LoginPage from '@/pages/LoginPage';
import OAuthConsent from '@/pages/OAuthConsent';
import Docs from '@/pages/Docs';
import Blog from '@/pages/Blog';
import BlogPostDetail from '@/pages/BlogPostDetail';
import { LanguageProvider, useTranslation } from '@/lib/i18n';

function AppError({ error }) {
    const { t } = useTranslation();
    return (
        <div role="alert" className="p-8">
            <h1>{t('Unable to display this screen')}</h1>
            <p>{t(error.message)}</p>
            <a href="/">{t('Return to overview')}</a>
        </div>
    );
}

class ErrorBoundary extends Component {
    state = { error: null };
    static getDerivedStateFromError(error) {
        return { error };
    }
    render() {
        if (this.state.error) return <AppError error={this.state.error} />;
        return this.props.children;
    }
}

// Protected Workspace layout wrapped with AuthProvider
function WorkspaceShell() {
    return (
        <AuthProvider>
            <Layout />
        </AuthProvider>
    );
}

export default function App() {
    const Router = isDesktop() ? HashRouter : BrowserRouter;

    return (
        <LanguageProvider>
            <ErrorBoundary>
                <QueryClientProvider client={queryClientInstance}>
                    <Router>
                        <Routes>
                            {/* Public routes — accessible immediately without auth */}
                            <Route path="/" element={<LandingPage />} />
                            <Route path="/landing" element={<LandingPage />} />
                            <Route path="/pricing" element={<LandingPage />} />
                            <Route path="/bang-gia" element={<LandingPage />} />
                            <Route path="/checkout" element={<LandingPage />} />
                            <Route path="/thanh-toan" element={<LandingPage />} />
                            <Route path="/landing-2" element={<LandingPage2 />} />
                            <Route path="/landing-3" element={<LandingPage3 />} />
                            <Route path="/strategy-2" element={<ContentStrategy2 />} />
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/oauth/consent" element={<OAuthConsent />} />
                            <Route path="/privacy" element={<PrivacyPolicy />} />
                            <Route path="/terms" element={<TermsOfService />} />
                            <Route path="/cookies" element={<CookiePolicy />} />
                            <Route path="/cookie" element={<CookiePolicy />} />
                            <Route path="/data-deletion" element={<DataDeletion />} />
                            <Route path="/docs" element={<Docs />} />
                            <Route path="/huong-dan" element={<Docs />} />
                            <Route path="/blog" element={<Blog />} />
                            <Route path="/blog/:slug" element={<BlogPostDetail />} />

                            {/* Authenticated Workspace Routes */}
                            <Route element={<WorkspaceShell />}>
                                <Route path="/overview" element={<Overview />} />
                                <Route path="/app" element={<Overview />} />
                                <Route path="/dashboard" element={<Overview />} />
                                <Route path="/dashboard-v2" element={<DashboardV2 />} />
                                <Route path="/dashboard-clean" element={<Navigate to="/overview" replace />} />
                                <Route path="/calendar" element={<ContentCalendar />} />
                                <Route path="/inbox" element={<SocialInbox />} />
                                <Route path="/social-inbox" element={<Navigate to="/inbox" replace />} />
                                <Route path="/agent" element={<ChatAgent />} />
                                <Route path="/create" element={<CreatePost />} />
                                <Route path="/create-clean" element={<Navigate to="/create" replace />} />
                                <Route path="/templates" element={<PostTemplates />} />
                                <Route path="/templates/create" element={<CreateTemplate />} />
                                <Route path="/posts" element={<AllPosts />} />
                                <Route path="/strategy" element={<ContentStrategy />} />
                                <Route path="/strategy/campaigns" element={<Campaigns />} />
                                <Route path="/campaigns" element={<Campaigns />} />
                                <Route path="/strategy/pillars" element={<ContentPillars />} />
                                <Route path="/strategy/angles" element={<ContentAngles />} />
                                <Route path="/analytics" element={<Analytics />} />
                                <Route path="/analytics-clean" element={<Navigate to="/analytics" replace />} />
                                <Route path="/media" element={<MediaLibrary />} />
                                <Route path="/interactive-images" element={<InteractiveImages />} />
                                <Route path="/shortlinks" element={<Shortlinks />} />
                                <Route path="/tools" element={<Tools />} />
                                <Route path="/tiktok-shop" element={<TiktokShop />} />
                                <Route path="/shopee-affiliate" element={<ShopeeAffiliate />} />
                                <Route path="/shopee" element={<Navigate to="/shopee-affiliate" replace />} />
                                <Route path="/accounts" element={<SocialAccounts />} />
                                <Route path="/brands" element={<Brands />} />
                                <Route path="/team" element={<Navigate to="/settings?tab=team" replace />} />
                                <Route path="/settings" element={<Settings />} />
                                <Route path="/admin/licenses" element={<AdminLicenses />} />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Route>
                        </Routes>
                    </Router>
                    <Toaster />
                </QueryClientProvider>
            </ErrorBoundary>
        </LanguageProvider>
    );
}
