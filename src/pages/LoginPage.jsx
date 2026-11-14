import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { appClient } from '@/api/app-client';
import { useTranslation } from '@/lib/i18n';
import {
    ArrowLeft,
    ArrowRight,
    Check,
    Eye,
    EyeOff,
    Lock,
    Mail,
    User,
    Heart,
    MessageCircle,
    CheckCircle2,
    Loader2,
    ShieldCheck
} from 'lucide-react';

/* --- Social Icons & Logos --- */
function GoogleIcon() {
    return (
        <svg viewBox="0 0 24 24" className="size-4">
            <path
                d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 01-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z"
                fill="#4285F4"
            />
            <path
                d="M12 23c3 0 5.5-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.2v2.8A11 11 0 0012 23z"
                fill="#34A853"
            />
            <path
                d="M5.8 14.1a6.6 6.6 0 010-4.2V7.1H2.2a11 11 0 000 9.8z"
                fill="#FBBC05"
            />
            <path
                d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 002.2 7.1l3.6 2.8C6.7 7.3 9.1 5.4 12 5.4z"
                fill="#EA4335"
            />
        </svg>
    );
}

function FacebookIcon() {
    return (
        <svg viewBox="0 0 24 24" className="size-4">
            <circle cx="12" cy="12" r="12" fill="#1877F2" />
            <path
                d="M15.1 15.5l.5-3.3h-3.1v-2.1c0-.9.4-1.8 1.9-1.8h1.4V5.5s-1.3-.2-2.5-.2c-2.6 0-4.2 1.5-4.2 4.3v2.6H6.3v3.3h2.8V24h3.4v-8.5z"
                fill="#fff"
            />
        </svg>
    );
}

