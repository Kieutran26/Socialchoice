import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
    ArrowRight,
    Sparkle,
    CalendarBlank,
    ChartLineUp,
    PencilSimple,
    Images,
    LinkSimple,
    Users,
    Lightning,
    RocketLaunch,
    ShieldCheck,
    Globe,
    Play,
    Star,
    Check,
    ChatCircleDots,
    MagicWand,
    TrendUp,
    Timer,
    Trophy,
    Eye,
    CursorClick,
    CheckCircle,
    PlugsConnected,
    PaperPlaneTilt,
    ShareNetwork,
    ArrowUpRight,
    CalendarDots,
    Plus,
    Clock,
    FacebookLogo,
    LinkedinLogo,
    InstagramLogo,
    ThreadsLogo,
} from '@phosphor-icons/react';

/* ─────────────────────── Shared Animation Variants ─────────────────────── */
const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: (i = 0) => ({
        opacity: 1, y: 0,
        transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
    }),
};

const scaleIn = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: (i = 0) => ({
        opacity: 1, scale: 1,
        transition: { duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
    }),
};

const slideInLeft = {
    hidden: { opacity: 0, x: -40 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const slideInRight = {
    hidden: { opacity: 0, x: 40 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

/* ─────────────────────── Reduced Motion Helper ─────────────────────── */
function usePrefersReducedMotion() {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReduced(mq.matches);
        const handler = (e) => setReduced(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);
    return reduced;
}

/* ─────────────────────── Section wrapper with InView ─────────────────────── */
function Section({ children, className = '', id }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: '-80px' });
    return (
        <motion.section
            ref={ref}
            id={id}
            className={className}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
        >
            {children}
        </motion.section>
    );
}

/* ─────────────────────── Floating Particles ─────────────────────── */
function FloatingParticles() {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {[...Array(6)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                        width: 6 + i * 4,
                        height: 6 + i * 4,
                        background: `oklch(0.88 0.17 ${60 + i * 30} / 0.25)`,
                        left: `${10 + i * 15}%`,
                        top: `${20 + (i % 3) * 25}%`,
                    }}
                    animate={{
                        y: [0, -20, 0],
                        x: [0, 10, 0],
                        opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                        duration: 4 + i,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: i * 0.5,
                    }}
                />
            ))}
        </div>
    );
}

/* ─────────────────────── Animated Counter ─────────────────────── */
function AnimatedCounter({ value, suffix = '' }) {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const inView = useInView(ref, { once: true });

    useEffect(() => {
        if (!inView) return;
        const num = parseInt(value.replace(/[^0-9]/g, ''), 10);
        if (!num) return;
        const duration = 1500;
        const steps = 40;
        const stepVal = num / steps;
        let current = 0;
        const timer = setInterval(() => {
            current += stepVal;
            if (current >= num) {
                setCount(num);
                clearInterval(timer);
            } else {
                setCount(Math.floor(current));
            }
        }, duration / steps);
        return () => clearInterval(timer);
    }, [inView, value]);

    return (
        <span ref={ref}>
            {count.toLocaleString('vi-VN')}{suffix}
        </span>
    );
}

/* ─────────────────────── Typing Indicator (3 bouncing dots) ─────────────────────── */
function TypingIndicator() {
    return (
        <div className="flex items-center gap-1 px-3 py-2">
            {[0, 1, 2].map(i => (
                <motion.span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50"
                    animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                />
            ))}
        </div>
    );
}

/* ─────────────────────── Animated Count-Up for mockup stats ─────────────────────── */
function MockupCountUp({ target, duration = 2000, delay = 0 }) {
    const [val, setVal] = useState(0);
    const ref = useRef(null);
    const inView = useInView(ref, { once: true });

    useEffect(() => {
        if (!inView) return;
        const timeout = setTimeout(() => {
            const steps = 30;
            const stepVal = target / steps;
            let current = 0;
            const timer = setInterval(() => {
                current += stepVal;
                if (current >= target) {
                    setVal(target);
                    clearInterval(timer);
                } else {
                    setVal(Math.floor(current));
                }
            }, duration / steps);
            return () => clearInterval(timer);
        }, delay);
        return () => clearTimeout(timeout);
    }, [inView, target, duration, delay]);

    return <span ref={ref}>{val}</span>;
}

/* ═══════════════════════════════════════════════════════════════════════
   ACCURATE DASHBOARD MOCKUPS — matching real Socialchoice UI — WITH MOTION
   ═══════════════════════════════════════════════════════════════════════ */

