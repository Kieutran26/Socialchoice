import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './landing-bundle.js';

export default function LandingPage() {
    const containerRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Gắn stylesheet Tailwind v4 chuyên dụng cho Landing Page
            if (!document.getElementById('landing-style-link')) {
                const link = document.createElement('link');
                link.id = 'landing-style-link';
                link.rel = 'stylesheet';
                link.href = '/landing.css';
                document.head.appendChild(link);
            }

            if (!containerRef.current) return;
            let root = null;
                const mountLanding = window['__mountLandingPage'];
                if (typeof mountLanding === 'function') {
                    root = mountLanding(containerRef.current);
                }

                const handleClicks = (e) => {
                    const target = e.target.closest('a, button');
                    if (!target) return;
                    let href = target.getAttribute('href') || '';
                    const text = (target.textContent || '').trim().toLowerCase();

                    // Chuẩn hóa hash routes nếu có (e.g. "#/login" -> "/login")
                    if (href.startsWith('#/')) {
                        href = href.slice(1);
                    }

                    // 1. Điều hướng đăng nhập
                    if (
                        href === '/login' ||
                        href.startsWith('/login') ||
                        text.includes('đăng nhập') ||
                        text.includes('log in') ||
                        text.includes('sign in')
                    ) {
                        e.preventDefault();
                        navigate('/login');
                        return;
                    }

                    // 2. Điều hướng demo / overview
                    if (
                        href === '/overview' ||
                        href.startsWith('/overview') ||
                        text.includes('xem bản demo') ||
                        text.includes('view demo')
                    ) {
                        e.preventDefault();
                        navigate('/overview');
                        return;
                    }

                    // 3. Điều hướng dùng thử / tạo bài / bắt đầu
                    if (
                        href === '/create' ||
                        href.startsWith('/create') ||
                        text.includes('dùng thử') ||
                        text.includes('dùng miễn phí') ||
                        text.includes('bắt đầu') ||
                        text.includes('tạo bài') ||
                        text.includes('try free') ||
                        text.includes('start free') ||
                        text.includes('get started') ||
                        text.includes('start')
                    ) {
                        e.preventDefault();
                        navigate('/create');
                        return;
                    }

                    // 4. Điều hướng trang pháp lý và các liên kết nội bộ
                    if (
                        href.startsWith('/terms') ||
                        href.startsWith('/privacy') ||
                        href.startsWith('/cookies') ||
                        href.startsWith('/cookie') ||
                        href.startsWith('/data-deletion') ||
                        href.startsWith('/app')
                    ) {
                        e.preventDefault();
                        navigate(href);
                        return;
                    }

                    // 5. Cuộn mượt khi nhấn liên kết anchor phần nội dung (#tinh-nang, #bang-gia, #faq, #diem-manh)
                    if (href.startsWith('#') && href.length > 1) {
                        e.preventDefault();
                        const id = href.slice(1);
                        const targetEl = document.getElementById(id);
                        if (targetEl) {
                            targetEl.scrollIntoView({ behavior: 'smooth' });
                        }
                        return;
                    }
                };

                const container = containerRef.current;
                container?.addEventListener('click', handleClicks);

                const handleHashChange = () => {
                    const hash = window.location.hash;
                    if (hash === '#/login' || hash === '#login') {
                        window.history.replaceState(null, '', '/login');
                        navigate('/login');
                    } else if (hash === '#/create' || hash === '#create') {
                        window.history.replaceState(null, '', '/create');
                        navigate('/create');
                    } else if (hash === '#/overview' || hash === '#overview') {
                        window.history.replaceState(null, '', '/overview');
                        navigate('/overview');
                    }
                };

                window.addEventListener('hashchange', handleHashChange);
                if (window.location.hash) {
                    handleHashChange();
                }

                return () => {
                    window.removeEventListener('hashchange', handleHashChange);
                    if (container) {
                        container.removeEventListener('click', handleClicks);
                    }
                    if (root && typeof root.unmount === 'function') {
                        try {
                            root.unmount();
                        } catch {
                            // Ignore unmount error
                        }
                    }
                };
            }, [navigate]);

    return (
        <div className="landing-page-wrapper w-full min-h-screen bg-white">
            <div ref={containerRef} id="landing-root" className="w-full min-h-screen" />
        </div>
    );
}