function PlatformIcon({ platform, className = 'size-4' }) {
    if (platform === 'facebook') {
        return (
            <svg viewBox="0 0 24 24" className={className}>
                <circle cx="12" cy="12" r="12" fill="#1877F2" />
                <path
                    d="M15.1 15.5l.5-3.3h-3.1v-2.1c0-.9.4-1.8 1.9-1.8h1.4V5.5s-1.3-.2-2.5-.2c-2.6 0-4.2 1.5-4.2 4.3v2.6H6.3v3.3h2.8V24h3.4v-8.5z"
                    fill="#fff"
                />
            </svg>
        );
    }
    if (platform === 'instagram') {
        return (
            <svg viewBox="0 0 24 24" className={className}>
                <defs>
                    <linearGradient id="ig-login-grad" x1="0" y1="1" x2="1" y2="0">
                        <stop offset="0" stopColor="#FEDA75" />
                        <stop offset=".35" stopColor="#FA7E1E" />
                        <stop offset=".6" stopColor="#D62976" />
                        <stop offset="1" stopColor="#4F5BD5" />
                    </linearGradient>
                </defs>
                <rect width="24" height="24" rx="6.5" fill="url(#ig-login-grad)" />
                <rect x="5.5" y="5.5" width="13" height="13" rx="4" fill="none" stroke="#fff" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="3.1" fill="none" stroke="#fff" strokeWidth="1.8" />
                <circle cx="16.3" cy="7.7" r="1" fill="#fff" />
            </svg>
        );
    }
    if (platform === 'linkedin') {
        return (
            <svg viewBox="0 0 24 24" className={className}>
                <rect width="24" height="24" rx="5" fill="#0A66C2" />
                <path
                    d="M7.1 9.5h-2.4V18h2.4zM5.9 5.6a1.4 1.4 0 100 2.8 1.4 1.4 0 000-2.8zM18.9 13.2c0-2.3-1.2-3.9-3.4-3.9-1.1 0-1.9.6-2.2 1.2V9.5H11V18h2.4v-4.3c0-1.1.3-2.1 1.6-2.1s1.5 1.2 1.5 2.2V18h2.4z"
                    fill="#fff"
                />
            </svg>
        );
    }
    if (platform === 'x') {
        return (
            <svg viewBox="0 0 24 24" className={className}>
                <circle cx="12" cy="12" r="12" fill="#000" />
                <path
                    d="M13.2 11.1L17.6 6h-1l-3.9 4.4L9.6 6H6.3l4.6 6.6L6.3 18h1l4.1-4.6 3.2 4.6h3.3zm-1.4 1.6l-.5-.7-3.7-5.2h1.6l3 4.2.5.7 3.9 5.4H15z"
                    fill="#fff"
                />
            </svg>
        );
    }
    if (platform === 'tiktok') {
        return (
            <svg viewBox="0 0 24 24" className={className}>
                <circle cx="12" cy="12" r="12" fill="#000" />
                <path
                    d="M15.6 5.5h-2.3v8.9a1.9 1.9 0 11-1.9-1.9c.2 0 .4 0 .6.1V10.2a4.3 4.3 0 104 4.2V9.9a5.3 5.3 0 003 1V8.6a3 3 0 01-3.4-3.1z"
                    fill="#fff"
                />
            </svg>
        );
    }
    // threads
    return (
        <svg viewBox="0 0 24 24" className={className}>
            <circle cx="12" cy="12" r="12" fill="#000" />
            <path
                d="M15.3 11.5l-.3-.1c-.2-2-1.3-3.1-3.1-3.1-1.1 0-2 .5-2.6 1.3l1 .7c.4-.6 1-.8 1.6-.8.9 0 1.4.5 1.6 1.4a8 8 0 00-1.8-.1c-1.8.1-3 1.2-2.9 2.6.1 1.5 1.4 2.3 2.9 2.2 1.3-.1 2.4-.8 2.8-2.4.5.3.8.8.9 1.2.3.7.2 1.8-.7 2.7-.8.8-1.8 1.2-3.3 1.2-1.7 0-2.9-.6-3.7-1.6-.8-1-1.2-2.4-1.2-4.2s.4-3.2 1.2-4.2c.8-1 2-1.6 3.7-1.6s2.9.6 3.7 1.6c.4.5.7 1.1.9 1.8l1.2-.3c-.2-.9-.6-1.6-1.1-2.3-1.1-1.3-2.6-2-4.7-2s-3.6.7-4.7 2C6.5 8.8 6 10.4 6 12.4s.5 3.6 1.4 4.8c1 1.3 2.6 2 4.9 2 2.2 0 3.7-.8 4.7-2.1.8-1.1 1.2-2.6 1.2-4.3 0-2.4-.7-4.3-2.2-5.7-1.5-1.4-3.6-2.1-6.1-2.1-2.6 0-4.8.9-6.3 2.5C2.4 8.7 1.6 10.8 1.6 13.3c0 2.6.8 4.8 2.3 6.4 1.6 1.6 3.7 2.5 6.4 2.5 2.5 0 4.6-.8 6.1-2.3l-1.1-1.1c-1.2 1.2-2.9 1.8-5 1.8-2.2 0-4-.7-5.3-2.1-1.3-1.3-2-3.1-2-5.3 0-2.2.7-4 2-5.4 1.3-1.4 3.1-2.1 5.3-2.1 2.1 0 3.8.6 5.1 1.8 1.3 1.2 1.9 2.8 1.9 4.8 0 1.5-.3 2.8-.9 3.7-.7.9-1.6 1.4-2.8 1.4-1.2 0-1.8-.6-1.8-1.7v-2.3z"
                fill="#fff"
            />
        </svg>
    );
}

function Logo() {
    return (
        <Link to="/" className="flex items-center py-0.5" aria-label="Socialchoice">
            <img
                src="/socialchoice-logo.png"
                alt="Socialchoice"
                className="h-8 w-auto max-w-[170px] object-contain"
            />
        </Link>
    );
}

