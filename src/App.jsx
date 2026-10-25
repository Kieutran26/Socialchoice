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
import CreatePost from '@/pages/CreatePost';
import AllPosts from '@/pages/AllPosts';
import ContentStrategy from '@/pages/ContentStrategy';
import ContentPillars from '@/pages/ContentPillars';
import ContentAngles from '@/pages/ContentAngles';
import Analytics from '@/pages/Analytics';
import MediaLibrary from '@/pages/MediaLibrary';
import SocialAccounts from '@/pages/SocialAccounts';
import Settings from '@/pages/Settings';
import { LanguageProvider, useTranslation } from '@/lib/i18n';
function AppError({ error }) {
    const { t } = useTranslation();
    return <div role="alert" className="p-8"><h1>{t('Unable to display this screen')}</h1><p>{t(error.message)}</p><a href="/">{t('Return to overview')}</a></div>;
}
class ErrorBoundary extends Component {
    state = { error: null };
    static getDerivedStateFromError(error) { return { error }; }
    render() {
        if (this.state.error) return <AppError error={this.state.error} />;
        return this.props.children;
    }
}
export default function App() {
    const Router = isDesktop() ? HashRouter : BrowserRouter;
    return <LanguageProvider><ErrorBoundary><AuthProvider><QueryClientProvider client={queryClientInstance}>
        <Router><Routes><Route element={<Layout />}>
            <Route path="/" element={<Overview />} />
            <Route path="/calendar" element={<ContentCalendar />} />
            <Route path="/create" element={<CreatePost />} />
            <Route path="/templates" element={<PostTemplates />} />
            <Route path="/posts" element={<AllPosts />} />
            <Route path="/strategy" element={<ContentStrategy />} />
            <Route path="/strategy/pillars" element={<ContentPillars />} />
            <Route path="/strategy/angles" element={<ContentAngles />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/media" element={<MediaLibrary />} />
            <Route path="/accounts" element={<SocialAccounts />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Route></Routes></Router><Toaster />
    </QueryClientProvider></AuthProvider></ErrorBoundary></LanguageProvider>;
}