/* ─── Mini screen components for the interactive demo ─── */
function DemoScreenOverview({ reduced }) {
    const pipelineWidths = [
        { base: 15, animate: [15, 18, 15], bg: 'bg-brand-neutral' },
        { base: 25, animate: [25, 28, 25], bg: 'bg-brand-dark' },
        { base: 60, animate: [60, 54, 60], bg: 'bg-brand' },
    ];
    return (
        <div className="flex-1 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <div className="font-heading text-base font-medium">Tổng quan</div>
                    <div className="text-[10px] text-muted-foreground">24 bài trong lịch · 156 lượt nhấp UTM · 8 kênh sẵn sàng</div>
                </div>
                <div className="flex gap-1.5">
                    <div className="flex items-center gap-1 rounded-xl bg-brand px-2.5 py-1.5 text-[10px] font-medium text-brand-ink"><Plus size={10} weight="bold" /> Tạo bài viết</div>
                    <div className="flex items-center gap-1 rounded-xl border px-2 py-1.5 text-[10px] text-muted-foreground"><Sparkle size={10} weight="bold" className="text-brand-dark" /> AI Lên lịch</div>
                </div>
            </div>
            <div className="panel p-3">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold">Quy trình nội dung</span>
                    <span className="text-[9px] text-muted-foreground">128 bài viết</span>
                </div>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    {pipelineWidths.map((seg, i) => (
                        <motion.div key={i} className={seg.bg} initial={{ width: 0 }}
                            animate={reduced ? { width: `${seg.base}%` } : { width: seg.animate.map(w => `${w}%`) }}
                            transition={reduced ? { duration: 0.5 } : { duration: 4, repeat: Infinity, ease: 'easeInOut' }} />
                    ))}
                </div>
                <div className="mt-1.5 flex gap-4 text-[9px] text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-brand-neutral" />Bản nháp: <strong className="text-foreground">19</strong></span>
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-brand-dark" />Đã lên lịch: <strong className="text-foreground">32</strong></span>
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-brand" />Đã xuất bản: <strong className="text-foreground">77</strong></span>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                {[
                    { label: 'LƯU LƯỢNG TRAFFIC', value: 156, badge: 'Thời gian thực', icon: CursorClick, hint: '12 link UTM đang hoạt động' },
                    { label: 'LỊCH BÀI SẮP TỚI', value: 24, badge: '24h tới', icon: CalendarBlank, hint: '3 bài đang chuẩn bị' },
                    { label: 'BÀI ĐÃ XUẤT BẢN', value: 77, badge: 'Hoàn tất', icon: CheckCircle, hint: 'Phân phối đa kênh thành công' },
                    { label: 'KÊNH KẾT NỐI', value: 8, badge: 'Sẵn sàng', icon: PlugsConnected, hint: 'Đồng bộ các mạng xã hội' },
                ].map((s, i) => (
                    <motion.div key={s.label} className="panel p-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{s.label}</span>
                            <motion.div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-brand-dark/40 bg-brand/20 text-brand-ink"
                                animate={reduced ? {} : { scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}>
                                {(() => { const SIcon = s.icon; return <SIcon size={12} weight="duotone" />; })()}
                            </motion.div>
                        </div>
                        <div className="flex items-baseline justify-between gap-1 mt-1.5">
                            <span className="font-heading text-lg font-semibold"><MockupCountUp target={s.value} delay={i * 150} /></span>
                            <span className="rounded-md border border-border/60 bg-muted/60 px-1 py-0.5 text-[7px] font-semibold uppercase text-muted-foreground">{s.badge}</span>
                        </div>
                        <div className="text-[8px] text-muted-foreground mt-1 truncate">{s.hint}</div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

function DemoScreenCreatePost() {
    const [charCount, setCharCount] = useState(0);
    const caption = 'Khám phá bộ sưu tập mới nhất — mỗi sản phẩm đều mang một câu chuyện riêng biệt ✨';
    useEffect(() => {
        let i = 0;
        const timer = setInterval(() => { i++; setCharCount(i); if (i >= caption.length) clearInterval(timer); }, 30);
        return () => clearInterval(timer);
    }, [caption.length]);
    return (
        <div className="flex-1 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
                <div className="font-heading text-base font-medium">Tạo bài viết</div>
                <div className="flex gap-1.5">
                    <div className="rounded-xl border px-2 py-1 text-[10px] text-muted-foreground">Nháp</div>
                    <div className="rounded-xl bg-brand px-2.5 py-1 text-[10px] font-medium text-brand-ink">Lên lịch</div>
                </div>
            </div>
            {/* Platform selector */}
            <div className="flex gap-1.5">
                {[{ Icon: FacebookLogo, name: 'Facebook', active: true, c: 'border-blue-300 bg-blue-50 text-blue-600' },
                { Icon: InstagramLogo, name: 'Instagram', active: true, c: 'border-pink-300 bg-pink-50 text-pink-600' },
                { Icon: LinkedinLogo, name: 'LinkedIn', active: false, c: 'border-border bg-surface text-muted-foreground' },
                ].map(p => (
                    <div key={p.name} className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[9px] font-semibold ${p.c}`}>
                        {(() => { const PIcon = p.Icon; return <PIcon size={11} weight="bold" />; })()} {p.name}
                        {p.active && <Check size={9} weight="bold" />}
                    </div>
                ))}
            </div>
            {/* Caption area with typing */}
            <div className="panel p-3 space-y-2">
                <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">Caption</div>
                <div className="min-h-[50px] rounded-lg border bg-background p-2.5 text-[11px] leading-relaxed">
                    {caption.slice(0, charCount)}
                    <motion.span className="inline-block h-3 w-[1.5px] bg-foreground/60 ml-0.5" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
                </div>
                <div className="flex items-center justify-between text-[8px] text-muted-foreground">
                    <span>{charCount}/{caption.length} ký tự</span>
                    <span className="flex items-center gap-1"><MagicWand size={9} className="text-brand-dark" /> AI Viết lại</span>
                </div>
            </div>
            {/* Image placeholder */}
            <div className="panel p-3">
                <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Hình ảnh</div>
                <div className="grid grid-cols-3 gap-1.5">
                    {[1, 2, 3].map(n => (
                        <motion.div key={n} className="aspect-square rounded-lg bg-muted/60 border border-dashed border-border flex items-center justify-center"
                            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: n * 0.15 }}>
                            <Images size={16} className="text-muted-foreground/40" />
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function DemoScreenCalendar({ reduced }) {
    const weekHeaders = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const events = { 3: 'IG', 5: 'FB', 8: 'LI', 12: 'TT', 15: 'FB', 18: 'IG', 20: 'LI', 22: 'TH' };
    const colorMap = { IG: 'bg-pink-100 text-pink-700 border-pink-200', FB: 'bg-blue-100 text-blue-700 border-blue-200', LI: 'bg-sky-100 text-sky-700 border-sky-200', TT: 'bg-purple-100 text-purple-700 border-purple-200', TH: 'bg-zinc-100 text-zinc-700 border-zinc-200' };
    return (
        <div className="flex-1 flex flex-col space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-heading text-base font-medium">Lịch nội dung</span>
                    <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 text-[8px] font-bold">28 bài</span>
                </div>
                <div className="flex gap-1">
                    {['Tháng', 'Tuần', 'Kênh'].map((v, i) => (
                        <span key={v} className={`rounded-md px-1.5 py-0.5 text-[8px] font-medium ${i === 0 ? 'bg-foreground text-background' : 'text-muted-foreground'}`}>{v}</span>
                    ))}
                </div>
            </div>
            <div className="text-[10px] font-heading font-medium text-muted-foreground">Tháng 11, 2026</div>
            <div className="grid grid-cols-7 text-center text-[8px] font-bold text-muted-foreground border-b pb-1">
                {weekHeaders.map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-px">
                {[...Array(28)].map((_, i) => {
                    const day = i + 1;
                    const ev = events[day];
                    const isToday = day === 18;
                    return (
                        <motion.div key={i} className={`min-h-[38px] p-1 rounded ${isToday ? 'bg-brand/5' : ''}`}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}>
                            <span className={`text-[8px] font-bold ${isToday ? 'flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand text-brand-ink text-[7px]' : ''}`}>{day}</span>
                            {ev && (
                                <motion.div className={`mt-0.5 rounded border px-1 py-0.5 text-[6px] font-bold truncate ${colorMap[ev]}`}
                                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + day * 0.02, type: 'spring', stiffness: 300 }}>
                                    {ev}
                                </motion.div>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

function DemoScreenAIAgent({ reduced }) {
    const [msgCount, setMsgCount] = useState(0);
    const [typing, setTyping] = useState(false);
    const msgs = useMemo(() => [
        { role: 'user', text: 'Viết 3 bài về cà phê cho tuần tới' },
        { role: 'agent', text: '✨ Đã tạo 3 bài! Mỗi bài được tối ưu cho FB & IG.' },
        { role: 'agent', text: '📋 Bài 1: T2 09:00 — Hành trình từ vườn đồi\n📋 Bài 2: T4 11:30 — Cà phê Đà Lạt\n📋 Bài 3: T6 20:00 — Nghệ thuật pour-over' },
    ], []);
    useEffect(() => {
        if (reduced) { setMsgCount(msgs.length); return; }
        const timers = [];
        timers.push(setTimeout(() => setMsgCount(1), 400));
        timers.push(setTimeout(() => setTyping(true), 1200));
        timers.push(setTimeout(() => { setTyping(false); setMsgCount(2); }, 2500));
        timers.push(setTimeout(() => setTyping(true), 3200));
        timers.push(setTimeout(() => { setTyping(false); setMsgCount(3); }, 4500));
        return () => timers.forEach(clearTimeout);
    }, [reduced, msgs.length]);
    return (
        <div className="flex-1 flex flex-col space-y-2">
            <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand text-brand-ink"><Sparkle size={13} weight="bold" /></div>
                <div>
                    <div className="font-heading text-sm font-medium">AI Agent</div>
                    <div className="text-[9px] text-muted-foreground">Trợ lý viết nội dung</div>
                </div>
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-successBg text-successFg px-1.5 py-0.5 text-[8px] font-semibold">
                    <motion.span className="h-1.5 w-1.5 rounded-full bg-successFg" animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} /> Online
                </span>
            </div>
            <div className="flex-1 space-y-2 min-h-[200px]">
                <AnimatePresence mode="popLayout">
                    {msgs.slice(0, msgCount).map((m, i) => (
                        <motion.div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start gap-1.5'}`}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
                            {m.role === 'agent' && <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-ink mt-0.5"><Sparkle size={10} weight="bold" /></div>}
                            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-[10px] leading-relaxed whitespace-pre-line ${m.role === 'user' ? 'bg-brand text-brand-ink rounded-tr-sm' : 'bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-tl-sm'}`}>
                                {m.text}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {typing && (
                    <motion.div className="flex gap-1.5 justify-start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-ink"><Sparkle size={10} weight="bold" /></div>
                        <div className="rounded-2xl bg-zinc-50 border border-zinc-200 rounded-tl-sm px-3 py-2 flex gap-1">
                            {[0, 1, 2].map(j => <motion.span key={j} className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.5, repeat: Infinity, delay: j * 0.12 }} />)}
                        </div>
                    </motion.div>
                )}
            </div>
            <div className="flex items-center gap-2 border-t pt-2">
                <div className="flex-1 rounded-xl border bg-background px-2.5 py-1.5 text-[9px] text-muted-foreground">Nhập yêu cầu cho AI...</div>
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand text-brand-ink"><PaperPlaneTilt size={11} weight="fill" /></div>
            </div>
        </div>
    );
}

function DemoScreenAnalytics({ reduced }) {
    return (
        <div className="flex-1 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <div className="font-heading text-base font-medium">Phân tích</div>
                    <div className="text-[10px] text-muted-foreground">Lượt tiếp cận 30 ngày · Tất cả kênh</div>
                </div>
                <div className="flex items-center gap-1"><TrendUp size={14} weight="duotone" className="text-successFg" /><span className="text-[10px] font-semibold text-successFg">+23%</span></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
                {[{ l: 'Lượt tiếp cận', v: '48.2K', c: '+18%' }, { l: 'Tương tác', v: '3,420', c: '+12%' }, { l: 'Tỉ lệ', v: '7.1%', c: '+2.3%' }].map((k, i) => (
                    <motion.div key={k.l} className="rounded-xl bg-surface p-2.5" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                        <div className="text-[8px] text-muted-foreground uppercase font-semibold">{k.l}</div>
                        <div className="font-heading text-base font-semibold mt-0.5">{k.v}</div>
                        <motion.div className="text-[8px] text-successFg font-semibold" animate={reduced ? {} : { opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }}>{k.c}</motion.div>
                    </motion.div>
                ))}
            </div>
            <svg className="w-full h-24" viewBox="0 0 400 100" fill="none">
                <defs>
                    <linearGradient id="demoChartG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffd631" stopOpacity="0.3" /><stop offset="100%" stopColor="#ffd631" stopOpacity="0" /></linearGradient>
                </defs>
                <path d="M0 75 Q20 70 40 68 T80 60 T120 55 T160 48 T200 42 T240 38 T280 30 T320 28 T360 22 T400 15 V100 H0Z" fill="url(#demoChartG)" />
                <motion.path d="M0 75 Q20 70 40 68 T80 60 T120 55 T160 48 T200 42 T240 38 T280 30 T320 28 T360 22 T400 15" stroke="#ffd631" strokeWidth="2.5" strokeLinecap="round" fill="none"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5 }} />
            </svg>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                {[{ bg: 'bg-blue-400', w: 35 }, { bg: 'bg-pink-400', w: 28 }, { bg: 'bg-sky-400', w: 20 }, { bg: 'bg-zinc-400', w: 10 }, { bg: 'bg-purple-400', w: 7 }].map((s, i) => (
                    <motion.div key={i} className={s.bg} initial={{ width: 0 }} animate={{ width: `${s.w}%` }} transition={{ delay: 0.3 + i * 0.08, duration: 0.5 }} />
                ))}
            </div>
        </div>
    );
}

function DemoScreenMedia() {
    const colors = ['bg-pink-100', 'bg-blue-100', 'bg-amber-100', 'bg-emerald-100', 'bg-purple-100', 'bg-sky-100'];
    return (
        <div className="flex-1 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
                <div className="font-heading text-base font-medium">Thư viện Media</div>
                <div className="flex items-center gap-1 rounded-xl bg-brand px-2 py-1 text-[10px] font-medium text-brand-ink"><Plus size={10} weight="bold" /> Tải lên</div>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-1.5 content-start">
                {[...colors, ...colors.slice(0, 3)].map((c, i) => (
                    <motion.div key={i} className={`aspect-square rounded-lg ${c} flex items-center justify-center border border-border/40`}
                        initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06, type: 'spring', stiffness: 250 }}
                        whileHover={{ scale: 1.05 }}>
                        <Images size={18} weight="duotone" className="text-foreground/30" />
                    </motion.div>
                ))}
            </div>
            <div className="text-[9px] text-muted-foreground text-center">6 tệp · 12.4 MB tổng dung lượng</div>
        </div>
    );
}

function DemoScreenShortlinks({ reduced }) {
    const links = [
        { short: 'sc.link/cafe-moi', clicks: 234, trend: '+18%' },
        { short: 'sc.link/khuyen-mai', clicks: 156, trend: '+12%' },
        { short: 'sc.link/landing', clicks: 89, trend: '+5%' },
    ];
    return (
        <div className="flex-1 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
                <div className="font-heading text-base font-medium">Shortlinks</div>
                <div className="flex items-center gap-1 rounded-xl bg-brand px-2 py-1 text-[10px] font-medium text-brand-ink"><Plus size={10} weight="bold" /> Tạo link</div>
            </div>
            <div className="space-y-1.5">
                {links.map((l, i) => (
                    <motion.div key={l.short} className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-surface/50"
                        initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12, type: 'spring', stiffness: 200 }}>
                        <div className="min-w-0 flex-1">
                            <div className="text-[10px] font-semibold text-brand-ink truncate flex items-center gap-1"><LinkSimple size={10} weight="bold" /> {l.short}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                                <div className="text-[11px] font-heading font-semibold"><MockupCountUp target={l.clicks} delay={i * 200} /></div>
                                <div className="text-[8px] text-muted-foreground">lượt nhấp</div>
                            </div>
                            <motion.span className="text-[9px] font-semibold text-successFg" animate={reduced ? {} : { opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }}>{l.trend}</motion.span>
                        </div>
                    </motion.div>
                ))}
            </div>
            <div className="flex-1 rounded-xl bg-muted/40 p-3 flex flex-col items-center justify-center">
                <div className="text-[9px] text-muted-foreground">Tổng lượt nhấp hôm nay</div>
                <div className="font-heading text-xl font-semibold mt-1"><MockupCountUp target={479} /></div>
            </div>
        </div>
    );
}

/* ─── 1. Overview Dashboard Mockup (Hero section) — INTERACTIVE DEMO ─── */
function OverviewMockup() {
    const reduced = usePrefersReducedMotion();
    const [activeNavIdx, setActiveNavIdx] = useState(0);
    const [notifIdx, setNotifIdx] = useState(0);
    const [autoPlay, setAutoPlay] = useState(true);

    const notifications = useMemo(() => [
        { text: 'Đăng thành công!', sub: 'Instagram · 2 phút trước', Icon: InstagramLogo, color: 'text-pink-600' },
        { text: 'Đã lên lịch!', sub: 'Facebook · 5 phút trước', Icon: FacebookLogo, color: 'text-blue-600' },
        { text: 'Bài mới publish!', sub: 'LinkedIn · 8 phút trước', Icon: LinkedinLogo, color: 'text-sky-700' },
        { text: 'Thread đã đăng!', sub: 'Threads · 12 phút trước', Icon: ThreadsLogo, color: 'text-zinc-700' },
    ], []);

    const navItems = useMemo(() => [
        { icon: Eye, label: 'Tổng quan', slug: 'overview' },
        { icon: PencilSimple, label: 'Tạo bài viết', slug: 'create' },
        { icon: CalendarBlank, label: 'Lịch nội dung', slug: 'calendar' },
        { icon: Sparkle, label: 'AI Agent', slug: 'ai-agent' },
        { icon: ChartLineUp, label: 'Phân tích', slug: 'analytics' },
        { icon: Images, label: 'Thư viện media', slug: 'media' },
        { icon: LinkSimple, label: 'Shortlinks', slug: 'shortlinks' },
    ], []);

    // Cycle notifications
    useEffect(() => {
        if (reduced) return;
        const timer = setInterval(() => setNotifIdx(p => (p + 1) % notifications.length), 3000);
        return () => clearInterval(timer);
    }, [reduced, notifications.length]);

    // Auto-cycle sidebar when no user interaction
    useEffect(() => {
        if (reduced || !autoPlay) return;
        const timer = setInterval(() => setActiveNavIdx(p => (p + 1) % navItems.length), 4000);
        return () => clearInterval(timer);
    }, [reduced, autoPlay, navItems.length]);

    // User clicks a nav item — stop autoplay
    const handleNavClick = (idx) => {
        setAutoPlay(false);
        setActiveNavIdx(idx);
    };

    // Render the active screen content
    const renderScreen = () => {
        switch (activeNavIdx) {
            case 0: return <DemoScreenOverview reduced={reduced} />;
            case 1: return <DemoScreenCreatePost />;
            case 2: return <DemoScreenCalendar reduced={reduced} />;
            case 3: return <DemoScreenAIAgent reduced={reduced} />;
            case 4: return <DemoScreenAnalytics reduced={reduced} />;
            case 5: return <DemoScreenMedia />;
            case 6: return <DemoScreenShortlinks reduced={reduced} />;
            default: return <DemoScreenOverview reduced={reduced} />;
        }
    };

    return (
        <motion.div
            className="relative mx-auto w-full max-w-[900px]"
            variants={scaleIn}
            custom={0.2}
        >
            {/* Glow behind */}
            <div className="absolute -inset-4 rounded-3xl bg-brand/20 blur-2xl" aria-hidden="true" />

            <div className="relative overflow-hidden rounded-2xl border bg-card shadow-xl">
                {/* Browser chrome — URL updates! */}
                <div className="flex items-center gap-2 border-b bg-surface px-4 py-2.5">
                    <div className="flex gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                        <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                    </div>
                    <div className="mx-auto rounded-md bg-background px-12 py-1 text-xs text-muted-foreground transition-all duration-300">
                        socialchoice.vercel.app/{navItems[activeNavIdx].slug}
                    </div>
                </div>

                <div className="flex h-[420px]">
                    {/* Sidebar — CLICKABLE */}
                    <div className="hidden w-48 shrink-0 border-r bg-surface p-4 sm:flex sm:flex-col overflow-hidden">
                        <div className="mb-4 font-heading text-sm font-medium">SocialChoice</div>
                        <div className="space-y-1">
                            {navItems.map(({ icon: Icon, label }, i) => (
                                <motion.div
                                    key={label}
                                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs cursor-pointer select-none transition-colors duration-200 ${i === activeNavIdx ? 'bg-brand/15 font-medium text-brand-ink' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
                                    onClick={() => handleNavClick(i)}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.8 + i * 0.08 }}
                                    whileHover={{ x: 2 }}
                                    whileTap={{ scale: 0.97 }}
                                >
                                    <Icon size={18} weight={i === activeNavIdx ? 'duotone' : 'regular'} />
                                    {label}
                                    {i === activeNavIdx && (
                                        <motion.div
                                            className="ml-auto h-1.5 w-1.5 rounded-full bg-brand"
                                            layoutId="navDot"
                                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                                        />
                                    )}
                                </motion.div>
                            ))}
                        </div>
                        {/* Hint */}
                        <motion.div className="mt-4 rounded-lg bg-muted/50 px-2.5 py-2 text-[8px] text-muted-foreground text-center"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}>
                            👆 Bấm để xem từng tính năng
                        </motion.div>
                    </div>

                    {/* Main area — animated screen switch */}
                    <div className="flex-1 flex flex-col p-4 bg-background overflow-y-auto overflow-x-hidden">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeNavIdx}
                                initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                className="flex-1 flex flex-col"
                            >
                                {renderScreen()}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Mobile nav tabs (visible on small screens where sidebar is hidden) */}
                <div className="flex sm:hidden border-t overflow-x-auto">
                    {navItems.map(({ icon: Icon, label }, i) => (
                        <button
                            key={label}
                            onClick={() => handleNavClick(i)}
                            className={`flex flex-col items-center gap-0.5 px-3 py-2 text-[8px] min-w-fit transition-colors ${i === activeNavIdx ? 'text-brand-ink font-semibold border-b-2 border-brand' : 'text-muted-foreground'}`}
                        >
                            <Icon size={14} weight={i === activeNavIdx ? 'duotone' : 'regular'} />
                            {label.split(' ')[0]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Floating badge — bobbing */}
            <motion.div
                className="absolute -right-3 -top-3 flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-brand-ink shadow-lg"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
                <Sparkle size={14} weight="fill" /> AI-Powered
            </motion.div>

            {/* Cycling floating notification */}
            <AnimatePresence mode="wait">
                {(() => {
                    const notif = notifications[notifIdx];
                    const NotifIcon = notif.Icon;
                    return (
                        <motion.div
                            key={notifIdx}
                            className="absolute -left-4 bottom-12 flex items-center gap-2 rounded-xl border bg-card px-3 py-2.5 text-xs shadow-lg"
                            initial={{ opacity: 0, x: -30, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.9 }}
                            transition={{ duration: 0.4 }}
                        >
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-successBg">
                                <Check size={14} weight="bold" className="text-successFg" />
                            </div>
                            <div>
                                <div className="text-[11px] font-medium">{notif.text}</div>
                                <div className="text-[9px] text-muted-foreground flex items-center gap-1">
                                    <NotifIcon size={9} weight="bold" className={notif.color} />
                                    {notif.sub}
                                </div>
                            </div>
                        </motion.div>
                    );
                })()}
            </AnimatePresence>
        </motion.div>
    );
}

/* ─── 2. Calendar Mockup — LIVING MOTION — drag simulation + pop-in ─── */
function CalendarMockupReal() {
    const reduced = usePrefersReducedMotion();
    const weekHeaders = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];

    const baseEvents = {
        3: [{ label: 'IG Story', color: 'border-pink-300 bg-pink-50 text-pink-700' }],
        5: [{ label: 'FB Post', color: 'border-blue-300 bg-blue-50 text-blue-700' }],
        8: [
            { label: 'LinkedIn', color: 'border-sky-300 bg-sky-50 text-sky-700' },
            { label: 'Threads', color: 'border-zinc-300 bg-zinc-50 text-zinc-700' },
        ],
        12: [{ label: 'TikTok', color: 'border-purple-300 bg-purple-50 text-purple-700' }],
        15: [{ label: 'FB Reel', color: 'border-blue-300 bg-blue-50 text-blue-700' }],
        18: [{ label: 'IG Carousel', color: 'border-pink-300 bg-pink-50 text-pink-700' }],
        20: [{ label: 'LinkedIn', color: 'border-sky-300 bg-sky-50 text-sky-700' }],
    };

    // Simulate a "new post" materializing animation — a chip appearing in day 10
    const [showNewPost, setShowNewPost] = useState(false);
    // Simulate drag: move a chip from day 12 to day 14
    const [dragPhase, setDragPhase] = useState(0); // 0=at 12, 1=floating, 2=at 14

    useEffect(() => {
        if (reduced) return;
        // New post appears after 3s
        const t1 = setTimeout(() => setShowNewPost(true), 3000);
        // Drag simulation: start at 5s, move at 5.5s, land at 6s, reset at 9s
        const cycle = () => {
            setDragPhase(0);
            const a = setTimeout(() => setDragPhase(1), 1500);
            const b = setTimeout(() => setDragPhase(2), 2500);
            return [a, b];
        };
        const dragStart = setTimeout(() => {
            cycle();
            const interval = setInterval(cycle, 6000);
            return () => clearInterval(interval);
        }, 5000);
        return () => { clearTimeout(t1); clearTimeout(dragStart); };
    }, [reduced]);

    return (
        <motion.div
            className="panel overflow-hidden rounded-2xl border bg-card shadow-lg"
            whileHover={{ scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 200 }}
        >
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b px-4 py-2.5">
                <div className="flex items-center gap-2">
                    <span className="font-heading text-sm font-medium">Tháng 11, 2026</span>
                    <motion.span
                        className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[9px] font-bold"
                        animate={reduced ? {} : { scale: [1, 1.08, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        28 bài
                    </motion.span>
                </div>
                <div className="flex gap-1">
                    {['Tháng', 'Tuần', 'Kênh', 'Danh sách'].map((v, i) => (
                        <span key={v} className={`rounded-md px-2 py-1 text-[9px] font-medium ${i === 0 ? 'bg-foreground text-background' : 'text-muted-foreground'}`}>{v}</span>
                    ))}
                </div>
            </div>

            {/* Week headers */}
            <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-[9px] font-bold text-muted-foreground">
                {weekHeaders.map((d, i) => (
                    <div key={d} className={`p-2 border-r border-border/50 last:border-r-0 ${i === 6 ? 'text-rose-500' : i === 5 ? 'text-brand-ink' : ''}`}>{d}</div>
                ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7">
                {[...Array(28)].map((_, i) => {
                    const dayNum = i + 1;
                    const isToday = dayNum === 18;
                    const dayEvents = baseEvents[dayNum] || [];
                    const showDragSource = dayNum === 12 && dragPhase === 0;
                    const showDragTarget = dayNum === 14 && dragPhase === 2;

                    return (
                        <motion.div
                            key={i}
                            className={`group relative min-h-[65px] border-b border-r border-border/50 p-1.5 ${isToday ? 'bg-brand/5' : 'hover:bg-muted/20'}`}
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.015, duration: 0.25 }}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className={`text-[9px] font-bold ${isToday
                                    ? 'flex h-4 w-4 items-center justify-center rounded-full bg-brand text-brand-ink text-[8px]'
                                    : 'text-foreground'
                                    }`}>
                                    {dayNum}
                                </span>
                                <span className="opacity-0 group-hover:opacity-100 flex h-3.5 w-3.5 items-center justify-center rounded bg-muted text-muted-foreground transition-opacity">
                                    <Plus size={8} weight="bold" />
                                </span>
                            </div>

                            {/* Today pulse ring */}
                            {isToday && !reduced && (
                                <motion.div
                                    className="absolute left-1 top-1 h-5 w-5 rounded-full border-2 border-brand/40"
                                    animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                                    transition={{ duration: 2.5, repeat: Infinity }}
                                />
                            )}

                            {/* Day events — pop in with stagger */}
                            {dayEvents.map((e, ei) => (
                                <motion.div
                                    key={ei}
                                    className={`mb-0.5 rounded-md border px-1.5 py-0.5 text-[7px] font-semibold truncate ${e.color}`}
                                    initial={{ opacity: 0, scale: 0.5, y: 5 }}
                                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.5 + (dayNum * 0.03) + ei * 0.1, type: 'spring', stiffness: 300 }}
                                >
                                    {e.label}
                                </motion.div>
                            ))}

                            {/* Drag source chip (TikTok on day 12 visible only in phase 0) */}
                            {showDragSource && (
                                <motion.div
                                    className="mb-0.5 rounded-md border border-purple-300 bg-purple-50 text-purple-700 px-1.5 py-0.5 text-[7px] font-semibold truncate"
                                    animate={{ opacity: [1, 0.3] }}
                                    transition={{ duration: 0.3 }}
                                >
                                    TikTok
                                </motion.div>
                            )}

                            {/* Drag target chip (day 14 after drag completes) */}
                            {showDragTarget && (
                                <motion.div
                                    className="mb-0.5 rounded-md border border-purple-300 bg-purple-50 text-purple-700 px-1.5 py-0.5 text-[7px] font-semibold truncate"
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 400 }}
                                >
                                    TikTok ✓
                                </motion.div>
                            )}

                            {/* New post materializing on day 10 */}
                            {dayNum === 10 && (
                                <AnimatePresence>
                                    {showNewPost && (
                                        <motion.div
                                            className="mb-0.5 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 text-[7px] font-semibold truncate"
                                            initial={{ opacity: 0, scale: 0, height: 0 }}
                                            animate={{ opacity: 1, scale: 1, height: 'auto' }}
                                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                        >
                                            + Bài mới
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Footer hint */}
            <div className="px-3 py-2 text-[8px] text-muted-foreground flex items-center gap-1">
                {/* Animated drag indicator */}
                <motion.span
                    animate={reduced ? {} : { x: [0, 8, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                    ✋
                </motion.span>
                <span>Nắm và kéo thả bài viết vào bất kỳ ngày nào để đổi lịch đăng.</span>
            </div>
        </motion.div>
    );
}

/* ─── 3. AI Agent Chat Mockup — LIVING MOTION — sequential typing + reveal ─── */
function AIChatMockupReal() {
    const reduced = usePrefersReducedMotion();
    const [visibleMsgs, setVisibleMsgs] = useState(reduced ? 3 : 0);
    const [showTyping, setShowTyping] = useState(false);
    const [cursorBlink, setCursorBlink] = useState(true);

    const messages = useMemo(() => [
        { role: 'user', text: 'Viết 3 bài về cà phê đặc sản cho tuần tới, đăng Facebook và Instagram' },
        {
            role: 'agent',
            text: '✨ Mình đã tạo 3 bài viết về cà phê đặc sản! Mỗi bài được tối ưu riêng cho Facebook và Instagram với caption, hashtag phù hợp.',
        },
        {
            role: 'agent', type: 'plan', items: [
                { title: 'Hành trình từ vườn đồi đến tách thưởng thức', time: 'T2 · 09:00', platforms: ['facebook', 'instagram'] },
                { title: 'Cà phê Đà Lạt — hương vị cao nguyên', time: 'T4 · 11:30', platforms: ['facebook', 'instagram'] },
                { title: 'Nghệ thuật pha pour-over tại nhà', time: 'T6 · 20:00', platforms: ['facebook', 'instagram'] },
            ]
        },
    ], []);

    // Sequential message reveal
    useEffect(() => {
        if (reduced) { setVisibleMsgs(messages.length); return; }
        const timers = [];
        // User message appears after 0.5s
        timers.push(setTimeout(() => setVisibleMsgs(1), 500));
        // Show typing for 1.5s before agent reply
        timers.push(setTimeout(() => setShowTyping(true), 1500));
        timers.push(setTimeout(() => { setShowTyping(false); setVisibleMsgs(2); }, 3000));
        // Show typing again before plan
        timers.push(setTimeout(() => setShowTyping(true), 3800));
        timers.push(setTimeout(() => { setShowTyping(false); setVisibleMsgs(3); }, 5000));

        // Loop the whole sequence after 12s
        const loop = setInterval(() => {
            setVisibleMsgs(0);
            setShowTyping(false);
            timers.push(setTimeout(() => setVisibleMsgs(1), 500));
            timers.push(setTimeout(() => setShowTyping(true), 1500));
            timers.push(setTimeout(() => { setShowTyping(false); setVisibleMsgs(2); }, 3000));
            timers.push(setTimeout(() => setShowTyping(true), 3800));
            timers.push(setTimeout(() => { setShowTyping(false); setVisibleMsgs(3); }, 5000));
        }, 14000);

        return () => { timers.forEach(clearTimeout); clearInterval(loop); };
    }, [reduced, messages.length]);

    // Blinking cursor in input
    useEffect(() => {
        if (reduced) return;
        const timer = setInterval(() => setCursorBlink(p => !p), 530);
        return () => clearInterval(timer);
    }, [reduced]);

    return (
        <motion.div
            className="panel overflow-hidden rounded-2xl border bg-card shadow-lg"
            whileHover={{ scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 200 }}
        >
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b px-4 py-3 bg-surface">
                <div className="flex items-center gap-2.5">
                    <motion.div
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-brand-ink"
                        animate={reduced ? {} : { rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <Sparkle size={16} weight="bold" />
                    </motion.div>
                    <div>
                        <div className="font-heading text-sm font-medium">AI Agent</div>
                        <div className="text-[9px] text-muted-foreground">Trợ lý viết nội dung & lên lịch</div>
                    </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-successBg text-successFg px-2 py-0.5 text-[9px] font-semibold">
                    <motion.span
                        className="h-1.5 w-1.5 rounded-full bg-successFg"
                        animate={reduced ? {} : { scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    Online
                </span>
            </div>

            {/* Messages with sequential reveal */}
            <div className="p-4 space-y-3 min-h-[260px]">
                <AnimatePresence mode="popLayout">
                    {messages.slice(0, visibleMsgs).map((msg, i) => (
                        <motion.div
                            key={i}
                            className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            initial={{ opacity: 0, y: 15, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
                        >
                            {msg.role === 'agent' && (
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-ink">
                                    <Sparkle size={13} weight="bold" />
                                </div>
                            )}
                            <div className={`max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                {msg.type !== 'plan' ? (
                                    <div className={`rounded-2xl px-3.5 py-2.5 text-[11px] leading-relaxed whitespace-pre-line ${msg.role === 'user'
                                        ? 'bg-brand text-brand-ink font-medium rounded-tr-sm'
                                        : 'bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-tl-sm'
                                        }`}>
                                        {msg.text}
                                    </div>
                                ) : (
                                    /* Plan cards — staggered slide-in */
                                    <div className="w-full rounded-xl border border-brand-dark/50 bg-brand/10 p-3 space-y-2">
                                        <div className="text-[10px] font-bold text-brand-ink">📋 Lịch đăng bài đề xuất:</div>
                                        {msg.items.map((item, j) => (
                                            <motion.div
                                                key={j}
                                                className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-card p-2"
                                                initial={{ opacity: 0, x: -20, scale: 0.9 }}
                                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                                transition={{ delay: j * 0.3, type: 'spring', stiffness: 200 }}
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[10px] font-semibold truncate">{item.title}</div>
                                                    <div className="flex items-center gap-1 mt-0.5 text-[9px] text-muted-foreground">
                                                        <Clock size={9} /> {item.time}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 shrink-0">
                                                    {item.platforms.map(p => {
                                                        const icons = { facebook: FacebookLogo, instagram: InstagramLogo };
                                                        const Icon = icons[p];
                                                        return <div key={p} className="flex h-5 w-5 items-center justify-center rounded-md bg-muted"><Icon size={11} weight="bold" /></div>;
                                                    })}
                                                </div>
                                            </motion.div>
                                        ))}
                                        {/* CTA button with glow pulse */}
                                        <div className="flex gap-1.5 pt-1">
                                            <motion.span
                                                className="rounded-lg bg-brand text-brand-ink px-2.5 py-1 text-[9px] font-semibold cursor-pointer"
                                                animate={reduced ? {} : {
                                                    boxShadow: ['0 0 0 0 rgba(255,214,49,0)', '0 0 12px 3px rgba(255,214,49,0.4)', '0 0 0 0 rgba(255,214,49,0)'],
                                                }}
                                                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                                            >
                                                ✓ Xác nhận & Lên lịch
                                            </motion.span>
                                            <span className="rounded-lg border px-2.5 py-1 text-[9px] font-medium text-muted-foreground">Chỉnh sửa</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Typing indicator */}
                <AnimatePresence>
                    {showTyping && (
                        <motion.div
                            className="flex gap-2.5 justify-start"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                        >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-ink">
                                <Sparkle size={13} weight="bold" />
                            </div>
                            <div className="rounded-2xl bg-zinc-50 border border-zinc-200 rounded-tl-sm">
                                <TypingIndicator />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Input bar with blinking cursor */}
            <div className="border-t px-4 py-3 flex items-center gap-2">
                <div className="flex-1 rounded-xl border bg-background px-3 py-2 text-[10px] text-muted-foreground flex items-center">
                    Nhập nội dung hoặc yêu cầu AI tạo bài...
                    <motion.span
                        className="ml-0.5 inline-block h-3 w-[1.5px] bg-foreground/40"
                        animate={{ opacity: cursorBlink ? 1 : 0 }}
                        transition={{ duration: 0.1 }}
                    />
                </div>
                <motion.div
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-brand-ink cursor-pointer"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9, rotate: -15 }}
                >
                    <PaperPlaneTilt size={14} weight="fill" />
                </motion.div>
            </div>
        </motion.div>
    );
}

/* ─── 4. Schedule & Channels — LIVING MOTION — pulses + stagger + live indicators ─── */
function ScheduleAndChannelsMockup() {
    const reduced = usePrefersReducedMotion();
    const [highlightDay, setHighlightDay] = useState(0);

    const weekDays = useMemo(() => [
        { label: 'Th 2', date: '18/11', isToday: true, count: 3 },
        { label: 'Th 3', date: '19/11', count: 2 },
        { label: 'Th 4', date: '20/11', count: 1 },
        { label: 'Th 5', date: '21/11', count: 0 },
        { label: 'Th 6', date: '22/11', count: 4 },
        { label: 'Th 7', date: '23/11', count: 1 },
        { label: 'CN', date: '24/11', count: 0 },
    ], []);

    const channels = useMemo(() => [
        { icon: FacebookLogo, name: 'SocialChoice VN', handle: '@socialchoice.vn', status: 'connected', bg: 'bg-blue-50', border: 'border-blue-200', color: 'text-blue-600' },
        { icon: InstagramLogo, name: 'socialchoice_official', handle: '@socialchoice_official', status: 'connected', bg: 'bg-pink-50', border: 'border-pink-200', color: 'text-pink-600' },
        { icon: LinkedinLogo, name: 'SocialChoice', handle: 'Company Page', status: 'connected', bg: 'bg-sky-50', border: 'border-sky-200', color: 'text-sky-700' },
        { icon: ThreadsLogo, name: 'socialchoice', handle: '@socialchoice', status: 'demo', bg: 'bg-zinc-50', border: 'border-zinc-200', color: 'text-zinc-700' },
    ], []);

    const posts = useMemo(() => [
        { title: 'Giới thiệu bộ sưu tập mới', time: '09:00', platform: FacebookLogo, pColor: 'text-blue-600 bg-blue-50 border-blue-200', status: 'scheduled' },
        { title: 'Behind the scenes', time: '11:30', platform: InstagramLogo, pColor: 'text-pink-600 bg-pink-50 border-pink-200', status: 'scheduled' },
        { title: 'Tips marketing cuối tuần', time: '20:00', platform: LinkedinLogo, pColor: 'text-sky-700 bg-sky-50 border-sky-200', status: 'draft' },
    ], []);

    // Cycle through days highlight
    useEffect(() => {
        if (reduced) return;
        const timer = setInterval(() => setHighlightDay(p => (p + 1) % weekDays.length), 2000);
        return () => clearInterval(timer);
    }, [reduced, weekDays.length]);

    // Show notification badge on channel periodically
    const [notifChannel, setNotifChannel] = useState(-1);
    useEffect(() => {
        if (reduced) return;
        const timer = setInterval(() => {
            setNotifChannel(Math.floor(Math.random() * channels.length));
            setTimeout(() => setNotifChannel(-1), 2000);
        }, 4000);
        return () => clearInterval(timer);
    }, [reduced, channels.length]);

    return (
        <motion.div
            className="space-y-4"
            whileHover={{ scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 200 }}
        >
            {/* Upcoming Schedule */}
            <div className="panel p-4 space-y-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-border/80">
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground">
                            <CalendarBlank size={15} weight="bold" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="font-heading text-[13px] font-semibold">Lịch bài đăng sắp tới</span>
                                <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 text-[8px] font-bold">10 bài</span>
                            </div>
                            <div className="text-[9px] text-muted-foreground">Lịch phát sóng nội dung tự động trên các kênh</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <motion.span
                            className="flex items-center gap-1 rounded-xl border px-2 py-1 text-[9px] font-semibold cursor-pointer"
                            animate={reduced ? {} : { borderColor: ['rgba(0,0,0,0.1)', 'rgba(255,214,49,0.5)', 'rgba(0,0,0,0.1)'] }}
                            transition={{ duration: 3, repeat: Infinity }}
                        >
                            <Sparkle size={10} weight="bold" className="text-brand-dark" /> AI lên lịch
                        </motion.span>
                    </div>
                </div>

                {/* Weekly mini calendar bar — with scanning highlight */}
                <div>
                    <div className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Lịch tuần này:</div>
                    <div className="grid grid-cols-7 gap-1">
                        {weekDays.map((d, i) => (
                            <motion.div
                                key={i}
                                className={`flex flex-col items-center rounded-xl border px-1 py-1.5 text-center transition-colors duration-300 ${d.isToday
                                    ? 'bg-muted/80 border-foreground/40 font-semibold'
                                    : i === highlightDay
                                        ? 'bg-brand/10 border-brand/40'
                                        : 'bg-surface/60 border-border/60'
                                    }`}
                                initial={{ opacity: 0, y: 5 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <span className="text-[8px] font-bold uppercase opacity-75">{d.label}</span>
                                <span className="text-[9px] font-heading font-semibold mt-0.5">{d.date}</span>
                                {d.count > 0 && (
                                    <motion.span
                                        className="mt-0.5 h-1.5 w-1.5 rounded-full bg-foreground"
                                        animate={reduced ? {} : (i === highlightDay ? { scale: [1, 1.8, 1] } : {})}
                                        transition={{ duration: 0.6 }}
                                    />
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Post items — slide in staggered */}
                <div className="space-y-1.5">
                    {posts.map((post, i) => (
                        <motion.div
                            key={i}
                            className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-surface/50 p-2.5 hover:bg-muted/30 transition-colors"
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 + i * 0.15, type: 'spring', stiffness: 200 }}
                        >
                            <motion.div
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${post.pColor}`}
                                animate={reduced ? {} : { rotate: [0, 3, -3, 0] }}
                                transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }}
                            >
                                <post.platform size={13} weight="bold" />
                            </motion.div>
                            <div className="min-w-0 flex-1">
                                <div className="text-[10px] font-semibold truncate">{post.title}</div>
                                <div className="text-[8px] text-muted-foreground flex items-center gap-1">
                                    <Clock size={8} /> {post.time}
                                </div>
                            </div>
                            <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold border ${post.status === 'scheduled' ? 'bg-infoBg text-infoFg border-transparent' : 'bg-muted text-muted-foreground border-border'}`}>
                                {post.status === 'scheduled' ? 'Đã lên lịch' : 'Nháp'}
                            </span>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Channel Status Panel — with live heartbeat + notification badge */}
            <div className="panel p-4 space-y-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-border/80">
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand-dark/40 bg-brand/20 text-brand-ink">
                            <ShareNetwork size={15} weight="duotone" />
                        </div>
                        <div>
                            <div className="font-heading text-[13px] font-semibold">Kênh xuất bản</div>
                            <div className="text-[9px] text-muted-foreground">Trạng thái kết nối tài khoản</div>
                        </div>
                    </div>
                    <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors">
                        Quản lý <ArrowUpRight size={10} />
                    </span>
                </div>

                <div className="space-y-1.5">
                    {channels.map((ch, i) => (
                        <motion.div
                            key={i}
                            className="relative flex items-center justify-between gap-2.5 p-2 rounded-xl border border-border/60 bg-surface/50"
                            initial={{ opacity: 0, y: 8 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, type: 'spring', stiffness: 200 }}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${ch.bg} ${ch.border} ${ch.color}`}>
                                    {(() => { const ChIcon = ch.icon; return <ChIcon size={14} weight="bold" />; })()}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[10px] font-semibold truncate">{ch.name}</div>
                                    <div className="text-[8px] text-muted-foreground truncate">{ch.handle}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {/* Notification badge */}
                                <AnimatePresence>
                                    {notifChannel === i && (
                                        <motion.span
                                            className="rounded-full bg-red-500 text-white px-1.5 py-0.5 text-[7px] font-bold"
                                            initial={{ opacity: 0, scale: 0 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0 }}
                                        >
                                            +1
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                                <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-semibold border ${ch.status === 'connected' ? 'bg-successBg text-successFg border-transparent' : 'bg-warnBg text-warnFg border-transparent'}`}>
                                    {/* Live heartbeat dot for connected channels */}
                                    {ch.status === 'connected' && !reduced ? (
                                        <motion.span
                                            className="h-1.5 w-1.5 rounded-full bg-successFg"
                                            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
                                            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                                        />
                                    ) : (
                                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />
                                    )}
                                    {ch.status === 'connected' ? 'Hoạt động' : 'Mô phỏng'}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

/* ─── 5. Analytics Chart Mockup — LIVING MOTION — draw + shimmer + count-up ─── */
function AnalyticsMockupReal() {
    const reduced = usePrefersReducedMotion();
    const [growthFlash, setGrowthFlash] = useState(false);

    // Periodic growth flash
    useEffect(() => {
        if (reduced) return;
        const timer = setInterval(() => {
            setGrowthFlash(true);
            setTimeout(() => setGrowthFlash(false), 1000);
        }, 5000);
        return () => clearInterval(timer);
    }, [reduced]);

    return (
        <motion.div
            className="panel overflow-hidden rounded-2xl border bg-card p-5 shadow-lg"
            whileHover={{ scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 200 }}
        >
            <div className="flex items-center justify-between mb-4">
                <div>
                    <div className="font-heading text-sm font-medium">Hiệu quả nội dung</div>
                    <div className="text-[10px] text-muted-foreground">Lượt tiếp cận 30 ngày · Tất cả kênh</div>
                </div>
                <motion.div
                    className="flex items-center gap-1"
                    animate={growthFlash ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.4 }}
                >
                    <TrendUp size={16} weight="duotone" className="text-successFg" />
                    <span className="text-xs font-semibold text-successFg">+23%</span>
                </motion.div>
            </div>

            {/* KPI row — count up */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                    { label: 'Lượt tiếp cận', value: '48.2K', numVal: 48200, change: '+18%' },
                    { label: 'Tương tác', value: '3,420', numVal: 3420, change: '+12%' },
                    { label: 'Tỉ lệ tương tác', value: '7.1%', numVal: 71, change: '+2.3%' },
                ].map((kpi, i) => (
                    <motion.div
                        key={kpi.label}
                        className="rounded-xl bg-surface p-3"
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 + i * 0.1 }}
                    >
                        <div className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wide">{kpi.label}</div>
                        <div className="font-heading text-lg font-semibold mt-1">{kpi.value}</div>
                        <motion.div
                            className="text-[9px] text-successFg font-semibold mt-0.5"
                            animate={reduced ? {} : { opacity: [0.6, 1, 0.6] }}
                            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                        >
                            {kpi.change}
                        </motion.div>
                    </motion.div>
                ))}
            </div>

            {/* SVG Chart — continuous draw + shimmer overlay */}
            <div className="relative">
                <svg className="w-full h-32" viewBox="0 0 400 100" fill="none">
                    <defs>
                        <linearGradient id="chartGradLp3" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ffd631" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#ffd631" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="shimmerGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#ffd631" stopOpacity="0" />
                            <stop offset="50%" stopColor="#ffd631" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#ffd631" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    {/* Area fill */}
                    <path
                        d="M0 75 Q20 70 40 68 T80 60 T120 55 T160 48 T200 42 T240 38 T280 30 T320 28 T360 22 T400 15 V100 H0Z"
                        fill="url(#chartGradLp3)"
                    />
                    {/* Main line — draws in */}
                    <motion.path
                        d="M0 75 Q20 70 40 68 T80 60 T120 55 T160 48 T200 42 T240 38 T280 30 T320 28 T360 22 T400 15"
                        stroke="#ffd631"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        fill="none"
                        initial={{ pathLength: 0 }}
                        whileInView={{ pathLength: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.5, delay: 0.3 }}
                    />
                    {/* Shimmer line overlay */}
                    {!reduced && (
                        <motion.path
                            d="M0 75 Q20 70 40 68 T80 60 T120 55 T160 48 T200 42 T240 38 T280 30 T320 28 T360 22 T400 15"
                            stroke="url(#shimmerGrad)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            fill="none"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: [0, 1], pathOffset: [0, 1] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: 2 }}
                        />
                    )}
                    {/* Pulsing dot at the end of chart line */}
                    {!reduced && (
                        <motion.circle
                            cx="400" cy="15" r="4"
                            fill="#ffd631"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 1, 0], r: [3, 6, 3] }}
                            transition={{ duration: 2, repeat: Infinity, delay: 2 }}
                        />
                    )}
                    {/* Data point dots */}
                    {[
                        [0, 75], [80, 60], [160, 48], [240, 38], [320, 28], [400, 15]
                    ].map(([cx, cy], i) => (
                        <motion.circle
                            key={i}
                            cx={cx} cy={cy} r="2.5"
                            fill="#ffd631"
                            stroke="white"
                            strokeWidth="1"
                            initial={{ opacity: 0, scale: 0 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 + i * 0.15 }}
                        />
                    ))}
                </svg>
            </div>

            {/* Platform breakdown bar — animated width */}
            <div className="mt-3 pt-3 border-t">
                <div className="text-[9px] font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Phân bổ theo kênh</div>
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                    {[
                        { bg: 'bg-blue-400', width: 35 },
                        { bg: 'bg-pink-400', width: 28 },
                        { bg: 'bg-sky-400', width: 20 },
                        { bg: 'bg-zinc-400', width: 10 },
                        { bg: 'bg-purple-400', width: 7 },
                    ].map((seg, i) => (
                        <motion.div
                            key={i}
                            className={seg.bg}
                            initial={{ width: 0 }}
                            whileInView={{ width: `${seg.width}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.5 + i * 0.1, duration: 0.6, ease: 'easeOut' }}
                        />
                    ))}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-3 text-[8px] text-muted-foreground">
                    {[
                        ['Facebook', 'bg-blue-400', '35%'],
                        ['Instagram', 'bg-pink-400', '28%'],
                        ['LinkedIn', 'bg-sky-400', '20%'],
                        ['Threads', 'bg-zinc-400', '10%'],
                        ['TikTok', 'bg-purple-400', '7%'],
                    ].map(([name, bg, pct]) => (
                        <span key={name} className="flex items-center gap-1">
                            <span className={`h-1.5 w-1.5 rounded-full ${bg}`} />
                            {name}: <strong>{pct}</strong>
                        </span>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════
   PAGE SECTIONS
   ═══════════════════════════════════════════════════════════════════════ */

/* ─────────────────────── Feature Row (alternating) ─────────────────────── */
function FeatureRow({ id, title, text, icon: Icon, tagline, features, reversed, mockup }) {
    return (
        <Section id={id} className={`py-14 md:py-20 ${id ? 'scroll-mt-16' : ''}`}>
            <div className={`mx-auto flex max-w-[1100px] flex-col items-center gap-10 px-5 md:flex-row ${reversed ? 'md:flex-row-reverse' : ''}`}>
                <motion.div className="flex-1 space-y-5" variants={reversed ? slideInRight : slideInLeft}>
                    <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand-ink">
                        <Icon size={14} weight="fill" /> {tagline}
                    </div>
                    <h2 className="font-heading text-2xl md:text-3xl font-medium leading-tight">{title}</h2>
                    <p className="text-muted-foreground text-sm leading-relaxed max-w-md">{text}</p>
                    <div className="space-y-2.5">
                        {features.map((f, i) => (
                            <motion.div
                                key={i}
                                className="flex items-start gap-2.5 text-sm"
                                initial={{ opacity: 0, x: reversed ? 20 : -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.3 + i * 0.1 }}
                            >
                                <Check size={16} weight="bold" className="mt-0.5 shrink-0 text-brand-ink" />
                                <span>{f}</span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                <motion.div className="flex-1 w-full" variants={reversed ? slideInLeft : slideInRight}>
                    {mockup}
                </motion.div>
            </div>
        </Section>
    );
}

/* ─────────────────────── Social Proof Bar ─────────────────────── */
function SocialProofBar() {
    const platforms = [
        { name: 'Facebook', icon: FacebookLogo },
        { name: 'Instagram', icon: InstagramLogo },
        { name: 'TikTok', icon: Play },
        { name: 'LinkedIn', icon: LinkedinLogo },
        { name: 'X (Twitter)', icon: ChatCircleDots },
        { name: 'Threads', icon: ThreadsLogo },
    ];

    // Duplicate for seamless infinite scroll
    const doubled = [...platforms, ...platforms];

    return (
        <Section className="py-10 border-y bg-surface/50">
            <motion.p className="text-center text-sm text-muted-foreground mb-6" variants={fadeUp}>
                Hỗ trợ đăng bài và phân tích trên tất cả nền tảng
            </motion.p>
            {/* Marquee container */}
            <div className="relative overflow-hidden">
                {/* Fade edges */}
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 md:w-32 bg-gradient-to-r from-surface/50 to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 md:w-32 bg-gradient-to-l from-surface/50 to-transparent" />
                {/* Scrolling track */}
                <motion.div
                    className="flex w-max gap-8 md:gap-14 py-2"
                    animate={{ x: ['0%', '-50%'] }}
                    transition={{ x: { duration: 20, repeat: Infinity, ease: 'linear' } }}
                >
                    {doubled.map(({ name, icon: Icon }, i) => (
                        <div key={`${name}-${i}`} className="flex items-center gap-2.5 text-muted-foreground shrink-0 select-none">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl border bg-card shadow-sm">
                                <Icon size={18} weight="duotone" />
                            </div>
                            <span className="text-sm font-semibold whitespace-nowrap">{name}</span>
                        </div>
                    ))}
                </motion.div>
            </div>
        </Section>
    );
}

/* ─────────────────────── Stats Section ─────────────────────── */
function StatsSection() {
    const stats = [
        { value: '10000', suffix: '+', label: 'Bài đã lên lịch', icon: CalendarBlank },
        { value: '2500', suffix: '+', label: 'Người dùng', icon: Users },
        { value: '14', suffix: 'h', label: 'Tiết kiệm/tuần', icon: Timer },
        { value: '99', suffix: '%', label: 'Uptime', icon: ShieldCheck },
    ];

    return (
        <Section className="py-16 md:py-20">
            <div className="mx-auto max-w-[1100px] px-5">
                <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                    {stats.map(({ value, suffix, label, icon: Icon }, i) => (
                        <motion.div key={label} className="text-center" variants={scaleIn} custom={i}>
                            <motion.div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10"
                                whileHover={{ scale: 1.15, rotate: 10 }}
                            >
                                <Icon size={24} weight="duotone" className="text-brand-ink" />
                            </motion.div>
                            <div className="metric text-2xl md:text-3xl">
                                <AnimatedCounter value={value} suffix={suffix} />
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{label}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </Section>
    );
}

/* ─────────────────────── Process Section ─────────────────────── */
function ProcessSection() {
    const steps = [
        { icon: Globe, title: 'Kết nối tài khoản', text: 'Thêm Facebook, TikTok, LinkedIn, X trong vài phút.', decos: [FacebookLogo, InstagramLogo, LinkedinLogo] },
        { icon: MagicWand, title: 'Soạn & lên lịch', text: 'Viết bài hoặc nhờ AI Agent, chọn giờ đăng tối ưu.', decos: [PencilSimple, Sparkle, CalendarBlank] },
        { icon: Trophy, title: 'Theo dõi kết quả', text: 'Xem số liệu và tối ưu chiến lược nội dung.', decos: [ChartLineUp, TrendUp, Eye] },
    ];

    return (
        <Section id="quy-trinh" className="py-20 md:py-32 bg-surface/50 scroll-mt-16">
            <div className="mx-auto max-w-[1000px] px-5">
                <div className="text-center space-y-3 mb-16 md:mb-20">
                    <motion.div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand-ink" variants={fadeUp}>
                        <Lightning size={14} weight="fill" /> Quy trình
                    </motion.div>
                    <motion.h2 className="font-heading text-2xl md:text-4xl font-medium" variants={fadeUp} custom={1}>
                        3 bước đơn giản để bắt đầu
                    </motion.h2>
                    <motion.p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto" variants={fadeUp} custom={2}>
                        Từ kết nối tài khoản đến phân tích kết quả — mọi thứ chỉ trong vài phút.
                    </motion.p>
                </div>

                {/* Timeline */}
                <div className="relative">
                    {/* Desktop horizontal track */}
                    <div className="hidden md:block absolute top-[48px] left-[16.67%] right-[16.67%] h-[3px] rounded-full bg-brand/10" aria-hidden="true">
                        <motion.div className="absolute inset-y-0 left-0 right-0 bg-brand/40 rounded-full origin-left"
                            initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }}
                            transition={{ duration: 2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }} />
                        {/* Traveling glow dot */}
                        <motion.div className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-brand shadow-lg shadow-brand/50"
                            animate={{ left: ['0%', '100%'] }}
                            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', repeatType: 'reverse' }} />
                    </div>

                    {/* Mobile vertical track */}
                    <div className="md:hidden absolute left-[36px] top-0 bottom-0 w-[3px] rounded-full bg-brand/10" aria-hidden="true">
                        <motion.div className="absolute inset-x-0 top-0 bottom-0 bg-brand/40 rounded-full origin-top"
                            initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }}
                            transition={{ duration: 2, delay: 0.3 }} />
                    </div>

                    <div className="grid md:grid-cols-3 gap-14 md:gap-8">
                        {steps.map((s, i) => (
                            <motion.div key={i}
                                className="relative flex md:flex-col items-start md:items-center gap-6 md:gap-0 md:text-center"
                                variants={fadeUp} custom={i}>

                                {/* Node */}
                                <div className="relative z-10 shrink-0">
                                    {/* Outer pulse ring */}
                                    <motion.div className="absolute -inset-3 rounded-full bg-brand/10"
                                        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
                                        transition={{ duration: 3, repeat: Infinity, delay: i * 0.8 }} />
                                    {/* Main circle */}
                                    <motion.div className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full bg-brand shadow-xl shadow-brand/25"
                                        whileHover={{ scale: 1.1 }} transition={{ type: 'spring', stiffness: 300 }}>
                                        {(() => { const SIcon = s.icon; return <SIcon size={30} weight="fill" className="text-brand-ink" />; })()}
                                        {/* Number */}
                                        <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background ring-2 ring-surface">
                                            {i + 1}
                                        </span>
                                    </motion.div>

                                    {/* Floating deco icons */}
                                    {s.decos.map((DecoIcon, di) => {
                                        const angle = (di * 120) - 30;
                                        const rad = (angle * Math.PI) / 180;
                                        const r = 52;
                                        return (
                                            <motion.div key={di}
                                                className="absolute flex h-6 w-6 items-center justify-center rounded-lg bg-card border border-border/50 shadow-sm"
                                                style={{ left: `calc(50% + ${Math.cos(rad) * r}px - 12px)`, top: `calc(50% + ${Math.sin(rad) * r}px - 12px)` }}
                                                initial={{ opacity: 0, scale: 0 }}
                                                whileInView={{ opacity: 1, scale: 1 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: 1 + i * 0.3 + di * 0.12, type: 'spring', stiffness: 300 }}
                                                animate={{ y: [0, -4, 0] }}
                                            >
                                                <DecoIcon size={11} weight="bold" className="text-brand-ink" />
                                            </motion.div>
                                        );
                                    })}
                                </div>

                                {/* Text */}
                                <div className="md:mt-10 min-w-0">
                                    <h3 className="font-heading text-base md:text-lg font-semibold">{s.title}</h3>
                                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-[240px] md:mx-auto">{s.text}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </Section>
    );
}

/* ─────────────────────── Why Choose Us Section (replaces Testimonials) ─────────────────────── */
function WhyUsSection() {
    const reasons = [
        { icon: Lightning, title: 'Tốc độ vượt trội', text: 'Đăng bài lên tất cả nền tảng chỉ trong 1 click. Không cần mở từng app.' },
        { icon: Sparkle, title: 'AI viết caption', text: 'AI Agent hiểu thương hiệu của bạn, viết nội dung đúng tone, đúng nền tảng.' },
        { icon: ShieldCheck, title: 'Bảo mật cao', text: 'Phiên bản Desktop chạy hoàn toàn offline. Dữ liệu luôn ở máy bạn.' },
        { icon: Globe, title: 'Đa nền tảng', text: 'Hỗ trợ Facebook, Instagram, TikTok, LinkedIn, Threads, X — và thêm nữa.' },
        { icon: ChartLineUp, title: 'Phân tích thông minh', text: 'Dashboard KPI theo thời gian thực. Biết ngay bài nào hiệu quả nhất.' },
        { icon: Timer, title: 'Tiết kiệm 14h/tuần', text: 'Tự động lên lịch, tự động đăng, tự động phân tích — bạn chỉ cần duyệt.' },
    ];

    return (
        <Section className="py-20 md:py-28" id="tai-sao">
            <div className="mx-auto max-w-[1100px] px-5">
                <div className="text-center space-y-3 mb-14">
                    <motion.div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand-ink" variants={fadeUp}>
                        <Star size={14} weight="fill" /> Tại sao chọn SocialChoice
                    </motion.div>
                    <motion.h2 className="font-heading text-2xl md:text-4xl font-medium" variants={fadeUp} custom={1}>
                        Mọi thứ bạn cần, trong một nền tảng
                    </motion.h2>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {reasons.map((r, i) => (
                        <motion.div
                            key={i}
                            className="group rounded-2xl border bg-card p-6 space-y-3 transition-shadow hover:shadow-lg"
                            variants={fadeUp}
                            custom={i}
                            whileHover={{ y: -4 }}
                        >
                            <motion.div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand-ink"
                                whileHover={{ scale: 1.1, rotate: 5 }}>
                                {(() => { const RIcon = r.icon; return <RIcon size={22} weight="duotone" />; })()}
                            </motion.div>
                            <h3 className="font-heading text-[15px] font-semibold">{r.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">{r.text}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </Section>
    );
}

/* ─────────────────────── Pricing Section ─────────────────────── */
function PricingSection() {
    const [tab, setTab] = useState('cloud');
    const [billing, setBilling] = useState('yearly');

    const cloudPlans = [
        {
            name: 'Free',
            badge: 'Đủ 100% tính năng',
            price: { monthly: '0₫', yearly: '0₫' },
            desc: 'Trải nghiệm trọn vẹn mọi tính năng với hạn mức dùng thử.',
            features: [
                '1 Thương hiệu · 2 Tài khoản MXH',
                '5 bài đăng & hẹn giờ / tháng',
                '10 MB đệm Ảnh/Video',
                '1 Bài lặp lại · 3 Shortlinks',
                'Trợ lý AI: 3 lượt / tháng (BYOK)',
            ],
            cta: 'Bắt đầu miễn phí',
            popular: false,
        },
        {
            name: 'Starter',
            price: { monthly: '99.000₫', yearly: '790.000₫' },
            priceNote: { monthly: '/tháng', yearly: '/năm' },
            desc: 'Cho cá nhân, freelancer và chủ shop.',
            features: [
                '1 Thương hiệu · 5 Tài khoản MXH',
                '100 bài đăng & hẹn giờ 24/7 / tháng',
                '50 MB đệm Ảnh/Video',
                '3 Bài lặp lại · 25 Shortlinks',
                '15 Mẫu bài viết · Nhập Excel 30 dòng',
                'AI Agent không giới hạn (BYOK)',
                'Analytics 30 ngày',
            ],
            cta: 'Chọn gói Starter',
            popular: false,
        },
        {
            name: 'Professional',
            badge: 'Phổ biến nhất',
            price: { monthly: '199.000₫', yearly: '1.590.000₫' },
            priceNote: { monthly: '/tháng', yearly: '/năm' },
            desc: 'Cho marketer, nhà sáng tạo đa kênh và nhóm tăng trưởng.',
            features: [
                '5 Thương hiệu · 20 Tài khoản MXH',
                '3 Thành viên + Phân quyền Owner/Editor',
                'Không giới hạn bài đăng & Pillars',
                '150 MB đệm · Nhập Excel 200 dòng',
                '25 Bài lặp lại · 250 Shortlinks',
                'Mẫu không giới hạn · Interactive Images',
                'Full AI Autopilot · Toàn bộ lịch sử',
            ],
            cta: 'Nâng cấp Professional',
            popular: true,
        },
        {
            name: 'Business / Agency',
            price: { monthly: '399.000₫', yearly: '3.290.000₫' },
            priceNote: { monthly: '/tháng', yearly: '/năm' },
            desc: 'Cho agency và đội ngũ vận hành nhiều thương hiệu.',
            features: [
                '25 Thương hiệu · 60 Tài khoản MXH',
                '10 Thành viên + Phân quyền theo Brand',
                'Luồng Phê duyệt · Nhật ký nhóm',
                '200 MB đệm + Google Drive / R2',
                '100 Bài lặp lại · 1.000 Shortlinks',
                'AI Autopilot + Đồng bộ Drive/R2',
                'Xuất báo cáo khách hàng',
            ],
            cta: 'Chọn gói Business',
            popular: false,
        },
    ];

    const desktopPlans = [
        {
            name: 'Desktop Solo',
            devices: '1 Máy tính',
            price: { once: '390.000₫' },
            updatePrice: '99.000₫/năm',
            desc: 'Mua đứt 1 lần, dữ liệu & kho ảnh/video trên ổ cứng.',
            features: [
                'Kích hoạt cố định trên 1 máy Windows',
                '3 Thương hiệu · 10 Tài khoản MXH',
                'Kho Media & Bài nháp KHÔNG GIỚI HẠN',
                'Kéo thả ảnh/video 4K tức thì',
                'Bảo mật Token bằng Windows DPAPI',
                'Sở hữu vĩnh viễn + 12 tháng cập nhật',
            ],
            cta: 'Mua Desktop Solo',
            popular: false,
        },
        {
            name: 'Desktop Pro',
            badge: 'Bán chạy nhất',
            devices: '2 Máy tính (PC + Laptop)',
            price: { once: '590.000₫' },
            updatePrice: '149.000₫/năm',
            desc: 'Dành cho người dùng cả máy bàn lẫn laptop.',
            features: [
                'Kích hoạt trên 2 máy Windows',
                'KHÔNG GIỚI HẠN Brands & Tài khoản',
                'Full Media, Excel, Shortlinks, Templates',
                'Full AI Autopilot & chiến lược AI (BYOK)',
                'Xuất/Nhập Workspace Backup (.zip)',
                'Sở hữu vĩnh viễn + 12 tháng cập nhật',
            ],
            cta: 'Mua Desktop Pro',
            popular: true,
        },
        {
            name: 'Desktop Agency',
            devices: '5 Máy tính cho đội nhóm',
            price: { once: '1.190.000₫' },
            updatePrice: '299.000₫/năm',
            desc: 'Trang bị cho cả đội ngũ 5 máy, mua 1 lần.',
            features: [
                'Bản quyền thương mại cho 5 máy Windows',
                '100% tính năng & ổ cứng không giới hạn',
                'Chia sẻ dự án qua file Backup (.zip)',
                'Dữ liệu 100% nội bộ (đạt chuẩn NDA)',
                'Full AI Autopilot trên cả 5 máy',
                'Sở hữu vĩnh viễn + 12 tháng cập nhật',
            ],
            cta: 'Mua gói 5 Máy Agency',
            popular: false,
        },
    ];

    const activePlans = tab === 'cloud' ? cloudPlans : desktopPlans;

    return (
        <Section id="bang-gia" className="py-20 md:py-28 scroll-mt-16">
            <div className="mx-auto max-w-[1200px] px-5">
                {/* Header */}
                <div className="text-center space-y-3 mb-10">
                    <motion.div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand-ink" variants={fadeUp}>
                        <Lightning size={14} weight="fill" /> Bảng giá
                    </motion.div>
                    <motion.h2 className="font-heading text-2xl md:text-4xl font-medium" variants={fadeUp} custom={1}>
                        Chọn gói phù hợp với bạn
                    </motion.h2>
                    <motion.p className="text-muted-foreground text-sm md:text-base max-w-lg mx-auto" variants={fadeUp} custom={2}>
                        Bắt đầu miễn phí, nâng cấp khi sẵn sàng. Không cần thẻ tín dụng.
                    </motion.p>
                </div>

                {/* Tab Cloud / Desktop */}
                <motion.div className="flex justify-center mb-8" variants={fadeUp} custom={3}>
                    <div className="inline-flex rounded-xl border bg-surface p-1 gap-1">
                        {[{ key: 'cloud', label: '☁️ Cloud (SaaS)' }, { key: 'desktop', label: '🖥 Desktop (mua đứt)' }].map(t => (
                            <button key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`relative rounded-lg px-5 py-2 text-sm font-semibold transition-all ${tab === t.key ? 'text-brand-ink' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                {tab === t.key && (
                                    <motion.div layoutId="pricing-tab" className="absolute inset-0 rounded-lg bg-brand shadow-sm" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                                )}
                                <span className="relative z-10">{t.label}</span>
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Billing toggle — only for cloud */}
                <AnimatePresence mode="wait">
                    {tab === 'cloud' && (
                        <motion.div className="flex justify-center mb-10"
                            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                            <div className="inline-flex items-center gap-3 rounded-full border bg-card px-4 py-2">
                                <span className={`text-sm font-medium ${billing === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>Tháng</span>
                                <button onClick={() => setBilling(b => b === 'monthly' ? 'yearly' : 'monthly')}
                                    className="relative h-6 w-11 rounded-full bg-muted transition-colors" aria-label="Switch billing">
                                    <motion.div className="absolute top-0.5 h-5 w-5 rounded-full bg-brand shadow-sm"
                                        animate={{ left: billing === 'yearly' ? 22 : 2 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                                </button>
                                <span className={`text-sm font-medium ${billing === 'yearly' ? 'text-foreground' : 'text-muted-foreground'}`}>Năm</span>
                                {billing === 'yearly' && (
                                    <motion.span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold text-brand-ink"
                                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500 }}>
                                        Tiết kiệm ~33%
                                    </motion.span>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Plan cards */}
                <AnimatePresence mode="wait">
                    <motion.div key={tab}
                        className={`grid gap-5 items-stretch ${tab === 'cloud' ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.35 }}
                    >
                        {activePlans.map((plan, i) => (
                            <motion.div
                                key={plan.name}
                                className={`relative flex flex-col rounded-2xl border p-5 md:p-6 transition-shadow ${plan.popular
                                    ? 'border-transparent bg-foreground text-background shadow-2xl shadow-foreground/20 ring-1 ring-foreground/10 md:-my-3 md:py-9'
                                    : 'bg-card hover:shadow-lg'
                                    }`}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.08, type: 'spring', stiffness: 200 }}
                                whileHover={{ y: -4 }}
                            >
                                {/* Popular/badge */}
                                {(plan.popular || plan.badge) && (
                                    <motion.div
                                        className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[11px] font-bold shadow-md ${plan.popular ? 'bg-brand text-brand-ink' : 'bg-brand text-brand-ink'}`}
                                        animate={{ y: [0, -3, 0] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    >
                                        {plan.badge || 'Phổ biến nhất'}
                                    </motion.div>
                                )}

                                {/* Name & desc */}
                                <div className="space-y-1 mb-4 mt-1">
                                    <h3 className="font-heading text-base font-semibold">{plan.name}</h3>
                                    {plan.devices && <p className={`text-[11px] font-medium ${plan.popular ? 'text-brand' : 'text-brand-ink'}`}>{plan.devices}</p>}
                                    <p className={`text-[13px] leading-relaxed ${plan.popular ? 'text-background/60' : 'text-muted-foreground'}`}>{plan.desc}</p>
                                </div>

                                {/* Price */}
                                <div className="mb-5">
                                    {tab === 'cloud' ? (
                                        <div className="flex items-baseline gap-1">
                                            <motion.span key={billing} className="font-heading text-2xl md:text-3xl font-bold"
                                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                                                {plan.price[billing]}
                                            </motion.span>
                                            {plan.priceNote && <span className={`text-sm ${plan.popular ? 'text-background/50' : 'text-muted-foreground'}`}>{plan.priceNote[billing]}</span>}
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="font-heading text-2xl md:text-3xl font-bold">{plan.price.once}</span>
                                                <span className={`text-sm ${plan.popular ? 'text-background/50' : 'text-muted-foreground'}`}>mua đứt</span>
                                            </div>
                                            <p className={`text-[11px] mt-0.5 ${plan.popular ? 'text-background/50' : 'text-muted-foreground'}`}>Update Pass: {plan.updatePrice}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Features */}
                                <div className="flex-1 space-y-2 mb-6">
                                    {plan.features.map((f, fi) => (
                                        <motion.div key={fi} className={`flex items-start gap-2 text-[13px] ${plan.popular ? 'text-background/80' : ''}`}
                                            initial={{ opacity: 0, x: -8 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: 0.2 + fi * 0.04 }}>
                                            <Check size={14} weight="bold" className={`mt-0.5 shrink-0 ${plan.popular ? 'text-brand' : 'text-brand-ink'}`} />
                                            <span>{f}</span>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* CTA */}
                                <Link
                                    to="/create"
                                    className={`block text-center rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${plan.popular
                                        ? 'bg-brand text-brand-ink shadow-md hover:shadow-lg hover:shadow-brand/30'
                                        : 'border bg-surface hover:bg-muted'
                                        }`}
                                >
                                    {plan.cta}
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>
                </AnimatePresence>

                {/* Bottom note */}
                <motion.p className="text-center text-xs text-muted-foreground mt-8" variants={fadeUp} custom={4}>
                    Gói Starter miễn phí · Không cần thẻ · Hủy bất cứ lúc nào
                </motion.p>
            </div>
        </Section>
    );
}

/* ─────────────────────── CTA Section ─────────────────────── */
function CTASection() {
    return (
        <Section className="py-16 md:py-24">
            <div className="mx-auto max-w-[1100px] px-5">
                <motion.div className="relative overflow-hidden rounded-3xl bg-foreground p-10 md:p-16 text-center" variants={scaleIn}>
                    <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-brand/20 blur-2xl" aria-hidden="true" />
                    <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-brand/15 blur-2xl" aria-hidden="true" />

                    <motion.h2 className="relative font-heading text-2xl md:text-4xl font-medium text-background leading-tight" variants={fadeUp}>
                        Sẵn sàng quản lý nội dung hiệu quả hơn?
                    </motion.h2>
                    <motion.p className="relative mt-4 text-sm md:text-base text-background/70 max-w-md mx-auto" variants={fadeUp} custom={1}>
                        Dùng thử miễn phí ngay hôm nay. Không cần thẻ tín dụng.
                    </motion.p>
                    <motion.div className="relative mt-8 flex flex-wrap items-center justify-center gap-3" variants={fadeUp} custom={2}>
                        <Link to="/create" className="btn-skew">
                            <RocketLaunch size={16} weight="duotone" /> Bắt đầu miễn phí
                        </Link>
                        <Link to="/pricing" className="inline-flex items-center gap-2 rounded-xl border border-background/20 px-5 py-2.5 text-sm font-medium text-background hover:bg-background/10 transition-colors">
                            Xem bảng giá <ArrowRight size={14} />
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
        </Section>
    );
}

/* ─────────────────────── Navbar ─────────────────────── */
function Navbar() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <motion.header
            className={`fixed top-0 z-50 w-full transition-all duration-300 ${scrolled ? 'border-b bg-card/95 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}
            initial={{ y: -60 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-5">
                <Link to="/landing-3" className="font-heading text-base font-medium">SocialChoice</Link>
                <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex" aria-label="Điều hướng chính">
                    <a href="#tinh-nang" className="transition-colors hover:text-foreground">Tính năng</a>
                    <a href="#quy-trinh" className="transition-colors hover:text-foreground">Quy trình</a>
                    <a href="#tai-sao" className="transition-colors hover:text-foreground">Tại sao chọn</a>
                    <a href="#bang-gia" className="transition-colors hover:text-foreground">Bảng giá</a>
                </nav>
                <div className="flex items-center gap-3">
                    <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Đăng nhập</Link>
                    <Link to="/create" className="btn-skew">Dùng thử <ArrowRight size={14} weight="bold" /></Link>
                </div>
            </div>
        </motion.header>
    );
}

/* ─────────────────────── Hero Section ─────────────────────── */
function HeroSection() {
    return (
        <Section className="relative overflow-hidden pt-24 pb-10 md:pt-32 md:pb-16">
            <FloatingParticles />
            <div className="mx-auto max-w-[1100px] px-5 space-y-10">
                <div className="text-center space-y-5">
                    <motion.div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-xs font-medium" variants={fadeUp}>
                        <Lightning size={14} weight="fill" className="text-brand" />
                        Nền tảng quản lý mạng xã hội all-in-one
                    </motion.div>

                    <motion.h1 className="font-heading text-3xl md:text-5xl lg:text-[56px] font-medium leading-tight tracking-tight" variants={fadeUp} custom={1}>
                        Quản lý mạng xã hội
                        <br />
                        <span className="relative">
                            thông minh hơn
                            <motion.span
                                className="absolute -bottom-1.5 left-0 h-1 w-full rounded-full bg-brand"
                                initial={{ scaleX: 0, originX: 0 }}
                                whileInView={{ scaleX: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.8, duration: 0.6 }}
                            />
                        </span>
                        {' '}với AI
                    </motion.h1>

                    <motion.p className="mx-auto max-w-lg text-muted-foreground text-sm md:text-base leading-relaxed" variants={fadeUp} custom={2}>
                        Soạn, lên lịch, đăng tự động và phân tích nội dung trên mọi nền tảng — tất cả trong một workspace duy nhất.
                    </motion.p>

                    <motion.div className="flex flex-wrap items-center justify-center gap-3" variants={fadeUp} custom={3}>
                        <Link to="/create" className="btn-skew">
                            <RocketLaunch size={16} weight="duotone" /> Bắt đầu miễn phí
                        </Link>
                        <Link to="/overview" className="inline-flex items-center gap-2 rounded-xl border bg-card px-5 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                            <Play size={16} weight="fill" className="text-brand-ink" /> Xem demo
                        </Link>
                    </motion.div>
                </div>

                {/* Dashboard mockup — accurate Overview page */}
                <OverviewMockup />
            </div>
        </Section>
    );
}

/* ─────────────────────── Footer ─────────────────────── */
function Footer() {
    return (
        <footer className="border-t bg-surface">
            <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-5 py-5 text-xs text-muted-foreground">
                <span>© {new Date().getFullYear()} SocialChoice</span>
                <div className="flex gap-4">
                    <Link to="/terms" className="hover:underline">Điều khoản</Link>
                    <Link to="/privacy" className="hover:underline">Quyền riêng tư</Link>
                    <Link to="/cookies" className="hover:underline">Cookie</Link>
                    <Link to="/docs" className="hover:underline">Tài liệu</Link>
                </div>
            </div>
        </footer>
    );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════ */
export default function LandingPage3() {
    useEffect(() => {
        const handler = (e) => {
            const target = e.target.closest('a[href^="#"]');
            if (!target) return;
            const id = target.getAttribute('href')?.slice(1);
            const el = id && document.getElementById(id);
            if (el) {
                e.preventDefault();
                el.scrollIntoView({ behavior: 'smooth' });
            }
        };
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, []);

    return (
        <div className="min-h-screen bg-background font-body text-foreground">
            <Navbar />
            <HeroSection />
            <SocialProofBar />

            {/* Feature 1: Calendar — accurate MonthView mockup */}
            <FeatureRow
                id="tinh-nang"
                title="Lịch nội dung kéo thả trực quan"
                text="Xem toàn bộ kế hoạch đăng bài trong một cái nhìn. Kéo thả để sắp xếp lịch, chọn theo ngày hoặc tuần."
                icon={CalendarBlank}
                tagline="Lịch nội dung"
                features={[
                    'Xem theo tháng, tuần, kênh hoặc danh sách',
                    'Kéo thả bài viết để dời lịch đăng',
                    'Lọc theo kênh, trụ cột nội dung và góc bài',
                    'Nút tạo bài nhanh trên từng ngày',
                ]}
                mockup={<CalendarMockupReal />}
            />

            {/* Feature 2: AI Agent — accurate ChatAgent mockup */}
            <FeatureRow
                title="AI Agent viết nội dung & lên lịch"
                text="Chỉ cần mô tả ý tưởng, AI sẽ viết caption theo đúng giọng thương hiệu, tự chọn nền tảng và lên lịch đăng."
                icon={Sparkle}
                tagline="AI Agent"
                features={[
                    'Viết caption cho Facebook, Instagram, TikTok, LinkedIn, Threads',
                    'Tự chọn thương hiệu, nền tảng và khung giờ đăng',
                    'Hỗ trợ chiến dịch tự động với Google Drive',
                    'Xác nhận & lên lịch chỉ bằng 1 nút',
                ]}
                mockup={<AIChatMockupReal />}
                reversed
            />

            {/* Feature 3: Schedule & Channels — accurate Overview widgets */}
            <FeatureRow
                title="Theo dõi lịch phát sóng & kênh kết nối"
                text="Quản lý toàn bộ lịch bài sắp tới và trạng thái kênh xuất bản trong cùng một dashboard tổng hợp."
                icon={CalendarDots}
                tagline="Lịch & Kênh"
                features={[
                    'Mini calendar tuần với chỉ báo bài đăng',
                    'Trạng thái kết nối realtime cho từng kênh',
                    'Nút AI lên lịch nhanh tích hợp',
                    'Badge trạng thái: Hoạt động, Mô phỏng, Cần xác thực',
                ]}
                mockup={<ScheduleAndChannelsMockup />}
            />

            {/* Feature 4: Analytics — accurate chart mockup */}
            <FeatureRow
                title="Phân tích hiệu quả đa kênh"
                text="Theo dõi lượt tiếp cận, tương tác và bài nổi bật trên từng kênh trong cùng một dashboard."
                icon={ChartLineUp}
                tagline="Analytics"
                features={[
                    'Dashboard tổng hợp đa kênh với KPI rõ ràng',
                    'Biểu đồ trend lượt tiếp cận theo thời gian',
                    'Phân bổ nội dung theo kênh và trụ cột',
                    'Xuất báo cáo dạng PDF',
                ]}
                mockup={<AnalyticsMockupReal />}
                reversed
            />

            <StatsSection />
            <ProcessSection />
            <WhyUsSection />
            <PricingSection />
            <CTASection />
            <Footer />
        </div>
    );
}