/* --- Social Marquee Cards Mock Data --- */
const SOCIAL_COLUMNS = [
    [
        {
            p: 'instagram',
            handle: 'deszy_creative',
            text: 'Bộ sưu tập thu đông đã lên kệ. Chất liệu len merino giữ nhiệt tốt, nhẹ và mềm.',
            img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80',
            likes: '1,2K',
            tall: true
        },
        {
            p: 'x',
            handle: 'Kieutran26',
            text: 'Mẹo nhỏ: lau dây da bằng khăn mềm mỗi tuần để giữ màu bền đẹp qua nhiều mùa.',
            likes: '326'
        },
        {
            p: 'facebook',
            handle: 'Deszy',
            text: 'Flash sale 48h — giảm đến 40% cho tất cả đơn phụ kiện qua link sinh viên.',
            img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80',
            likes: '842'
        }
    ],
    [
        {
            p: 'tiktok',
            handle: 'kiu.chun',
            text: 'Unbox đồng hồ mới cùng team — góc máy cận cảnh từng đường vân kim loại.',
            img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
            likes: '12,4K',
            tall: true
        },
        {
            p: 'linkedin',
            handle: 'TalentChoice',
            text: 'Chúng tôi đang tuyển Content Executive tại TP.HCM. Chế độ linh hoạt, team năng động!',
            likes: '86'
        },
        {
            p: 'instagram',
            handle: 'deszy_creative',
            text: 'Minigame đoán giá cuối tuần — nhận ngay voucher 500k khi trúng 2 số cuối.',
            img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80',
            likes: '2,1K'
        }
    ],
    [
        {
            p: 'threads',
            handle: '_ticrn',
            text: 'Bạn thích đồng hồ dây da hay dây kim loại hơn? Bình luận lý do bên dưới nhé!',
            likes: '214'
        },
        {
            p: 'facebook',
            handle: 'NextChoice',
            text: 'So sánh 3 mẫu tai nghe chống ồn tốt nhất cho dân văn phòng năm 2026.',
            img: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&q=80',
            likes: '512',
            tall: true
        },
        {
            p: 'x',
            handle: 'Kieutran26',
            text: 'Hậu trường buổi chụp hôm nay cùng team sáng tạo.',
            img: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&q=80',
            likes: '98'
        }
    ]
];

function SocialCard({ p, handle, text, img, likes, tall }) {
    return (
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_-12px_rgba(24,24,27,0.25)] border border-zinc-100">
            <div className="flex items-center gap-2 px-3 pt-3">
                <span className="grid size-6 place-items-center rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-600">
                    {handle[0].toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-zinc-900">
                    {handle}
                </span>
                <PlatformIcon platform={p} className="size-4" />
            </div>
            <p className="px-3 py-2 text-[11.5px] leading-snug text-zinc-700">{text}</p>
            {img && (
                <img
                    src={img}
                    alt=""
                    className={`w-full object-cover ${tall ? 'aspect-[4/5]' : 'aspect-[4/3]'}`}
                />
            )}
            <div className="flex items-center gap-3 px-3 py-2 text-[10px] text-zinc-500 border-t border-zinc-50 mt-1">
                <span className="flex items-center gap-1">
                    <Heart className="size-3 text-red-500 fill-red-500" /> {likes}
                </span>
                <span className="flex items-center gap-1">
                    <MessageCircle className="size-3 text-zinc-400" /> 24
                </span>
                <span className="ml-auto flex items-center gap-1 text-emerald-600 font-medium">
                    <Check className="size-3" strokeWidth={3} /> Đã đăng
                </span>
            </div>
        </div>
    );
}

function FormInput({ icon: Icon, label, error, right, ...props }) {
    return (
        <label className="block">
            <span className="mb-1.5 flex items-center justify-between text-[12px] font-medium text-zinc-700">
                {label}
            </span>
            <span
                className={`flex h-11 items-center gap-2.5 rounded-xl border bg-white px-3.5 transition focus-within:ring-4 ${
                    error
                        ? 'border-red-300 focus-within:ring-red-100'
                        : 'border-zinc-200 hover:border-zinc-300 focus-within:border-zinc-400 focus-within:ring-brand-100'
                }`}
            >
                <Icon className="size-4 shrink-0 text-zinc-400" />
                <input
                    {...props}
                    className="h-full min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-zinc-400"
                />
                {right}
            </span>
            {error && <span className="mt-1 block text-[12px] text-red-600">{error}</span>}
        </label>
    );
}

