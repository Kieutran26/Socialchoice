import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    Sparkle,
    CheckCircle,
    MagnifyingGlass,
    PencilSimple,
    ArrowsClockwise,
    Trash,
    Rows,
    SquaresFour,
    FacebookLogo,
    InstagramLogo,
    LinkedinLogo,
    TiktokLogo,
    At,
    Check,
} from '@phosphor-icons/react';

// Dữ liệu minh họa theo màn hình Content Strategist của trang gốc
const STEPS = [
    { n: 1, title: 'Tri thức thương hiệu', note: 'Tone: Tự tin, Chuyên nghiệp · 45 assets', done: true },
    { n: 2, title: 'Ma trận trụ cột nội dung', note: '5 Trụ cột · 30 Góc khai thác', done: true },
    { n: 3, title: 'Cấu hình xuất bản & Lập lịch 30 ngày', note: '1 bài/ngày · 2 kênh mục tiêu', done: false },
];

const PILLARS = [
    { name: 'Product Education', pct: 37, count: 11, shade: 'bg-brand-ink' },
    { name: 'Brand Awareness', pct: 27, count: 8, shade: 'bg-brand-dark' },
    { name: 'Customer Stories', pct: 20, count: 6, shade: 'bg-brand' },
    { name: 'Community Engagement', pct: 13, count: 4, shade: 'bg-brand-hover' },
    { name: 'Promotional Content', pct: 3, count: 1, shade: 'bg-muted' },
];

const CHANNELS = [
    { id: 'facebook', label: 'Facebook', icon: FacebookLogo },
    { id: 'instagram', label: 'Instagram', icon: InstagramLogo },
    { id: 'linkedin', label: 'LinkedIn', icon: LinkedinLogo },
    { id: 'tiktok', label: 'TikTok', icon: TiktokLogo },
    { id: 'threads', label: 'Threads', icon: At },
];

const POSTS = [
    { day: 1, time: '09:00', date: '2026-11-15', channel: 'Facebook', pillar: 'Product Education', angle: 'How-to', title: 'Bí quyết tận dụng tối đa cà phê: 3 bước chuẩn xác', asset: 'aster-roastery.jpg', reason: 'Góc khai thác "How-to" kết hợp ảnh aster-roastery.' },
    { day: 2, time: '11:30', date: '2026-11-16', channel: 'Instagram', pillar: 'Brand Awareness', angle: 'Milestones', title: 'Câu chuyện đằng sau triết lý thương hiệu của Test', asset: 'aster-beans.jpg', reason: 'Góc "Giá trị cốt lõi" kết hợp ảnh aster-beans.' },
    { day: 3, time: '09:00', date: '2026-11-17', channel: 'Facebook', pillar: 'Customer Stories', angle: 'Social proof', title: 'Ưu đãi giới hạn: Trọn bộ combo trải nghiệm dành riêng cho tuần này', asset: 'aster-combo.jpg', reason: 'Góc "Ưu đãi có hạn" tạo chuyển đổi cuối tuần.' },
    { day: 4, time: '19:00', date: '2026-11-18', channel: 'Instagram', pillar: 'Community Engagement', angle: 'Q&A', title: 'Bạn thích pha cà phê kiểu nào? Chia sẻ cùng cộng đồng', asset: 'aster-cup.jpg', reason: 'Câu hỏi mở thúc đẩy bình luận và lưu bài.' },
];

const PERIODS = ['7d', '14d', '30d'];

