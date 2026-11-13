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
                    const href = target.getAttribute('href');
                    const text = (target.textContent || '').trim().toLowerCase();

                    // Điều hướng trang pháp lý và các liên kết nội bộ
                    if (href && (href.startsWith('/terms') || href.startsWith('/privacy') || href.startsWith('/cookies') || href.startsWith('/data-deletion') || href.startsWith('/login') || href.startsWith('/create'))) {
                        e.preventDefault();
                        navigate(href);
                        return;
                    }

                    // Cuộn mượt khi nhấn liên kết anchor (#tinh-nang, #bang-gia, #faq, #diem-manh)
                    if (href && href.startsWith('#')) {
                        e.preventDefault();
                        const id = href.slice(1);
                        const targetEl = document.getElementById(id);
                        if (targetEl) {
                            targetEl.scrollIntoView({ behavior: 'smooth' });
                        }
                        return;
                    }

                    // Điều hướng khi người dùng nhấn các nút CTA trên Landing Page
                    if (text.includes('đăng nhập') || text.includes('log in') || text.includes('sign in')) {
                        e.preventDefault();
                        navigate('/login');
                    } else if (
                        text.includes('dùng thử') ||
                        text.includes('bắt đầu') ||
                        text.includes('tạo bài') ||
                        text.includes('try free') ||
                        text.includes('start free') ||
                        text.includes('get started') ||
                        text.includes('start')
                    ) {
                        e.preventDefault();
                        navigate('/create');
                    }
                };

                const container = containerRef.current;
                container?.addEventListener('click', handleClicks);

                return () => {
                    if (container) {
                        container.removeEventListener('click', handleClicks);
                    }
                    if (root && typeof root.unmount === 'function') {
                        try {
                            root.unmount();
                        } catch (err) {
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