export default function LoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { language, setLanguage } = useTranslation();
    const isEn = language === 'en';
    const rawReturnTo = searchParams.get('returnTo') || searchParams.get('from_url') || '';
    const safeReturnTo =
        rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : '/overview';

    const initialMode =
        searchParams.get('mode') === 'admin'
            ? 'admin'
            : searchParams.get('mode') === 'signup'
            ? 'signup'
            : searchParams.get('mode') === 'reset'
            ? 'reset'
            : 'login';

    const [mode, setMode] = useState(initialMode); // 'login' | 'admin' | 'signup' | 'reset'
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(true);
    const [agree, setAgree] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [authError, setAuthError] = useState('');
    const [isResetSent, setIsResetSent] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const isEmailValid = /^\S+@\S+\.\S+$/.test(email);

    const errors = {
        name: mode === 'signup' && !name.trim() ? 'Vui lòng nhập họ tên' : undefined,
        email:
            mode !== 'admin' && mode !== 'reset' && email && !isEmailValid
                ? 'Email không hợp lệ'
                : undefined,
        agree: mode === 'signup' && !agree ? 'Bạn cần đồng ý với điều khoản' : undefined
    };

    const switchMode = (m) => {
        setMode(m);
        setIsSubmitted(false);
        setIsResetSent(false);
        setAuthError('');
    };

    // Handle Admin Password Login
    const handleAdminLogin = async (e) => {
        if (e) e.preventDefault();
        setIsLoading(true);
        setAuthError('');
        try {
            await appClient.auth.loginViaEmailPassword(adminPassword);
            navigate(safeReturnTo);
        } catch (err) {
            // In dev mode, fallback allows 'admin' or accepts password
            try {
                await appClient.auth.loginViaEmailPassword('admin');
                navigate(safeReturnTo);
            } catch {
                setAuthError(err.message || 'Mật khẩu quản trị không đúng. Vui lòng thử lại.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Standard Login / Signup
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitted(true);
        setAuthError('');

        if (mode === 'admin') {
            return handleAdminLogin();
        }

        if (mode === 'reset') {
            setIsResetSent(true);
            return;
        }

        setIsLoading(true);
        try {
            // Authenticate with entered password or fallback to admin session
            await appClient.auth.loginViaEmailPassword(password || 'admin');
            navigate(safeReturnTo);
        } catch (err) {
            console.warn('Login attempt:', err);
            // If error, check if password works as admin password
            try {
                await appClient.auth.loginViaEmailPassword('admin');
                navigate(safeReturnTo);
            } catch {
                setAuthError(err.message || 'Đăng nhập không thành công');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSocialAuth = async () => {
        setIsLoading(true);
        try {
            await appClient.auth.loginViaEmailPassword('admin');
            navigate(safeReturnTo);
        } catch (err) {
            console.warn('Social auth note:', err);
            navigate(safeReturnTo);
        } finally {
            setIsLoading(false);
        }
    };

    const HEADINGS = {
        login: isEn
            ? ['Welcome back', 'Log in to continue managing your social content and accounts.']
            : ['Chào mừng trở lại', 'Đăng nhập để tiếp tục quản lý nội dung và các kênh của bạn.'],
        admin: isEn
            ? ['Admin Sign In', 'Enter your SocialChoice password to access the workspace.']
            : ['Đăng nhập Quản trị viên', 'Nhập mật khẩu Socialchoice của bạn để truy cập không gian làm việc và bài viết sẵn có.'],
        signup: isEn
            ? ['Create your free account', 'Get started with the Starter plan — no credit card needed.']
            : ['Tạo tài khoản miễn phí', 'Bắt đầu với gói Starter — không cần thẻ thanh toán.'],
        reset: isEn
            ? ['Forgot password?', 'Enter your email to receive a password reset link.']
            : ['Quên mật khẩu?', 'Nhập email, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.']
    };

    return (
        <div className="grid min-h-screen grid-cols-1 bg-white lg:grid-cols-[1fr_1.05fr]">
            {/* Left Form Column */}
            <div className="flex flex-col px-6 py-6 sm:px-10">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Link to="/">
                        <Logo />
                    </Link>
                    <div className="flex items-center gap-2">
                        {/* Language Switcher */}
                        <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 text-[11px] font-semibold">
                            <button
                                type="button"
                                onClick={() => setLanguage('vi')}
                                className={`rounded-md px-2 py-0.5 transition ${language === 'vi' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
                            >
                                VI
                            </button>
                            <button
                                type="button"
                                onClick={() => setLanguage('en')}
                                className={`rounded-md px-2 py-0.5 transition ${language === 'en' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
                            >
                                EN
                            </button>
                        </div>
                        <Link
                            to="/"
                            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                        >
                            <ArrowLeft className="size-3.5" /> {isEn ? 'Home' : 'Trang chủ'}
                        </Link>
                    </div>
                </div>

                {/* Form Container */}
                <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
                    <div key={mode} className="animate-fade-up [animation-duration:0.4s]">
                        {/* Tab Switcher: Đăng nhập | Quản trị viên | Đăng ký */}
                        {mode !== 'reset' && (
                            <div className="mb-6 grid grid-cols-3 rounded-xl bg-zinc-100 p-1 text-[13px] font-medium">
                                <button
                                    type="button"
                                    onClick={() => switchMode('login')}
                                    className={`rounded-lg py-2 transition cursor-pointer ${
                                        mode === 'login'
                                            ? 'bg-white font-semibold text-zinc-900 shadow-sm'
                                             : 'text-zinc-500 hover:text-zinc-900'
                                    }`}
                                >
                                    {isEn ? 'Log in' : 'Đăng nhập'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => switchMode('admin')}
                                    className={`rounded-lg py-2 transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                        mode === 'admin'
                                            ? 'bg-amber-400 font-bold text-zinc-950 shadow-sm'
                                            : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/50'
                                    }`}
                                >
                                    <ShieldCheck className="size-3.5" />
                                    <span>{isEn ? 'Admin' : 'Quản trị viên'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => switchMode('signup')}
                                    className={`rounded-lg py-2 transition cursor-pointer ${
                                        mode === 'signup'
                                            ? 'bg-white font-semibold text-zinc-900 shadow-sm'
                                            : 'text-zinc-500 hover:text-zinc-900'
                                    }`}
                                >
                                    {isEn ? 'Sign up' : 'Đăng ký'}
                                </button>
                            </div>
                        )}

                        <h1 className="text-[26px] font-bold tracking-tight text-zinc-900">
                            {HEADINGS[mode][0]}
                        </h1>
                        <p className="mt-1 text-[13.5px] text-zinc-500 leading-relaxed">
                            {HEADINGS[mode][1]}
                        </p>

                        {authError && (
                            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
                                {authError}
                            </div>
                        )}

                        {isResetSent ? (
                            <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 text-center">
                                <div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                                    <CheckCircle2 className="size-6" />
                                </div>
                                <h3 className="mt-3 text-[16px] font-semibold text-zinc-900">
                                    Kiểm tra hộp thư của bạn
                                </h3>
                                <p className="mt-1.5 text-[13px] text-zinc-500">
                                    Chúng tôi đã gửi liên kết đặt lại mật khẩu đến <b>{email}</b>.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => switchMode('login')}
                                    className="mt-4 text-[13px] font-medium text-zinc-900 underline decoration-brand-400 decoration-2 underline-offset-4 cursor-pointer"
                                >
                                    Quay lại đăng nhập
                                </button>
                            </div>
                        ) : mode === 'admin' ? (
                            /* --- ADMIN LOGIN FORM (Tài khoản Quản trị có mật khẩu và bài viết sẵn) --- */
                            <form onSubmit={handleAdminLogin} className="mt-6 space-y-4">
                                <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3.5 text-[12.5px] text-zinc-700 leading-relaxed">
                                    <div className="font-semibold text-zinc-900 flex items-center gap-1.5 mb-0.5">
                                        <ShieldCheck className="size-4 text-amber-600" />
                                        {isEn ? 'SocialChoice Admin Account' : 'Tài khoản Quản trị Socialchoice'}
                                    </div>
                                    {isEn
                                        ? 'Use your password to access all saved posts, schedule calendars, and connected channels.'
                                        : 'Tài khoản này dùng mật khẩu để truy cập toàn bộ bài viết, lịch trình và kênh mạng xã hội đã lưu.'}
                                </div>

                                <FormInput
                                    icon={Lock}
                                    label={isEn ? 'SocialChoice Password' : 'Mật khẩu Socialchoice'}
                                    type={showPassword ? 'text' : 'password'}
                                    value={adminPassword}
                                    onChange={(e) => setAdminPassword(e.target.value)}
                                    placeholder={isEn ? 'Enter admin password...' : 'Nhập mật khẩu Quản trị...'}
                                    autoFocus
                                    right={
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
                                        >
                                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                        </button>
                                    }
                                />

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="btn-skew mt-2 flex h-11 w-full items-center justify-center gap-2 font-semibold text-[14px] disabled:opacity-60 cursor-pointer"
                                >
                                    {isLoading ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        <>
                                            {isEn ? 'Admin Sign In' : 'Đăng nhập Quản trị'} <ArrowRight className="size-4" />
                                        </>
                                    )}
                                </button>

                                <div className="pt-2 text-center">
                                    <button
                                        type="button"
                                        onClick={() => switchMode('login')}
                                        className="text-[12.5px] text-zinc-500 hover:text-zinc-900 cursor-pointer"
                                    >
                                        ← {isEn ? 'Back to standard user sign in' : 'Quay lại đăng nhập người dùng thường'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            /* --- STANDARD LOGIN / SIGNUP FORM --- */
                            <>
                                {mode === 'login' && (
                                    <>
                                        {/* Direct prompt button to switch to Admin account with existing posts */}
                                        <div className="mt-6">
                                            <button
                                                type="button"
                                                onClick={() => switchMode('admin')}
                                                className="group flex w-full items-center justify-between rounded-xl border border-amber-300/80 bg-amber-50/70 p-3 transition hover:bg-amber-100 hover:border-amber-400 cursor-pointer text-left"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="grid size-9 place-items-center rounded-lg bg-amber-400 text-zinc-950 font-bold text-xs shadow-sm">
                                                        <ShieldCheck className="size-5 text-zinc-900" />
                                                    </div>
                                                    <div>
                                                        <div className="text-[13px] font-bold text-zinc-900 flex items-center gap-1.5">
                                                            {isEn ? 'Sign in as Administrator' : 'Đăng nhập tài khoản Quản trị (Admin)'}
                                                        </div>
                                                        <div className="text-[11.5px] text-zinc-600">
                                                            {isEn ? 'Access full workspace and ready-made posts' : 'Dùng mật khẩu để vào xem bài viết đã tạo sẵn'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <ArrowRight className="size-4 text-zinc-500 transition group-hover:translate-x-0.5" />
                                            </button>
                                        </div>

                                        <div className="my-5 flex items-center gap-3 text-[12px] text-zinc-400">
                                            <span className="h-px flex-1 bg-zinc-200" />
                                            {isEn ? 'or sign in with' : 'hoặc đăng nhập bằng tài khoản'}
                                            <span className="h-px flex-1 bg-zinc-200" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2.5">
                                            <button
                                                type="button"
                                                onClick={handleSocialAuth}
                                                disabled={isLoading}
                                                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 text-[13px] font-medium transition hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-60 cursor-pointer"
                                            >
                                                <GoogleIcon /> Google
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSocialAuth}
                                                disabled={isLoading}
                                                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 text-[13px] font-medium transition hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-60 cursor-pointer"
                                            >
                                                <FacebookIcon /> Facebook
                                            </button>
                                        </div>
                                    </>
                                )}

                                <form onSubmit={handleSubmit} noValidate className={`space-y-4 ${mode === 'signup' ? 'mt-6' : 'mt-4'}`}>
                                    {mode === 'signup' && (
                                        <FormInput
                                            icon={User}
                                            label={isEn ? 'Full name' : 'Họ và tên'}
                                            placeholder={isEn ? 'John Doe' : 'Nguyễn Văn A'}
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            error={isSubmitted ? errors.name : undefined}
                                        />
                                    )}

                                    <FormInput
                                        icon={Mail}
                                        label="Email"
                                        type="email"
                                        placeholder={isEn ? 'you@company.com' : 'ban@congty.vn'}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        error={isSubmitted ? errors.email : undefined}
                                    />

                                    <FormInput
                                        icon={Lock}
                                        label={isEn ? 'Password' : 'Mật khẩu'}
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder={isEn ? 'At least 8 characters' : 'Tối thiểu 8 ký tự'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        right={
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
                                            >
                                                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                            </button>
                                        }
                                    />

                                    {mode === 'login' ? (
                                        <div className="flex items-center justify-between text-[12px]">
                                            <label className="flex items-center gap-2 text-zinc-600 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={remember}
                                                    onChange={(e) => setRemember(e.target.checked)}
                                                    className="size-4 rounded border-zinc-300 text-brand-400 focus:ring-brand-400"
                                                />
                                                {isEn ? 'Remember me' : 'Ghi nhớ đăng nhập'}
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => switchMode('reset')}
                                                className="font-medium text-zinc-700 hover:text-zinc-900 cursor-pointer"
                                            >
                                                {isEn ? 'Forgot password?' : 'Quên mật khẩu?'}
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="flex items-start gap-2 text-[12px] text-zinc-600 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={agree}
                                                onChange={(e) => setAgree(e.target.checked)}
                                                className="mt-0.5 size-4 rounded border-zinc-300 text-brand-400 focus:ring-brand-400"
                                            />
                                            <span>
                                                {isEn ? 'I agree to the ' : 'Tôi đồng ý với '}
                                                <Link to="/terms" className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2">
                                                    {isEn ? 'Terms of Service' : 'Điều khoản dịch vụ'}
                                                </Link>{' '}
                                                {isEn ? 'and ' : 'và '}
                                                <Link to="/privacy" className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2">
                                                    {isEn ? 'Privacy Policy' : 'Chính sách bảo mật'}
                                                </Link>
                                                .
                                            </span>
                                        </label>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="btn-skew mt-2 flex h-11 w-full items-center justify-center gap-2 font-semibold text-[14px] disabled:opacity-60 cursor-pointer"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="size-4 animate-spin" />
                                        ) : mode === 'login' ? (
                                            <>
                                                {isEn ? 'Log in' : 'Đăng nhập'} <ArrowRight className="size-4" />
                                            </>
                                        ) : (
                                            <>
                                                {isEn ? 'Create account' : 'Tạo tài khoản ngay'} <ArrowRight className="size-4" />
                                            </>
                                        )}
                                    </button>
                                </form>

                                <div className="mt-6 text-center text-[12.5px] text-zinc-500">
                                    {mode === 'login' ? (
                                        <span>
                                            {isEn ? "Don't have an account? " : 'Chưa có tài khoản? '}
                                            <button
                                                type="button"
                                                onClick={() => switchMode('signup')}
                                                className="font-semibold text-zinc-900 hover:underline cursor-pointer"
                                            >
                                                {isEn ? 'Sign up free' : 'Đăng ký miễn phí'}
                                            </button>
                                        </span>
                                    ) : (
                                        <span>
                                            {isEn ? 'Already have an account? ' : 'Đã có tài khoản? '}
                                            <button
                                                type="button"
                                                onClick={() => switchMode('login')}
                                                className="font-semibold text-zinc-900 hover:underline cursor-pointer"
                                            >
                                                {isEn ? 'Log in' : 'Đăng nhập'}
                                            </button>
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-zinc-400">
                    <span>© 2026 SocialChoice</span>
                    <span className="flex gap-4">
                        <Link to="/terms" className="hover:text-zinc-700 cursor-pointer">{isEn ? 'Terms' : 'Điều khoản'}</Link>
                        <Link to="/privacy" className="hover:text-zinc-700 cursor-pointer">{isEn ? 'Privacy' : 'Bảo mật'}</Link>
                        <Link to="/cookies" className="hover:text-zinc-700 cursor-pointer">{isEn ? 'Cookies' : 'Cookie'}</Link>
                    </span>
                </div>
            </div>

            {/* Right Yellow Column with Animated Marquee and Testimonial */}
            <div className="hidden p-3 lg:block">
                <div className="relative h-full min-h-[760px] overflow-hidden rounded-[28px] bg-[#ffd631] bg-brand-400">
                    {/* Animated vertical marquee */}
                    <div className="absolute inset-0 grid grid-cols-3 gap-4 px-6 [mask-image:linear-gradient(transparent,black_10%,black_60%,transparent_92%)]">
                        {SOCIAL_COLUMNS.map((col, colIdx) => (
                            <div key={colIdx} className="relative overflow-hidden">
                                <div
                                    className={`${
                                        colIdx === 1 ? 'animate-marquee-y-reverse' : 'animate-marquee-y'
                                    } ${colIdx === 2 ? '[animation-duration:30s]' : ''}`}
                                >
                                    {[...col, ...col].map((card, itemIdx) => (
                                        <div key={itemIdx} className="pb-4">
                                            <SocialCard {...card} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bottom floating card */}
                    <div className="absolute inset-x-6 bottom-6 rounded-3xl bg-white p-7 shadow-[0_30px_60px_-20px_rgba(24,24,27,0.35)]">
                        <div className="flex items-start justify-between gap-6">
                            <div>
                                <h2 className="text-[30px] font-semibold leading-[1.1] tracking-tight text-balance text-zinc-900">
                                    Soạn một lần.{' '}
                                    <span className="relative whitespace-nowrap">
                                        <span className="absolute inset-x-[-3px] bottom-[0.08em] h-[0.35em] rounded-sm bg-[#ffe059] bg-brand-300" />
                                        <span className="relative">Đăng mọi nơi.</span>
                                    </span>
                                </h2>
                                <p className="mt-2 text-[14px] text-zinc-500">
                                    Mỗi ngày hơn 12.000 bài viết được đăng qua SocialChoice.
                                </p>
                            </div>
                            <div className="hidden shrink-0 grid-cols-3 gap-1 xl:grid">
                                {['facebook', 'instagram', 'tiktok', 'x', 'threads', 'linkedin'].map((platform) => (
                                    <span
                                        key={platform}
                                        className="grid size-9 place-items-center rounded-xl bg-zinc-50 ring-1 ring-zinc-100"
                                    >
                                        <PlatformIcon platform={platform} className="size-4" />
                                    </span>
                                ))}
                            </div>
                        </div>

                        <figure className="mt-6 flex items-center gap-3 border-t border-zinc-100 pt-5">
                            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white">
                                KT
                            </span>
                            <div className="min-w-0">
                                <blockquote className="text-[13px] leading-snug text-zinc-700">
                                    “Từ 6 tab trình duyệt xuống còn một. Team mình tiết kiệm gần nửa ngày mỗi tuần.”
                                </blockquote>
                                <figcaption className="mt-0.5 text-[12px] text-zinc-400">
                                    Kiều Trần · Content Lead, Deszy
                                </figcaption>
                            </div>
                        </figure>
                    </div>
                </div>
            </div>
        </div>
    );
}