export default function ContentStrategy2() {
    const [period, setPeriod] = useState('30d');
    const [channels, setChannels] = useState(['facebook', 'instagram']);
    const [view, setView] = useState('cards');
    const [query, setQuery] = useState('');

    const toggleChannel = id => setChannels(cur => (cur.includes(id) ? cur.filter(c => c !== id) : [...cur, id]));
    const posts = POSTS.filter(p => `${p.title} ${p.pillar} ${p.angle}`.toLowerCase().includes(query.toLowerCase()));

    return (
        <div className="min-h-screen bg-background font-body text-foreground">
            <header className="border-b border-brand-dark bg-brand text-brand-ink">
                <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-4 px-5">
                    <Link to="/strategy" className="inline-flex items-center gap-2 text-sm hover:underline">
                        <ArrowLeft size={16} /> Trang gốc
                    </Link>
                    <span className="font-heading text-base">Socialchoice · Chiến lược nội dung</span>
                    <span className="ml-auto rounded-lg bg-card px-3 py-1.5 text-xs text-foreground">Thương hiệu: <b>Test</b> · 45 assets sẵn sàng</span>
                </div>
            </header>

            <div className="mx-auto grid max-w-[1500px] gap-5 p-5 lg:grid-cols-[320px_1fr] lg:p-8">
                {/* Cột trái: quy trình + cấu hình */}
                <aside className="space-y-5 lg:sticky lg:top-5 lg:self-start">
                    <section className="rounded-2xl border border-brand-dark bg-brand p-5 text-brand-ink">
                        <h1 className="text-xl">AI Content Strategist</h1>
                        <p className="mt-1 text-sm text-brand-ink/80">Tự động đề xuất trụ cột, góc khai thác, chủ đề và lịch 30 ngày từ Brand Context & Asset Library.</p>
                        <ol className="mt-5 space-y-3">
                            {STEPS.map(s => (
                                <li key={s.n} className={`flex gap-3 rounded-xl p-3 ${s.done ? 'bg-brand-hover/60' : 'bg-card text-foreground'}`}>
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-brand-ink/40 text-xs font-medium">
                                        {s.done ? <Check size={14} weight="bold" /> : s.n}
                                    </span>
                                    <div className="min-w-0">
                                        <div className="label-xs">Bước {s.n}{!s.done && ' · đang chọn'}</div>
                                        <div className="text-sm font-medium">{s.title}</div>
                                        <div className="label-xs break-words">{s.note}</div>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </section>

                    <section className="panel space-y-4 p-5">
                        <div>
                            <div className="label-xs mb-1.5">Kỳ hạn</div>
                            <div className="flex gap-1" role="group" aria-label="Kỳ hạn">
                                {PERIODS.map(p => (
                                    <button key={p} type="button" aria-pressed={period === p} onClick={() => setPeriod(p)}
                                        className={`flex-1 rounded-lg border px-3 py-2 text-sm ${period === p ? 'border-brand-dark bg-brand font-medium text-brand-ink' : 'hover:bg-muted'}`}>
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label htmlFor="freq" className="label-xs mb-1.5 block">Tần suất</label>
                            <select id="freq" className="w-full rounded-lg border bg-card px-3 py-2 text-sm" defaultValue="1">
                                <option value="1">1 bài / ngày (Chuẩn 30 bài)</option>
                                <option value="2">2 bài / ngày</option>
                                <option value="0.5">Cách ngày</option>
                            </select>
                        </div>
                        <div>
                            <div className="label-xs mb-1.5">Kênh</div>
                            <div className="flex flex-wrap gap-2">
                                {CHANNELS.map(({ id, label, icon: Icon }) => {
                                    const on = channels.includes(id);
                                    return (
                                        <button key={id} type="button" aria-pressed={on} onClick={() => toggleChannel(id)}
                                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${on ? 'border-brand-dark bg-brand/20 font-medium text-brand-ink' : 'text-muted-foreground hover:bg-muted'}`}>
                                            <Icon size={14} weight="duotone" /> {label}
                                            {on && <Check size={12} weight="bold" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <button type="button" className="btn-skew w-full justify-center">
                            <Sparkle size={16} weight="duotone" /> Tạo lại kế hoạch {period === '30d' ? '30' : period.replace('d', '')} ngày
                        </button>
                    </section>
                </aside>

                {/* Cột phải: phân bổ + kế hoạch */}
                <main className="min-w-0 space-y-5">
                    <section className="panel p-5" aria-labelledby="dist-title">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h2 id="dist-title" className="text-[15px]">Phân bổ 100% tỷ trọng cho 30 bài viết nháp</h2>
                            <span className="label-xs">5 Trụ cột · 30 Góc khai thác</span>
                        </div>
                        <div className="mt-4 flex h-4 overflow-hidden rounded-full border border-brand-dark" role="img"
                            aria-label={PILLARS.map(p => `${p.name} ${p.pct}%`).join(', ')}>
                            {PILLARS.map(p => <div key={p.name} className={p.shade} style={{ width: `${p.pct}%` }} />)}
                        </div>
                        <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                            {PILLARS.map(p => (
                                <li key={p.name} className="flex items-center gap-2 text-xs">
                                    <span className={`h-3 w-3 shrink-0 rounded-sm border border-brand-dark ${p.shade}`} />
                                    <span className="min-w-0 break-words"><b>{p.pct}%</b> {p.name} ({p.count} bài)</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className="panel p-5" aria-labelledby="plan-title">
                        <div className="flex flex-wrap items-center gap-3">
                            <h2 id="plan-title" className="text-[15px]">Kế hoạch nội dung đề xuất (30 bài viết)</h2>
                            <span className="rounded-md bg-brand px-2 py-0.5 text-[11px] font-medium text-brand-ink">DRAFT PLAN</span>
                            <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
                                <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input aria-label="Tìm chủ đề, góc..." value={query} onChange={e => setQuery(e.target.value)}
                                    placeholder="Tìm chủ đề, góc..." className="w-full rounded-lg border bg-card py-2 pl-9 pr-3 text-sm" />
                            </div>
                            <div className="flex gap-1" role="group" aria-label="Kiểu hiển thị">
                                <button type="button" aria-pressed={view === 'cards'} onClick={() => setView('cards')}
                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs ${view === 'cards' ? 'border-brand-dark bg-brand font-medium text-brand-ink' : 'hover:bg-muted'}`}>
                                    <SquaresFour size={14} /> Lưới thẻ
                                </button>
                                <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}
                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs ${view === 'list' ? 'border-brand-dark bg-brand font-medium text-brand-ink' : 'hover:bg-muted'}`}>
                                    <Rows size={14} /> Danh sách
                                </button>
                            </div>
                            <button type="button" className="btn-skew"><CheckCircle size={16} weight="duotone" /> Áp dụng vào lịch</button>
                        </div>

                        {posts.length === 0 ? (
                            <p role="status" className="py-10 text-center text-sm text-muted-foreground">Không có bài nào khớp tìm kiếm.</p>
                        ) : (
                            <div className={view === 'cards' ? 'mt-5 grid gap-4 md:grid-cols-2' : 'mt-5 divide-y rounded-xl border'}>
                                {posts.map(p => (
                                    <article key={p.day} className={view === 'cards' ? 'flex flex-col rounded-xl border border-brand-dark/50 bg-brand/10 p-4' : 'flex flex-wrap items-center gap-4 p-4'}>
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-medium text-brand-ink">#{p.day}</span>
                                            <div className="label-xs"><b className="text-foreground">{p.time}</b><br />{p.date}</div>
                                            <span className="rounded-md border bg-card px-2 py-0.5 text-[11px] font-medium">{p.channel}</span>
                                        </div>
                                        <div className="min-w-0 flex-1 py-2">
                                            <h3 className="break-words text-sm font-medium">{p.title}</h3>
                                            <p className="label-xs mt-1">{p.pillar} · {p.angle}</p>
                                            <p className="label-xs mt-1 break-words">Asset: {p.asset} — {p.reason}</p>
                                        </div>
                                        <div className="flex gap-1">
                                            <button type="button" aria-label="Chỉnh sửa" className="rounded-lg p-2 hover:bg-muted"><PencilSimple size={16} /></button>
                                            <button type="button" aria-label="Tạo lại" className="rounded-lg p-2 hover:bg-muted"><ArrowsClockwise size={16} /></button>
                                            <button type="button" aria-label="Xóa" className="rounded-lg p-2 hover:bg-muted"><Trash size={16} /></button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                        <p className="label-xs mt-4">Hiển thị {posts.length}/30 bài (dữ liệu minh họa).</p>
                    </section>
                </main>
            </div>
        </div>
    );
}
