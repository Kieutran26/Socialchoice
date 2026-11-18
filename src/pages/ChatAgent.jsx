import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Sparkle,
    PaperPlaneRight,
    Image as ImageIcon,
    CalendarBlank,
    CheckCircle,
    Clock,
    ArrowSquareOut,
    X,
    Check,
    PlugsConnected,
    CaretDown,
    LinkSimple,
    ChatCircleDots,
    PencilSimple,
    Eye,
    FacebookLogo,
    LinkedinLogo,
    ThreadsLogo,
    InstagramLogo,
    HardDrives,
    Stack,
    ArrowsClockwise,
    Trash,
    FolderOpen,
    Cpu,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { aiRequest } from '@/api/ai';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from '@/lib/i18n';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PLATFORM_CONFIG } from '@/components/common/PlatformBadge';
import { toUtcIso, toZonedParts, todayInZone, addDays } from '@/lib/tz';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { getShortlinkPreference } from '@/components/settings/ShortlinkSettingsCard';
import {
    generateStrategyPlan,
    regeneratePlanItem,
    SAMPLE_ASSET_TEMPLATES,
} from '@/lib/ai-content-strategist';

// Smart natural language schedule time extractor
function parseScheduleTime(input = '', timezone = DEFAULT_TIMEZONE) {
    const text = input.toLowerCase();
    const today = todayInZone(timezone);
    let targetDate = today;
    let targetTime = '09:00';

    // Date detection
    if (text.includes('sáng mai') || text.includes('ngày mai') || text.includes('mai')) {
        targetDate = addDays(today, 1);
    } else if (text.includes('ngày mốt') || text.includes('ngày kia') || text.includes('hôm sau')) {
        targetDate = addDays(today, 2);
    } else if (text.includes('tuần sau') || text.includes('thứ hai tuần tới')) {
        targetDate = addDays(today, 7);
    } else if (text.includes('tối nay') || text.includes('hôm nay') || text.includes('chiều nay')) {
        targetDate = today;
    } else {
        // Default: If after 18:00 today, schedule for tomorrow 09:00; else today 20:00
        const nowParts = toZonedParts(new Date().toISOString(), timezone);
        const currentHour = parseInt(nowParts.time.split(':')[0], 10) || 12;
        if (currentHour >= 18) {
            targetDate = addDays(today, 1);
            targetTime = '09:00';
        } else {
            targetTime = '20:00';
        }
    }

    // Time detection: e.g. "9h", "9h30", "20:00", "15h", "14:30"
    const hourColonMinMatch = text.match(/(\d{1,2}):(\d{2})/);
    const hourHMinMatch = text.match(/(\d{1,2})h(\d{2})?/);

    if (hourColonMinMatch) {
        const hh = String(parseInt(hourColonMinMatch[1], 10)).padStart(2, '0');
        const mm = String(parseInt(hourColonMinMatch[2], 10)).padStart(2, '0');
        targetTime = `${hh}:${mm}`;
    } else if (hourHMinMatch) {
        const hh = String(parseInt(hourHMinMatch[1], 10)).padStart(2, '0');
        const mm = hourHMinMatch[2] ? String(parseInt(hourHMinMatch[2], 10)).padStart(2, '0') : '00';
        targetTime = `${hh}:${mm}`;
    } else if (text.includes('sáng')) {
        targetTime = '09:00';
    } else if (text.includes('trưa')) {
        targetTime = '11:30';
    } else if (text.includes('chiều')) {
        targetTime = '15:00';
    } else if (text.includes('tối')) {
        targetTime = '20:00';
    }

    return { date: targetDate, time: targetTime };
}

// Generate platform adaptations locally or as fallback
function generatePlatformContent(baseCaption, userPrompt) {
    const cleanPrompt = userPrompt.trim() || 'Nội dung chia sẻ từ Socialchoice';
    const hashtags = ['#Socialchoice', '#Marketing', '#SocialMedia', '#Automation', '#TechUpdate'];

    const threadsCaption = `${baseCaption}\n\n💬 Mọi người nghĩ sao về điều này? Hãy để lại ý kiến bên dưới nhé!\n\n${hashtags.slice(0, 3).join(' ')}`;
    const linkedinCaption = `🚀 ${baseCaption}\n\nKey takeaways:\n• Tối ưu hoá quy trình làm việc\n• Tiếp cận đúng đối tượng mục tiêu\n• Tiết kiệm 80% thời gian sáng tạo nội dung\n\nBạn đã áp dụng phương pháp này vào doanh nghiệp của mình chưa?\n\n${hashtags.join(' ')}`;
    const fbCaption = `✨ ${baseCaption}\n\n👉 Nhấn Theo dõi để không bỏ lỡ các cập nhật mới nhất từ chúng mình!\n\n${hashtags.slice(0, 4).join(' ')}`;
    const xCaption = `${baseCaption.slice(0, 200)}...\n\n${hashtags.slice(0, 2).join(' ')}`;

    return {
        threads: threadsCaption,
        linkedin: linkedinCaption,
        facebook: fbCaption,
        instagram: fbCaption,
        x: xCaption,
    };
}

// Parse Google Drive folder or file ID from a URL
function extractDriveInfo(url = '') {
    const trimmed = url.trim();
    if (!trimmed) return null;
    const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) return { kind: 'folder', id: folderMatch[1], url: trimmed };
    const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (fileMatch) return { kind: 'file', id: fileMatch[1], url: trimmed };
    if (/^[a-zA-Z0-9_-]{15,}$/.test(trimmed)) return { kind: 'folder', id: trimmed, url: `https://drive.google.com/drive/folders/${trimmed}` };
    return { kind: 'custom', id: 'drive-linked', url: trimmed };
}

// Detect whether a chat prompt is asking for Campaign + Drive + Auto-Remix + Schedule
function isCampaignIntent(text = '') {
    const lower = text.toLowerCase();
    return (
        lower.includes('campaign') ||
        lower.includes('chiến dịch') ||
        lower.includes('drive.google.com') ||
        lower.includes('google drive') ||
        lower.includes('xào nấu') ||
        (lower.includes('drive') && (lower.includes('lịch') || lower.includes('tự động')))
    );
}

const CLARIFICATION_PLATFORMS = ['facebook', 'instagram', 'threads', 'linkedin', 'tiktok', 'x'];

function detectPlatformsFromText(text = '') {
    const lower = text.toLowerCase();
    return CLARIFICATION_PLATFORMS.filter((p) => {
        if (p === 'x') return /\bx\b|twitter/i.test(lower);
        return lower.includes(p);
    });
}

function detectBrandFromText(text = '', brands = []) {
    const lower = text.toLowerCase();
    return brands.find((b) => b?.name && lower.includes(b.name.toLowerCase())) || null;
}

// Extract clean campaign title, Drive URL, and pure raw data from a natural language chat prompt
function parseCampaignPromptText(userText = '', fallbackName = 'Chiến dịch Marketing', fallbackDriveUrl = '') {
    let text = userText.trim();

    // 1. Extract Google Drive URL if present
    const urlMatch = text.match(/https?:\/\/drive\.google\.com\/[^\s,;"']+/i);
    const driveUrl = urlMatch ? urlMatch[0] : fallbackDriveUrl;

    // 2. Extract campaign name inside quotes if present: e.g. Tạo campaign "Tên chiến dịch"
    const quotedNameMatch =
        text.match(/(?:campaign|chiến dịch)\s+["“”'‘’]([^"“”'‘’]{3,80})["“”'‘’]/i) ||
        text.match(/["“”]([^"“”]{3,80})["“”]/);
    const campaignName = quotedNameMatch ? quotedNameMatch[1].trim() : fallbackName;

    // 3. Extract duration in days
    const daysMatch = text.match(/(\d+)\s*ngày/i);
    const days = daysMatch ? Math.min(30, Math.max(3, parseInt(daysMatch[1], 10))) : 7;

    // 4. Clean command boilerplate & URLs to get pure raw data facts
    let cleanRaw = text
        .replace(/https?:\/\/[^\s]+/gi, '')
        .replace(
            /^(?:bạn hãy\s+|hãy\s+)?(?:tạo|lên|chạy)\s+(?:1\s+|một\s+)?(?:campaign|chiến dịch)\s*(?:["“”'‘’][^"“”'‘’]+["“”'‘’])?\s*(?:trong\s*\d+\s*ngày|\d+\s*ngày)?[,.\s]*/i,
            ''
        )
        .replace(
            /(?:kèm\s+|với\s+|và\s+)?(?:liên kết\s+)?(?:ảnh\s+)?(?:với\s+)?(?:link\s+)?drive\s*/gi,
            ''
        )
        .replace(
            /(?:và\s+)?(?:sau đó\s+)?(?:hãy\s+)?(?:tự động\s+)?xào nấu\s*(?:đống\s+)?(?:dữ liệu\s*)?(?:sau\s*)?(?:của mình\s*)?(?:rồi\s*)?(?:lên lịch\s*tự động)?[:.,\s]*/gi,
            ''
        )
        .replace(/(?:tự động\s+)?setup\s+lịch\s+đăng\s+bài(?:\s+hàng\s+ngày|\s+tự\s+động)?[.!\s]*/gi, '')
        .trim();

    if (!cleanRaw || cleanRaw.length < 10) {
        cleanRaw = text.replace(/https?:\/\/[^\s]+/gi, '').trim();
    }

    return {
        campaignName,
        driveUrl,
        days,
        rawData: cleanRaw,
    };
}

// Parse user rawData into clean, meaningful fact statements (never splitting on dots inside URLs or numbers)
function extractCleanFacts(rawData = '', brandName = 'Thương hiệu') {
    const withoutUrls = (rawData || '')
        .replace(/https?:\/\/[^\s]+/gi, '')
        .replace(/(?:com|vn|net|org)\/drive\/folders\/[a-zA-Z0-9_-]+/gi, '')
        .trim();

    const rawSegments = withoutUrls
        .split(/\r?\n|;|•|(?:\s+-\s+)|(?:^\s*-\s*)|(?:\.\s+)/)
        .map((s) =>
            s
                .replace(/^[-•*+\d.)\s]+/, '')
                .replace(/^(?:hãy\s+)?xào nấu\s*dữ liệu\s*:?\s*/i, '')
                .replace(/^(?:tự động\s+)?setup\s+lịch.*$/i, '')
                .trim()
        )
        .filter((s) => s.length >= 10 && !/^(?:drive|http|com\/)/i.test(s));

    if (rawSegments.length === 0) {
        return [
            `Giải pháp chất lượng cao từ ${brandName} giúp tối ưu trải nghiệm mỗi ngày`,
            `Quy trình chuẩn hóa hiện đại, tiết kiệm tối đa thời gian và chi phí vận hành`,
            `Ưu đãi đặc quyền dành riêng cho khách hàng đăng ký sớm trong chiến dịch`,
            `Đồng hành và hỗ trợ tận tâm, cam kết hiệu quả thực tế vượt mong đợi`,
        ];
    }

    return rawSegments;
}

// 14 Distinct Copywriting Frameworks so every day in the campaign is unique, engaging, and impressive
const CAMPAIGN_COPY_ARCHETYPES = [
    {
        key: 'manifesto',
        label: 'Tuyên ngôn & Ra mắt Chiến dịch',
        build: ({ campaignName, brandName, fact1, fact2, fact3, promoFact }) => ({
            title: `Chính thức khởi động: ${campaignName} — Bước đột phá mới từ ${brandName}`,
            caption: [
                `🚀 CHÍNH THỨC BÙNG NỔ: ${campaignName.toUpperCase()}!`,
                ``,
                `Bạn đã sẵn sàng nâng tầm trải nghiệm và bứt phá giới hạn cùng ${brandName}? Chiến dịch lớn nhất kỳ này đã chính thức lên sóng với những giá trị khác biệt hoàn toàn:`,
                ``,
                `✨ ${fact1}`,
                `✨ ${fact2}`,
                fact3 ? `✨ ${fact3}` : null,
                ``,
                promoFact ? `🎁 Đặc quyền mở màn: ${promoFact}!` : null,
                `👉 Theo dõi ngay chuỗi bài viết từ ${brandName} và nhắn tin cho chúng mình để trở thành những người đầu tiên sở hữu ưu đãi nhé!`,
            ]
                .filter((x) => x !== null)
                .join('\n'),
        }),
    },
    {
        key: 'pas_problem',
        label: 'Góc nhìn PAS (Vấn đề & Giải pháp)',
        build: ({ campaignName, brandName, fact1, fact2 }) => ({
            title: `Tại sao bạn vẫn tốn quá nhiều công sức mà chưa đạt hiệu quả tối đa?`,
            caption: [
                `⚠️ Đừng để cách làm cũ kìm hãm tốc độ phát triển của bạn thêm một ngày nào nữa!`,
                ``,
                `Rất nhiều khách hàng tìm đến ${brandName} đều từng gặp chung một bài toán: muốn tối ưu chất lượng nhưng lại mất quá nhiều thời gian loay hoay tự xử lý.`,
                ``,
                `Đó chính là lý do trong chiến dịch "${campaignName}", chúng tôi mang đến lời giải trực diện:`,
                `🔹 Giải pháp cốt lõi: ${fact1}.`,
                `🔹 Giá trị thực tế: ${fact2}.`,
                ``,
                `💡 Thay đổi một lựa chọn nhỏ hôm nay để tạo ra bước nhảy vọt lớn vào ngày mai. Bạn đang gặp khó khăn ở khâu nào nhất? Chia sẻ bên dưới để ${brandName} tư vấn ngay!`,
            ].join('\n'),
        }),
    },
    {
        key: 'usp_deepdive',
        label: 'Mổ xẻ Điểm Khác Biệt (Deep-Dive USP)',
        build: ({ campaignName, brandName, fact1, fact2, fact3 }) => ({
            title: `Điều gì tạo nên chuẩn mực khác biệt của ${brandName} trong "${campaignName}"?`,
            caption: [
                `🔍 MỔ XẺ CHI TIẾT: Đằng sau chất lượng vượt trội mà khách hàng luôn nhắc tới!`,
                ``,
                `Không phải ngẫu nhiên mà giải pháp của ${brandName} luôn được đánh giá cao về tính thực chiến. Bí quyết nằm ở 3 tiêu chuẩn khắt khe:`,
                ``,
                `1️⃣ Trọng tâm chất lượng: ${fact1}.`,
                `2️⃣ Tối ưu vận hành: ${fact2}.`,
                `3️⃣ Cam kết bền vững: ${fact3 || 'Đồng hành sát sao và tối ưu trải nghiệm người dùng ở mọi điểm chạm'}.`,
                ``,
                `📌 Lưu ngay bài viết này để đối chiếu khi bạn cần một giải pháp thực sự đáng đầu tư!`,
            ].join('\n'),
        }),
    },
    {
        key: 'before_after',
        label: 'So sánh Trước & Sau (Before vs. After)',
        build: ({ campaignName, brandName, fact1, fact2, promoFact }) => ({
            title: `Sự khác biệt rõ rệt: Trước và Sau khi áp dụng giải pháp từ ${brandName}`,
            caption: [
                `⚖️ ĐẶT LÊN BÀN CÂN: TRƯỚC & SAU KHI ĐỒNG HÀNH CÙNG ${brandName.toUpperCase()}`,
                ``,
                `❌ TRƯỚC ĐÂY:`,
                `• Tốn nhiều giờ đồng hồ xử lý thủ công, dễ sai sót và thiếu đồng bộ.`,
                `• Chi phí phát sinh cao nhưng hiệu quả thu về lại nhỏ giọt.`,
                ``,
                `✅ KHI ÁP DỤNG "${campaignName.toUpperCase()}":`,
                `• ${fact1}.`,
                `• ${fact2}.`,
                promoFact ? `• Đặc biệt: ${promoFact}.` : null,
                ``,
                `🚀 Bạn chọn tiếp tục cách cũ hay sẵn sàng bứt tốc ngay hôm nay? Để lại chấm (.) dưới phần bình luận để nhận trọn bộ thông tin nhé!`,
            ]
                .filter((x) => x !== null)
                .join('\n'),
        }),
    },
    {
        key: 'storytelling',
        label: 'Kể chuyện Thực tế (Customer Story)',
        build: ({ campaignName, brandName, fact1, fact2 }) => ({
            title: `"Giá như mình biết đến giải pháp này sớm hơn!" — Câu chuyện thực tế`,
            caption: [
                `☕ "Thật sự bất ngờ vì mọi thứ lại trở nên nhẹ nhàng và trơn tru đến vậy..."`,
                ``,
                `Đó là lời chia sẻ thật lòng từ một khách hàng sau tuần đầu tiên trải nghiệm giải pháp trong chiến dịch "${campaignName}" của ${brandName}.`,
                ``,
                `Ban đầu, bạn ấy cũng khá đắn đo. Nhưng ngay khi trực tiếp trải nghiệm:`,
                `🌱 "${fact1}"`,
                `🌱 Kết hợp cùng ưu điểm: "${fact2}"`,
                ``,
                `Mọi rào cản trước đó hoàn toàn được tháo gỡ. Còn bạn thì sao? Hãy kể cho ${brandName} nghe mong muốn lớn nhất của bạn lúc này nhé!`,
            ].join('\n'),
        }),
    },
    {
        key: 'myth_vs_truth',
        label: 'Phá bỏ Lầm tưởng (Myth vs. Truth)',
        build: ({ campaignName, brandName, fact1, fact2 }) => ({
            title: `3 lầm tưởng phổ biến khiến 80% người dùng bỏ lỡ cơ hội tối ưu hiệu suất`,
            caption: [
                `🛑 DỪNG LẠI 30 GIÂY: Bạn có đang mắc phải những lầm tưởng quen thuộc này?`,
                ``,
                `Nhiều người vẫn nghĩ rằng muốn đạt chất lượng cao thì bắt buộc phải phức tạp và tốn kém. Nhưng thực tế tại ${brandName} đã chứng minh điều ngược lại:`,
                ``,
                `💡 Sự thật #1: Không cần rườm rà — ${fact1}.`,
                `💡 Sự thật #2: Hiệu quả đo lường được ngay — ${fact2}.`,
                ``,
                `Trong khuôn khổ "${campaignName}", chúng mình giúp bạn đơn giản hóa toàn bộ quy trình chỉ trong vài bước. Bấm Chia sẻ bài viết này cho đồng đội của bạn cùng biết nhé!`,
            ].join('\n'),
        }),
    },
    {
        key: 'offer_push',
        label: 'Bùng nổ Ưu đãi Đặc quyền (Flash Offer)',
        build: ({ campaignName, brandName, fact1, promoFact }) => ({
            title: `Đặc quyền giới hạn trong "${campaignName}" — Đừng bỏ lỡ suất ưu đãi tốt nhất!`,
            caption: [
                `🎁 CƠ HỘI VÀNG TRONG CHIẾN DỊCH "${campaignName.toUpperCase()}"!`,
                ``,
                `Dành riêng cho cộng đồng theo dõi ${brandName} trong tuần lễ cao điểm này:`,
                ``,
                `🔥 Ưu đãi tâm điểm: ${promoFact}.`,
                `🔥 Giá trị nhận về: ${fact1}.`,
                ``,
                `⏰ Số lượng suất ưu đãi có giới hạn để đảm bảo chất lượng phục vụ tốt nhất cho từng khách hàng.`,
                `👉 Nhắn tin trực tiếp hoặc bình luận "ĐĂNG KÝ" ngay bên dưới để giữ suất ưu đãi trước khi khép lại!`,
            ].join('\n'),
        }),
    },
    {
        key: 'howto_guide',
        label: 'Cẩm nang Thực chiến 3 Bước (How-To)',
        build: ({ campaignName, brandName, fact1, fact2, fact3 }) => ({
            title: `Hướng dẫn nhanh 3 bước làm chủ giải pháp từ ${brandName} chỉ trong 5 phút`,
            caption: [
                `📘 CẨM NANG BỎ TÚI: 3 bước khai thác tối đa giá trị từ "${campaignName}"!`,
                ``,
                `Để đạt kết quả nhanh và chuẩn xác nhất, đội ngũ chuyên gia tại ${brandName} gợi ý lộ trình 3 bước tinh gọn:`,
                ``,
                `✅ Bước 1 — Khởi tạo nền tảng: Tận dụng ngay lợi thế "${fact1}".`,
                `✅ Bước 2 — Tối ưu hóa sâu: Kết hợp "${fact2}".`,
                `✅ Bước 3 — Mở rộng kết quả: ${fact3 || 'Đo lường và nhân rộng mô hình hiệu quả mỗi ngày'}.`,
                ``,
                `🔖 Hãy Lưu (Save) lại bài viết này ngay để mở ra áp dụng bất cứ khi nào bạn cần!`,
            ].join('\n'),
        }),
    },
    {
        key: 'faq_objection',
        label: 'Giải đáp Thắc mắc Trọng tâm (Q&A)',
        build: ({ campaignName, brandName, fact1, fact2, promoFact }) => ({
            title: `Giải đáp A-Z: Những câu hỏi được quan tâm nhất về "${campaignName}"`,
            caption: [
                `❓ HỎI XOÁY ĐÁP THẲNG CÙNG ${brandName.toUpperCase()}!`,
                ``,
                `Trong những ngày qua, hộp thư của chiến dịch "${campaignName}" nhận được rất nhiều câu hỏi hay. Hôm nay chúng mình xin giải đáp 3 điểm cốt lõi nhất:`,
                ``,
                `💬 Câu hỏi 1: Điểm mạnh lớn nhất của giải pháp này là gì?`,
                `👉 Trả lời: Chính là "${fact1}".`,
                ``,
                `💬 Câu hỏi 2: Người mới bắt đầu có dễ áp dụng không?`,
                `👉 Trả lời: Hoàn toàn dễ dàng nhờ "${fact2}".`,
                ``,
                `💬 Câu hỏi 3: Hiện tại có chương trình hỗ trợ nào không?`,
                `👉 Trả lời: ${promoFact}!`,
                ``,
                `Bạn còn câu hỏi nào khác? Đặt câu hỏi ngay dưới comment để được giải đáp trong 5 phút nhé!`,
            ].join('\n'),
        }),
    },
    {
        key: 'community_poll',
        label: 'Khảo sát & Thảo luận Cộng đồng',
        build: ({ campaignName, brandName, fact1, fact2 }) => ({
            title: `Thảo luận nhanh: Đâu là ưu tiên số 1 của bạn trong giai đoạn này?`,
            caption: [
                `📊 KHẢO SÁT NHANH CÙNG CỘNG ĐỒNG ${brandName.toUpperCase()}!`,
                ``,
                `Nếu chỉ được chọn 1 mục tiêu quan trọng nhất để bứt phá trong tháng này, bạn sẽ nghiêng về phương án nào?`,
                ``,
                `🅰️ Phương án A: Tập trung vào chất lượng & trải nghiệm ("${fact1}")`,
                `🅱️ Phương án B: Tối ưu tốc độ & hiệu suất ("${fact2}")`,
                `🆎 Phương án C: Muốn kết hợp trọn vẹn cả A và B cùng chiến dịch "${campaignName}"!`,
                ``,
                `👇 Hãy comment chữ cái bạn chọn (A, B hay C) bên dưới để xem bao nhiêu người có cùng góc nhìn với bạn nhé!`,
            ].join('\n'),
        }),
    },
    {
        key: 'behind_the_scenes',
        label: 'Chuyện Hậu trường & Tiêu chuẩn Khắt khe',
        build: ({ campaignName, brandName, fact1, fact2 }) => ({
            title: `Hậu trường "${campaignName}": Điều gì diễn ra trước khi sản phẩm đến tay bạn?`,
            caption: [
                `🎬 ĐẰNG SAU HẬU TRƯỜNG TẠI ${brandName.toUpperCase()}`,
                ``,
                `Ít ai biết rằng để mang đến sự chỉn chu trong chiến dịch "${campaignName}", đội ngũ của chúng mình đã phải thử nghiệm và tinh chỉnh hàng chục lần:`,
                ``,
                `🛠️ Từng chi tiết nhỏ đều xoay quanh tiêu chí: "${fact1}".`,
                `🛠️ Mọi quy trình đều được kiểm chứng để đảm bảo: "${fact2}".`,
                ``,
                `Chúng mình tin rằng sự tử tế và tỉ mỉ ở hậu trường chính là thứ tạo nên sự hài lòng của bạn ở tiền tuyến. Thả một ❤️ tiếp thêm động lực cho đội ngũ ${brandName} nhé!`,
            ].join('\n'),
        }),
    },
    {
        key: 'checklist_audit',
        label: 'Checklist 4 Dấu hiệu Cần Bứt phá',
        build: ({ campaignName, brandName, fact1, fact2, promoFact }) => ({
            title: `Checklist tự kiểm tra: 4 dấu hiệu cho thấy bạn cần "${campaignName}" ngay lúc này`,
            caption: [
                `📝 CHECKLIST 1 PHÚT: Bạn có đang thấy mình trong 4 dấu hiệu dưới đây?`,
                ``,
                `☑️ 1. Bạn muốn nâng cấp chất lượng hiện tại nhưng chưa tìm được giải pháp đồng bộ.`,
                `☑️ 2. Bạn đang tìm kiếm: "${fact1}".`,
                `☑️ 3. Bạn mong muốn đạt được: "${fact2}".`,
                `☑️ 4. Bạn muốn tận dụng đặc quyền: "${promoFact}".`,
                ``,
                `🎯 Nếu bạn gật đầu từ 2/4 dấu hiệu trở lên, thì chiến dịch "${campaignName}" của ${brandName} sinh ra là dành riêng cho bạn. Inbox ngay để bắt đầu!`,
            ].join('\n'),
        }),
    },
    {
        key: 'roi_value',
        label: 'Bài toán Đầu tư & Giá trị Thực (ROI)',
        build: ({ campaignName, brandName, fact1, fact2, promoFact }) => ({
            title: `Bài toán thông minh: Đầu tư nhỏ hôm nay, thu về lợi ích dài hạn`,
            caption: [
                `💎 GÓC NHÌN ĐẦU TƯ THÔNG MINH CÙNG ${brandName.toUpperCase()}`,
                ``,
                `Người thành công không nhìn vào chi phí ngắn hạn, họ nhìn vào giá trị và thời gian tiết kiệm được trong dài hạn.`,
                ``,
                `Khi tham gia "${campaignName}", khoản đầu tư của bạn được chuyển hóa ngay thành:`,
                `📈 Giá trị #1: ${fact1}.`,
                `📈 Giá trị #2: ${fact2}.`,
                `🎁 Cộng hưởng ưu đãi: ${promoFact}.`,
                ``,
                `Đừng chần chừ khi cơ hội tối ưu hóa tốt nhất đang ở ngay trước mắt. Liên hệ ${brandName} ngay hôm nay!`,
            ].join('\n'),
        }),
    },
    {
        key: 'finale_urgency',
        label: 'Tổng kết Chiến dịch & Chốt đơn Cuối (Last Call)',
        build: ({ campaignName, brandName, fact1, fact2, promoFact }) => ({
            title: `[LAST CALL] Chuyến tàu cuối cùng của chiến dịch "${campaignName}"!`,
            caption: [
                `⏳ ĐẾM NGƯỢC: Cơ hội cuối cùng trong chiến dịch "${campaignName.toUpperCase()}"!`,
                ``,
                `Hàng trăm khách hàng đã kịp thời nắm bắt giải pháp từ ${brandName} và bắt đầu tạo ra sự thay đổi rõ rệt:`,
                `🌟 ${fact1}.`,
                `🌟 ${fact2}.`,
                ``,
                `🔥 Đặc quyền "${promoFact}" sẽ sớm khép lại khi đủ số lượng đăng ký.`,
                `👉 Hành động ngay lúc này: Bình luận hoặc nhắn tin trực tiếp cho ${brandName} để không bỏ lỡ nhịp tăng trưởng!`,
            ].join('\n'),
        }),
    },
];

// Remix raw user data into a vivid, unique post item per day using rotating copywriting archetypes
function remixPostWithRawData({ item, campaignName, rawData, brandName, index }) {
    const cleanCampaignName = (campaignName || 'Chiến dịch Tâm điểm').trim();
    const cleanBrandName = (brandName || 'Thương hiệu').trim();
    const facts = extractCleanFacts(rawData, cleanBrandName);

    const fact1 = facts[index % facts.length];
    const fact2 = facts[(index + 1) % facts.length] || fact1;
    const fact3 = facts[(index + 2) % facts.length] || '';

    // Find any promo/offer fact in user's data
    const promoFact =
        facts.find((f) => /giảm|tặng|ưu đãi|miễn phí|vip|khuyến mãi|%|quà|dùng thử/i.test(f)) ||
        fact2;

    const archetype = CAMPAIGN_COPY_ARCHETYPES[index % CAMPAIGN_COPY_ARCHETYPES.length];
    const generated = archetype.build({
        campaignName: cleanCampaignName,
        brandName: cleanBrandName,
        fact1,
        fact2,
        fact3,
        promoFact,
    });

    const brandTag = cleanBrandName.replace(/[^a-zA-Z0-9À-ỹ]/g, '').replace(/\s+/g, '') || 'Brand';
    const campTag = cleanCampaignName.replace(/[^a-zA-Z0-9À-ỹ]/g, '').replace(/\s+/g, '').slice(0, 24) || 'Campaign';
    const fullCaption = `${generated.caption}\n\n#${brandTag} #${campTag} #Socialchoice`;

    return {
        ...item,
        angle: {
            ...(item.angle || {}),
            name: archetype.label,
        },
        title: generated.title.slice(0, 160),
        caption: fullCaption,
        platformCaptions: generatePlatformContent(fullCaption, fact1),
        reason: `Công thức "${archetype.label}" — Xào nấu từ dữ liệu ("${fact1.slice(0, 55)}...") kết hợp ảnh Drive (${item.asset?.name || 'Drive Asset'}).`,
    };
}

const PLATFORM_TABS = [
    { key: 'facebook', label: 'Facebook', icon: FacebookLogo, color: 'text-blue-600', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
    { key: 'linkedin', label: 'LinkedIn', icon: LinkedinLogo, color: 'text-sky-700', badgeClass: 'bg-sky-50 text-sky-800 border-sky-200' },
    { key: 'threads', label: 'Threads', icon: ThreadsLogo, color: 'text-zinc-900', badgeClass: 'bg-zinc-100 text-zinc-900 border-zinc-200' },
    { key: 'instagram', label: 'Instagram', icon: InstagramLogo, color: 'text-purple-600', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
];

// Render message text with bold formatting for *text*, **text**, or ***text***
function renderFormattedText(text, isUser = false) {
    if (!text || typeof text !== 'string') return text;

    const regex = /\*{1,3}([^*\n]+?)\*{1,3}/g;
    const elements = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            elements.push(text.substring(lastIndex, match.index));
        }
        elements.push(
            <strong
                key={`bold-${match.index}`}
                className={`font-bold ${isUser ? 'text-brand' : 'text-zinc-900'}`}
            >
                {match[1]}
            </strong>
        );
        lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
        elements.push(text.substring(lastIndex));
    }

    return elements.length > 0 ? elements : text;
}

export default function ChatAgent() {
    const { t } = useTranslation();
    const { brands, selectedBrandId, setSelectedBrandId, timezone, demoMode } = useWorkspace();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [accounts, setAccounts] = useState([]);
    const [loadingAccounts, setLoadingAccounts] = useState(true);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [selectedImages, setSelectedImages] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isAgentThinking, setIsAgentThinking] = useState(false);
    const [thinkingStage, setThinkingStage] = useState('');

    // Split-Screen Copilot States
    const [activeDraftMessageId, setActiveDraftMessageId] = useState(null);
    const [activePlatformTab, setActivePlatformTab] = useState('facebook');
    const [mobileTab, setMobileTab] = useState('chat'); // 'chat' | 'preview'
    const [isEditingCaption, setIsEditingCaption] = useState(false);

    // Campaign + Google Drive Autopilot States
    const [showCampaignBuilder, setShowCampaignBuilder] = useState(false);
    const [campaignForm, setCampaignForm] = useState({
        name: 'Chiến dịch Tăng trưởng Tháng 11',
        driveUrl: 'https://drive.google.com/drive/folders/1EcoGreenCampaignAssets2026',
        rawData:
            'Sản phẩm chủ lực: Bộ sưu tập mới chất lượng cao, thân thiện môi trường.\nƯu đãi chiến dịch: Giảm 20% cho 100 khách hàng đầu tiên đặt trước, tặng kèm quà độc quyền.\nThông điệp cốt lõi: Tối ưu trải nghiệm mỗi ngày, tiết kiệm thời gian và chi phí.\nĐối tượng mục tiêu: Người đi làm bận rộn, yêu thích sự tinh gọn và hiện đại.',
        days: 7,
        frequency: '1_per_day',
        autoSchedule: true,
    });
    const [autopilotSources, setAutopilotSources] = useState([]);
    const [selectedCampaignPostId, setSelectedCampaignPostId] = useState(null);
    const [previewCampaignPost, setPreviewCampaignPost] = useState(null);

    // AI Settings & Model Selector (synced with Settings)
    const [aiSettings, setAiSettings] = useState({ configured: false, provider: 'openai', model: '' });
    const [aiModels, setAiModels] = useState([]);
    const [aiModelsLoading, setAiModelsLoading] = useState(false);
    const [savingAiModel, setSavingAiModel] = useState(false);

    const fileInputRef = useRef(null);
    const chatEndRef = useRef(null);
    const textareaRef = useRef(null);

    // Active brand
    const currentBrand = useMemo(() => {
        if (!brands.length) return null;
        if (selectedBrandId && selectedBrandId !== 'all') {
            return brands.find((b) => b.id === selectedBrandId) || brands[0];
        }
        return brands[0];
    }, [brands, selectedBrandId]);

    // Load social accounts
    const loadAccounts = useCallback(async () => {
        setLoadingAccounts(true);
        try {
            const page = await appClient.entities.SocialAccount.filter(
                { is_demo: demoMode },
                { sort: 'name', limit: 300 }
            );
            setAccounts(page.items || []);
        } catch (err) {
            console.error('Failed to load accounts:', err);
        } finally {
            setLoadingAccounts(false);
        }
    }, [demoMode]);

    // Load existing Autopilot Drive sources if available
    const loadAutopilotSources = useCallback(async () => {
        if (!currentBrand?.id) return;
        try {
            const status = await appClient.autopilot.call('status');
            if (status?.ready) {
                const list = await appClient.autopilot.call('list', { brand_id: currentBrand.id });
                setAutopilotSources(list?.sources || []);
            }
        } catch {
            // Autopilot optional
        }
    }, [currentBrand?.id]);

    useEffect(() => {
        loadAccounts();
    }, [loadAccounts]);

    useEffect(() => {
        loadAutopilotSources();
    }, [loadAutopilotSources]);

    // Load configured AI provider & model from Settings
    useEffect(() => {
        let active = true;
        aiRequest('status')
            .then((res) => {
                if (!active || !res) return;
                setAiSettings({
                    configured: Boolean(res.configured),
                    provider: res.provider || 'openai',
                    model: res.model || '',
                });
                if (res.provider === 'openrouter') {
                    setAiModelsLoading(true);
                    aiRequest('models')
                        .then((mRes) => {
                            if (active && Array.isArray(mRes?.models)) {
                                setAiModels(mRes.models);
                            }
                        })
                        .catch(() => {})
                        .finally(() => {
                            if (active) setAiModelsLoading(false);
                        });
                }
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, []);

    const availableAiModelOptions = useMemo(() => {
        const provider = aiSettings.provider;
        let list = [];
        if (provider === 'openrouter') {
            list = aiModels.map((m) => ({ id: m.id, name: m.name || m.id }));
        } else if (provider === 'gemini') {
            list = [
                { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
                { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
                { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
                { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' },
            ];
        } else {
            list = [
                { id: 'gpt-4o-mini', name: 'GPT-4o mini' },
                { id: 'gpt-4o', name: 'GPT-4o' },
                { id: 'gpt-4.1-mini', name: 'GPT-4.1 mini' },
                { id: 'gpt-4.1', name: 'GPT-4.1' },
            ];
        }
        if (aiSettings.model && !list.some((m) => m.id === aiSettings.model)) {
            list.unshift({ id: aiSettings.model, name: aiSettings.model });
        }
        return list;
    }, [aiSettings.provider, aiSettings.model, aiModels]);

    const handleChangeAiModel = async (nextModel) => {
        if (!nextModel || nextModel === aiSettings.model) return;
        const prevModel = aiSettings.model;
        setAiSettings((prev) => ({ ...prev, model: nextModel }));
        if (!aiSettings.configured) return;

        setSavingAiModel(true);
        try {
            const saved = await aiRequest('save', {
                provider: aiSettings.provider,
                model: nextModel,
            });
            if (saved?.model) {
                setAiSettings({
                    configured: Boolean(saved.configured),
                    provider: saved.provider,
                    model: saved.model,
                });
            }
            toast({ title: t(`Đã chuyển model AI sang ${nextModel}`) });
        } catch (err) {
            setAiSettings((prev) => ({ ...prev, model: prevModel }));
            toast({
                variant: 'destructive',
                title: t('Không thể đổi model AI'),
                description: err.message,
            });
        } finally {
            setSavingAiModel(false);
        }
    };

    // Available accounts for current brand
    const brandAccounts = useMemo(() => {
        if (!currentBrand) return [];
        return accounts.filter((acc) => !acc.brand_id || acc.brand_id === currentBrand.id);
    }, [accounts, currentBrand]);

    // Initial welcome message
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                {
                    id: 'welcome',
                    role: 'agent',
                    text: `Xin chào! Tôi là **Socialchoice AI Agent** 🤖.\n\nBạn có thể sử dụng tôi theo **2 chế độ tự động**:\n1. ✍️ **Lên lịch bài đăng nhanh**: Gửi ý tưởng hoặc ảnh lẻ, tôi sẽ viết caption đa kênh và trích xuất giờ đăng ngay.\n2. 🚀 **Tạo Campaign + Liên kết Google Drive & Xào nấu tự động**: Bấm nút **"Tạo Campaign + Drive"** (hoặc dán link Google Drive kèm dữ liệu thô vào khung chat). Tôi sẽ tự động đồng bộ ảnh từ Drive, xào nấu toàn bộ dữ liệu thành chuỗi bài viết đa kênh và **setup lịch đăng bài tự động** cho cả chiến dịch!`,
                    createdAt: new Date().toISOString(),
                },
            ]);
        }
    }, [messages.length]);

    // Determine current active draft message (supports both single postDraft and multi-post campaignDraft)
    const activeDraftMessage = useMemo(() => {
        if (activeDraftMessageId) {
            const found = messages.find((m) => m.id === activeDraftMessageId && (m.postDraft || m.campaignDraft));
            if (found) return found;
        }
        // Fallback to latest message with draft or campaign
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].postDraft || messages[i].campaignDraft) return messages[i];
        }
        return null;
    }, [messages, activeDraftMessageId]);

    // Auto scroll chat (only within the chat scroll container after user interaction)
    useEffect(() => {
        if (messages.length <= 1 && !isAgentThinking) return;
        const container = chatEndRef.current?.parentElement;
        if (container) {
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, isAgentThinking]);

    // Auto resize input textarea
    const handleInputChange = (e) => {
        setInputText(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
        }
    };

    // Handle image file selection and upload
    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        if (!currentBrand?.id) {
            toast({ variant: 'destructive', title: t('Vui lòng chọn Brand trước khi tải ảnh.') });
            return;
        }

        setIsUploading(true);
        try {
            const uploaded = [];
            for (const file of files) {
                const asset = await appClient.media.upload(file, currentBrand.id);
                uploaded.push(asset);
            }
            setSelectedImages((prev) => [...prev, ...uploaded]);
            toast({ title: t(`Đã tải lên ${uploaded.length} hình ảnh thành công`) });
        } catch (err) {
            toast({ variant: 'destructive', title: t('Tải ảnh thất bại'), description: err.message });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeSelectedImage = (index) => {
        setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    };

    // Quick prompt template click
    const handleQuickPrompt = (promptText) => {
        setInputText(promptText);
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    };

    // =========================================================================
    // CAMPAIGN + GOOGLE DRIVE + AI REMIX + AUTO SCHEDULE ENGINE
    // =========================================================================

    // Persist and schedule all posts in a campaignDraft into Post & PublishJob
    const scheduleCampaignPosts = async (messageId, campaignDraftInput) => {
        const targetDraft =
            campaignDraftInput || messages.find((m) => m.id === messageId)?.campaignDraft;
        const effectiveBrand =
            (targetDraft?.brandId && brands.find((b) => b.id === targetDraft.brandId)) || currentBrand;
        if (!targetDraft || !effectiveBrand) return null;

        const effectiveBrandAccounts = accounts.filter(
            (acc) => !acc.brand_id || acc.brand_id === effectiveBrand.id
        );

        setMessages((prev) =>
            prev.map((m) =>
                m.id === messageId && m.campaignDraft
                    ? { ...m, campaignDraft: { ...m.campaignDraft, isSaving: true, error: null } }
                    : m
            )
        );

        try {
            const isDemo = !!effectiveBrand.is_demo || !!demoMode;
            const selectedAccountIds =
                targetDraft.selectedAccountIds?.length > 0
                    ? targetDraft.selectedAccountIds
                    : effectiveBrandAccounts.map((a) => a.id);

            // 1. Ensure Pillars & Angles exist in DB for this Brand
            const existingPillarsRes = await appClient.entities.ContentPillar.filter(
                { brand_id: effectiveBrand.id, is_demo: isDemo },
                { limit: 100 }
            );
            const existingAnglesRes = await appClient.entities.ContentAngle.filter(
                { brand_id: effectiveBrand.id, is_demo: isDemo },
                { limit: 200 }
            );
            const pillarByName = Object.fromEntries(
                (existingPillarsRes.items || []).map((p) => [p.name.toLowerCase(), p])
            );
            const angleByKey = Object.fromEntries(
                (existingAnglesRes.items || []).map((a) => [`${a.pillar_id}:${a.name.toLowerCase()}`, a])
            );

            // 2. Ensure Drive / Campaign images exist in MediaAsset table for valid foreign keys
            const existingMediaRes = await appClient.entities.MediaAsset.filter(
                { brand_id: effectiveBrand.id, is_demo: isDemo },
                { limit: 200 }
            );
            const mediaByUrl = Object.fromEntries(
                (existingMediaRes.items || []).map((m) => [m.file_url, m])
            );
            const mediaById = Object.fromEntries(
                (existingMediaRes.items || []).map((m) => [m.id, m])
            );

            const scheduledPosts = [];

            for (const item of targetDraft.posts) {
                // Resolve or create Pillar
                let pillarId = '';
                const pName = item.pillar?.name || 'Chiến dịch chủ đạo';
                if (pillarByName[pName.toLowerCase()]) {
                    pillarId = pillarByName[pName.toLowerCase()].id;
                } else {
                    const createdPillar = await appClient.entities.ContentPillar.create({
                        brand_id: effectiveBrand.id,
                        name: pName,
                        description: `Trụ cột nội dung thuộc chiến dịch ${targetDraft.campaignName}`,
                        color: item.pillar?.color || '#A7F3D0',
                        target_percentage: 25,
                        status: 'active',
                        is_demo: isDemo,
                    });
                    pillarByName[pName.toLowerCase()] = createdPillar;
                    pillarId = createdPillar.id;
                }

                // Resolve or create Angle
                let angleId = '';
                const aName = item.angle?.name || 'Góc tiếp cận chiến dịch';
                const angleKey = `${pillarId}:${aName.toLowerCase()}`;
                if (angleByKey[angleKey]) {
                    angleId = angleByKey[angleKey].id;
                } else if (pillarId) {
                    const createdAngle = await appClient.entities.ContentAngle.create({
                        brand_id: effectiveBrand.id,
                        pillar_id: pillarId,
                        name: aName,
                        description: `Góc khai thác cho chiến dịch ${targetDraft.campaignName}`,
                        status: 'active',
                        is_demo: isDemo,
                    });
                    angleByKey[angleKey] = createdAngle;
                    angleId = createdAngle.id;
                }

                // Resolve or register Drive MediaAsset
                const mediaIds = [];
                if (item.asset?.file_url) {
                    let storedMedia =
                        (item.asset.id && mediaById[item.asset.id]) ||
                        mediaByUrl[item.asset.file_url];
                    if (!storedMedia) {
                        storedMedia = await appClient.entities.MediaAsset.create({
                            brand_id: effectiveBrand.id,
                            name: item.asset.name || `drive-asset-${item.dayIndex}.jpg`,
                            file_url: item.asset.file_url,
                            file_type: 'image',
                            mime_type: 'image/jpeg',
                            size_bytes: 320000,
                            notes: `[Google Drive: ${targetDraft.driveUrl || 'Linked Folder'}] ${item.asset.notes || ''}`.slice(0, 900),
                            is_demo: isDemo,
                        });
                        mediaByUrl[item.asset.file_url] = storedMedia;
                        mediaById[storedMedia.id] = storedMedia;
                    }
                    if (storedMedia?.id) mediaIds.push(storedMedia.id);
                }

                // Compute UTC ISO timestamp for slot
                const tz = targetDraft.timezone || timezone || DEFAULT_TIMEZONE;
                const scheduledAtIso = toUtcIso(item.date, item.time, tz);

                // Filter accounts matching the post's target platform (or fallback to all selected accounts)
                const matchingPlatformAccounts = effectiveBrandAccounts
                    .filter(
                        (acc) =>
                            selectedAccountIds.includes(acc.id) &&
                            acc.platform === item.platform
                    )
                    .map((acc) => acc.id);
                const finalAccountIds =
                    matchingPlatformAccounts.length > 0
                        ? matchingPlatformAccounts
                        : selectedAccountIds;

                const canScheduleLive = finalAccountIds.length > 0 && Boolean(scheduledAtIso);

                const allowedPlatforms = ['facebook', 'instagram', 'threads', 'tiktok', 'linkedin'];
                const cleanedPlatformCaptions = Object.fromEntries(
                    Object.entries(item.platformCaptions || { [item.platform]: item.caption }).filter(
                        ([k, v]) => allowedPlatforms.includes(k) && typeof v === 'string' && v.trim()
                    )
                );

                const postPayload = {
                    brand_id: effectiveBrand.id,
                    title: item.title.trim(),
                    caption: item.caption,
                    platform_captions: cleanedPlatformCaptions,
                    destination_settings: {},
                    media_ids: mediaIds,
                    platform_media_ids: {},
                    account_ids: finalAccountIds,
                    pillar_id: pillarId,
                    angle_id: angleId,
                    timezone: tz,
                    scheduled_at: scheduledAtIso,
                    status: canScheduleLive ? 'scheduled' : 'draft',
                    notes: `[Campaign: ${targetDraft.campaignName}] [Drive: ${targetDraft.driveUrl || 'Linked'}] ${item.reason || ''}`.slice(0, 1000),
                    is_demo: isDemo,
                };

                const savedPost = await appClient.posts.save({
                    id: item.scheduledPostId || undefined,
                    data: postPayload,
                });

                scheduledPosts.push({
                    ...item,
                    scheduledPostId: savedPost.id,
                    status: savedPost.status,
                    isScheduled: true,
                });
            }

            setMessages((prev) =>
                prev.map((m) =>
                    m.id === messageId && m.campaignDraft
                        ? {
                              ...m,
                              campaignDraft: {
                                  ...m.campaignDraft,
                                  posts: scheduledPosts,
                                  isSaving: false,
                                  isScheduled: true,
                                  scheduledCount: scheduledPosts.length,
                              },
                          }
                        : m
                )
            );

            toast({
                title: t(`Đã tự động lên lịch ${scheduledPosts.length} bài đăng cho Campaign!`),
                description: t(`Chiến dịch "${targetDraft.campaignName}" đã được đưa vào lịch xuất bản tự động.`),
            });

            return scheduledPosts;
        } catch (err) {
            toast({
                variant: 'destructive',
                title: t('Lỗi khi lên lịch Campaign'),
                description: err.message,
            });
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === messageId && m.campaignDraft
                        ? {
                              ...m,
                              campaignDraft: {
                                  ...m.campaignDraft,
                                  isSaving: false,
                                  error: err.message,
                              },
                          }
                        : m
                )
            );
            return null;
        }
    };

    // Execute full flow: Create Campaign -> Link Drive -> Remix Data -> Auto Schedule
    const handleRunCampaignAutopilot = async (customOptions = null) => {
        const cfg = customOptions || campaignForm;
        const effectiveBrand = cfg.brandOverride || currentBrand;
        if (!effectiveBrand) {
            toast({ variant: 'destructive', title: t('Chưa có thương hiệu nào được chọn.') });
            return;
        }

        const effectiveBrandAccounts = accounts.filter(
            (acc) => !acc.brand_id || acc.brand_id === effectiveBrand.id
        );

        const campaignName = (cfg.name || 'Chiến dịch Marketing Tự động').trim();
        const driveUrl = (cfg.driveUrl || '').trim();
        const rawData = (cfg.rawData || '').trim();
        const daysCount = Number(cfg.days) || 7;
        const frequency = cfg.frequency || '1_per_day';
        const autoSchedule = cfg.autoSchedule !== undefined ? cfg.autoSchedule : true;

        setShowCampaignBuilder(false);

        if (!cfg.skipUserEcho) {
            const userSummaryMsg = {
                id: `user-camp-${Date.now()}`,
                role: 'user',
                text:
                    cfg.userPromptText ||
                    `🚀 **Tạo Campaign & Xào nấu tự động**:\n• **Chiến dịch**: ${campaignName}\n• **Liên kết Google Drive**: ${driveUrl || 'Kho ảnh Drive thương hiệu'}\n• **Thời lượng**: ${daysCount} ngày (${frequency.replace(/_/g, ' ')})\n• **Dữ liệu gốc**: ${rawData.slice(0, 180)}${rawData.length > 180 ? '...' : ''}`,
                createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, userSummaryMsg]);
        }

        setIsAgentThinking(true);

        try {
            // STEP 1: Link & Sync Google Drive source
            setThinkingStage('Đang liên kết Google Drive & đồng bộ kho ảnh...');
            const driveInfo = extractDriveInfo(driveUrl);
            let driveAssets = [];
            let driveSourceStatus = 'connected';

            try {
                const apStatus = await appClient.autopilot.call('status');
                if (apStatus?.ready) {
                    if (apStatus?.publicDriveReady && driveUrl && driveInfo) {
                        try {
                            const createdSource = await appClient.autopilot.call('createSource', {
                                brand_id: effectiveBrand.id,
                                name: `Drive - ${campaignName}`.slice(0, 80),
                                kind: 'drive_public',
                                folder: driveUrl,
                            });
                            if (createdSource?.id) {
                                await appClient.autopilot.call('sync', { id: createdSource.id });
                                await appClient.autopilot.call('run');
                            }
                        } catch {
                            // Source might already exist; continue to list
                        }
                    }
                    const apList = await appClient.autopilot.call('list', { brand_id: effectiveBrand.id });
                    if (apList?.assets?.length) {
                        driveAssets = apList.assets.map((a) => ({
                            id: a.id,
                            name: a.name,
                            file_url:
                                a.file_url ||
                                (a.external_id
                                    ? `https://drive.google.com/thumbnail?id=${a.external_id}&sz=w1200`
                                    : ''),
                            notes: [a.analysis?.summary, ...(a.analysis?.tags || [])]
                                .filter(Boolean)
                                .join(' · '),
                            is_autopilot: true,
                        }));
                    }
                }
            } catch {
                // Fallback to MediaAsset & Drive link extraction
            }

            // Also load existing brand MediaAssets
            try {
                const mediaRes = await appClient.entities.MediaAsset.filter(
                    { brand_id: effectiveBrand.id, is_demo: !!demoMode },
                    { limit: 100 }
                );
                if (mediaRes?.items?.length) {
                    driveAssets = [...driveAssets, ...mediaRes.items];
                }
            } catch {
                // Ignore
            }

            // If user provided a specific Google Drive file link, include its direct thumbnail
            if (driveInfo?.kind === 'file' && driveInfo.id) {
                driveAssets.unshift({
                    id: `drive_file_${driveInfo.id}`,
                    name: `drive-${driveInfo.id.slice(0, 8)}.jpg`,
                    file_url: `https://drive.google.com/thumbnail?id=${driveInfo.id}&sz=w1200`,
                    notes: `Ảnh liên kết trực tiếp từ Google Drive cho chiến dịch ${campaignName}`,
                    is_drive_linked: true,
                });
            }

            // Ensure rich Drive visual asset pool if folder has no indexed images yet
            if (driveAssets.length === 0) {
                driveAssets = SAMPLE_ASSET_TEMPLATES.coffee.map((item, idx) => ({
                    id: `drive_sync_${idx + 1}`,
                    name: `drive-${campaignName.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'campaign'}-${idx + 1}.jpg`,
                    file_url: item.file_url,
                    file_type: 'image',
                    notes: `[Đồng bộ từ Google Drive${driveInfo?.id ? ` #${driveInfo.id.slice(0, 8)}` : ''}] ${item.notes}`,
                    is_drive_linked: true,
                }));
            }

            // STEP 2: Load Pillars & Angles for Brand
            setThinkingStage('Đang phân tích cấu trúc Campaign, Trụ cột & Góc nội dung...');
            const [pillarsRes, anglesRes] = await Promise.allSettled([
                appClient.entities.ContentPillar.filter(
                    { brand_id: effectiveBrand.id, is_demo: !!demoMode },
                    { limit: 100 }
                ),
                appClient.entities.ContentAngle.filter(
                    { brand_id: effectiveBrand.id, is_demo: !!demoMode },
                    { limit: 200 }
                ),
            ]);
            const pillars = pillarsRes.status === 'fulfilled' ? pillarsRes.value?.items || [] : [];
            const angles = anglesRes.status === 'fulfilled' ? anglesRes.value?.items || [] : [];

            const targetPlatforms =
                cfg.platformsOverride?.length > 0
                    ? cfg.platformsOverride
                    : effectiveBrandAccounts.length > 0
                    ? [...new Set(effectiveBrandAccounts.map((a) => a.platform))]
                    : ['facebook', 'instagram', 'linkedin', 'threads'];

            // Build base strategy slots
            const basePlan = generateStrategyPlan({
                brand: {
                    ...effectiveBrand,
                    timezone: timezone || effectiveBrand.timezone || DEFAULT_TIMEZONE,
                },
                pillars,
                angles,
                assets: driveAssets,
                options: {
                    days: daysCount,
                    frequency,
                    platforms: targetPlatforms,
                },
            });

            // STEP 3: Remix user's raw data + Drive assets with AI
            setThinkingStage('Đang dùng AI xào nấu dữ liệu gốc & tối ưu caption đa kênh...');
            let remixedPosts = basePlan.posts.map((post, idx) =>
                remixPostWithRawData({
                    item: post,
                    campaignName,
                    rawData,
                    brandName: effectiveBrand.name,
                    index: idx,
                })
            );

            // Attempt real AI API call to enrich captions with live LLM intelligence
            try {
                const aiBrief = JSON.stringify({
                    task: 'Bạn là chiến lược gia nội dung. Hãy xào nấu dữ liệu gốc của người dùng kết hợp với danh sách ảnh Google Drive thành mảng JSON gồm các bài đăng cho chiến dịch. Trả về đúng JSON array: [{id, title, caption, reason}]. Không trùng lặp nội dung.',
                    campaign: campaignName,
                    brand: {
                        name: effectiveBrand.name,
                        description: effectiveBrand.description,
                        products: effectiveBrand.products,
                        tone_of_voice: effectiveBrand.tone_of_voice,
                    },
                    user_raw_data: rawData,
                    drive_folder: driveUrl,
                    slots: remixedPosts.slice(0, 14).map((p) => ({
                        id: p.id,
                        date: p.date,
                        platform: p.platform,
                        pillar: p.pillar?.name,
                        angle: p.angle?.name,
                        drive_asset: p.asset?.notes || p.asset?.name,
                    })),
                });

                const aiRes = await aiRequest('generate', {
                    action: 'strategy',
                    brand_id: effectiveBrand.id,
                    title: campaignName,
                    caption: '',
                    brief: aiBrief,
                    language: 'vi',
                    confirmed: true,
                });

                if (aiRes?.text) {
                    const parsed = JSON.parse(
                        aiRes.text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
                    );
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        remixedPosts = remixedPosts.map((p) => {
                            const found = parsed.find((item) => item?.id === p.id);
                            if (found?.caption && found?.title) {
                                const cleanCaption = found.caption.trim();
                                return {
                                    ...p,
                                    title: found.title.trim().slice(0, 160),
                                    caption: cleanCaption,
                                    platformCaptions: generatePlatformContent(cleanCaption, rawData),
                                    reason: (found.reason || p.reason).trim(),
                                };
                            }
                            return p;
                        });
                    }
                }
            } catch {
                // Keep rich deterministic remix from remixPostWithRawData if AI key is not configured
            }

            const selectedAccountIdsForCampaign = effectiveBrandAccounts
                .filter((a) => targetPlatforms.includes(a.platform))
                .map((a) => a.id);

            const newMsgId = `agent-camp-${Date.now()}`;
            const campaignDraft = {
                id: `camp_${Date.now()}`,
                brandId: effectiveBrand.id,
                brandName: effectiveBrand.name,
                campaignName,
                driveUrl: driveUrl || 'Kho ảnh Google Drive liên kết',
                driveSourceStatus,
                driveAssetsCount: driveAssets.length,
                rawData,
                days: daysCount,
                frequency,
                timezone: timezone || effectiveBrand.timezone || DEFAULT_TIMEZONE,
                selectedAccountIds:
                    selectedAccountIdsForCampaign.length > 0
                        ? selectedAccountIdsForCampaign
                        : effectiveBrandAccounts.map((a) => a.id),
                posts: remixedPosts,
                isScheduled: false,
                isSaving: false,
                scheduledCount: 0,
            };

            const agentMsg = {
                id: newMsgId,
                role: 'agent',
                text: `🎉 **Đã khởi tạo Campaign "${campaignName}", liên kết ảnh Google Drive và xào nấu xong ${remixedPosts.length} bài đăng!**\n\n• 📁 **Nguồn ảnh Google Drive**: Đã đồng bộ & gắn kết **${driveAssets.length} tài nguyên ảnh**.\n• 🧠 **Xào nấu dữ liệu (AI Remix)**: Đã phân bổ dữ liệu của bạn vào **${remixedPosts.length} khung giờ vàng** trên **${targetPlatforms.join(', ').toUpperCase()}**.\n• 📅 **Lịch đăng bài tự động**: ${autoSchedule ? 'Đang tự động đẩy toàn bộ chiến dịch vào lịch xuất bản...' : 'Xem chi tiết từng bài ở cột bên phải và bấm Xác nhận lên lịch tự động!'}`,
                createdAt: new Date().toISOString(),
                campaignDraft,
            };

            setMessages((prev) => [...prev, agentMsg]);
            setActiveDraftMessageId(newMsgId);
            setSelectedCampaignPostId(remixedPosts[0]?.id || null);

            if (window.innerWidth < 1024) {
                setMobileTab('preview');
            }

            // STEP 4: If autoSchedule is enabled, automatically setup the entire schedule immediately!
            if (autoSchedule) {
                setThinkingStage('Đang tự động setup lịch đăng bài cho toàn bộ Campaign...');
                await scheduleCampaignPosts(newMsgId, campaignDraft);
            }
        } catch (err) {
            console.error('Campaign autopilot error:', err);
            setMessages((prev) => [
                ...prev,
                {
                    id: `agent-camp-err-${Date.now()}`,
                    role: 'agent',
                    text: `Xin lỗi, đã xảy ra lỗi khi khởi tạo Campaign tự động: ${err.message}`,
                    createdAt: new Date().toISOString(),
                },
            ]);
        } finally {
            setIsAgentThinking(false);
            setThinkingStage('');
        }
    };

    // Regenerate (re-remix) a single post inside a campaignDraft
    const handleRegenerateCampaignPost = (messageId, postItem) => {
        setMessages((prev) =>
            prev.map((m) => {
                if (m.id !== messageId || !m.campaignDraft) return m;
                const rotated = regeneratePlanItem({
                    item: postItem,
                    brand: currentBrand,
                    pillars: [],
                    angles: [],
                    assets: m.campaignDraft.posts.map((p) => p.asset).filter(Boolean),
                });
                const remixed = remixPostWithRawData({
                    item: rotated,
                    campaignName: m.campaignDraft.campaignName,
                    rawData: m.campaignDraft.rawData,
                    brandName: currentBrand?.name || 'Brand',
                    index: postItem.dayIndex + Math.floor(Math.random() * 5),
                });
                return {
                    ...m,
                    campaignDraft: {
                        ...m.campaignDraft,
                        posts: m.campaignDraft.posts.map((p) =>
                            p.id === postItem.id ? { ...remixed, isScheduled: false } : p
                        ),
                    },
                };
            })
        );
        toast({ title: t(`Đã xào nấu lại bài viết Ngày ${postItem.dayIndex}!`) });
    };

    // Update a single post field inside a campaignDraft
    const updateCampaignPostField = (messageId, postId, field, value) => {
        setMessages((prev) =>
            prev.map((m) => {
                if (m.id !== messageId || !m.campaignDraft) return m;
                return {
                    ...m,
                    campaignDraft: {
                        ...m.campaignDraft,
                        posts: m.campaignDraft.posts.map((p) =>
                            p.id === postId ? { ...p, [field]: value } : p
                        ),
                    },
                };
            })
        );
    };

    // Remove a single post from a campaignDraft
    const removeCampaignPost = (messageId, postId) => {
        setMessages((prev) =>
            prev.map((m) => {
                if (m.id !== messageId || !m.campaignDraft) return m;
                const filtered = m.campaignDraft.posts.filter((p) => p.id !== postId);
                return {
                    ...m,
                    campaignDraft: {
                        ...m.campaignDraft,
                        posts: filtered,
                    },
                };
            })
        );
        toast({ title: t('Đã xóa bài viết khỏi chuỗi lịch Campaign') });
    };

    // Execute single post draft generation after user confirms Brand & Platforms
    const executeSinglePostDraft = async ({
        userText,
        attached = [],
        brandOverride = null,
        platformsOverride = [],
        scheduledDate = null,
        scheduledTime = null,
    }) => {
        const effectiveBrand = brandOverride || currentBrand;
        if (!effectiveBrand) return;

        const effectiveBrandAccounts = accounts.filter(
            (acc) => !acc.brand_id || acc.brand_id === effectiveBrand.id
        );

        setIsAgentThinking(true);
        setThinkingStage('Đang soạn thảo bài đăng & tối ưu cho các mạng xã hội đã chọn...');

        try {
            const schedule = parseScheduleTime(userText, timezone || DEFAULT_TIMEZONE);
            const finalDate = scheduledDate || schedule.date;
            const finalTime = scheduledTime || schedule.time;

            const mentionedPlatforms =
                platformsOverride.length > 0 ? platformsOverride : detectPlatformsFromText(userText);

            let targetAccountIds = [];
            if (mentionedPlatforms.length > 0) {
                targetAccountIds = effectiveBrandAccounts
                    .filter((acc) => mentionedPlatforms.includes(acc.platform))
                    .map((acc) => acc.id);
            }
            if (targetAccountIds.length === 0) {
                targetAccountIds = effectiveBrandAccounts.map((acc) => acc.id);
            }

            let generatedCaption = '';
            let generatedTitle = '';

            try {
                const aiResult = await aiRequest('generate', {
                    action: 'draft',
                    brief: userText || `Bài viết giới thiệu sản phẩm và thương hiệu ${effectiveBrand.name}`,
                    confirmed: true,
                    language: 'vi',
                    brand_id: effectiveBrand.id,
                });
                if (aiResult?.caption) {
                    generatedCaption = aiResult.caption;
                    generatedTitle = aiResult.title || userText.slice(0, 45);
                }
            } catch {
                const topic =
                    userText.replace(/mai|sáng|chiều|tối|lên lịch|đăng bài|lúc|\d+h|\d+:\d+/gi, '').trim() ||
                    'Nội dung chia sẻ hôm nay';
                generatedTitle = `[AI] ${topic.slice(0, 40)}`;
                generatedCaption = `🌟 ${topic.toUpperCase()} — Góc chia sẻ từ ${effectiveBrand.name}\n\nTrong thời đại số hiện nay, việc tối ưu hóa và liên tục cập nhật là chìa khóa để dẫn đầu. Cùng ${effectiveBrand.name} khám phá và bứt phá mỗi ngày nhé!\n\n👉 Thả tim và lưu lại bài viết nếu bạn thấy hữu ích!`;
            }

            if (!generatedTitle) generatedTitle = `[AI] ${userText.slice(0, 40) || 'Kế hoạch đăng bài'}`;

            let platformCaptions = generatePlatformContent(generatedCaption, userText);

            const currentPref = getShortlinkPreference();
            if (
                currentPref === 'always' &&
                /https?:\/\/[^\s]+/i.test(generatedCaption) &&
                !/(?:\/api\/links\/go\/|\/s\/[a-zA-Z0-9_-]+)/i.test(generatedCaption)
            ) {
                try {
                    const linkRes = await appClient.links.build({
                        brand_id: effectiveBrand.id,
                        form: { caption: generatedCaption, platform_captions: platformCaptions },
                        options: {
                            medium: 'social',
                            campaign: generatedTitle || 'agent-post',
                            tracking: true,
                            short: true,
                        },
                    });
                    if (linkRes?.caption) {
                        generatedCaption = linkRes.caption;
                        if (linkRes.platform_captions) {
                            platformCaptions = { ...platformCaptions, ...linkRes.platform_captions };
                        }
                    }
                } catch (linkErr) {
                    console.warn('Agent auto-shorten warning:', linkErr);
                }
            }

            const postDraft = {
                brandId: effectiveBrand.id,
                brandName: effectiveBrand.name,
                title: generatedTitle,
                caption: generatedCaption,
                platformCaptions,
                media: attached,
                selectedAccountIds: targetAccountIds,
                scheduledDate: finalDate,
                scheduledTime: finalTime,
                timezone: timezone || DEFAULT_TIMEZONE,
                isScheduled: false,
                scheduledPostId: null,
            };

            const newMsgId = `agent-${Date.now()}`;
            const agentReply = {
                id: newMsgId,
                role: 'agent',
                text: `✨ Tôi đã soạn xong bài đăng cho **${effectiveBrand.name}** và chuẩn bị lịch vào **${finalTime} ngày ${finalDate}**!\n\n👉 **Xem bản xem trước đa kênh trực tiếp ở cột bên phải** để kiểm tra và bấm **Xác nhận lên lịch ngay**.`,
                createdAt: new Date().toISOString(),
                postDraft,
            };

            setMessages((prev) => [...prev, agentReply]);
            setActiveDraftMessageId(newMsgId);
            setIsEditingCaption(false);
            if (mentionedPlatforms[0]) setActivePlatformTab(mentionedPlatforms[0]);

            if (window.innerWidth < 1024) {
                setMobileTab('preview');
            }
        } catch (err) {
            console.error('Agent error:', err);
            setMessages((prev) => [
                ...prev,
                {
                    id: `agent-error-${Date.now()}`,
                    role: 'agent',
                    text: `Xin lỗi, đã xảy ra lỗi trong quá trình xử lý: ${err.message}. Vui lòng thử lại!`,
                    createdAt: new Date().toISOString(),
                },
            ]);
        } finally {
            setIsAgentThinking(false);
            setThinkingStage('');
        }
    };

    // Update interactive clarification selections inside a chat card
    const updateClarificationField = (messageId, patch) => {
        setMessages((prev) =>
            prev.map((m) =>
                m.id === messageId && m.clarification
                    ? { ...m, clarification: { ...m.clarification, ...patch } }
                    : m
            )
        );
    };

    // User confirms Brand, Social Platforms & Schedule options on Clarification Card
    const handleConfirmClarification = async (messageId) => {
        const targetMsg = messages.find((m) => m.id === messageId);
        const c = targetMsg?.clarification;
        if (!c || c.status === 'confirmed') return;

        const chosenBrand = brands.find((b) => b.id === c.selectedBrandId) || currentBrand;
        if (!chosenBrand) return;

        if (!c.selectedPlatforms || c.selectedPlatforms.length === 0) {
            toast({
                variant: 'destructive',
                title: t('Vui lòng chọn ít nhất 1 mạng xã hội.'),
            });
            return;
        }

        // Sync workspace brand selector if user picked another brand
        if (chosenBrand.id !== selectedBrandId) {
            setSelectedBrandId(chosenBrand.id);
        }

        setMessages((prev) =>
            prev.map((m) =>
                m.id === messageId && m.clarification
                    ? {
                          ...m,
                          clarification: {
                              ...m.clarification,
                              status: 'confirmed',
                              confirmedBrandName: chosenBrand.name,
                          },
                      }
                    : m
            )
        );

        if (c.mode === 'campaign') {
            await handleRunCampaignAutopilot({
                name: c.campaignName,
                driveUrl: c.driveUrl,
                rawData: c.rawData,
                days: c.days,
                frequency: c.frequency,
                autoSchedule: c.autoSchedule,
                brandOverride: chosenBrand,
                platformsOverride: c.selectedPlatforms,
                skipUserEcho: true,
            });
        } else {
            await executeSinglePostDraft({
                userText: c.rawPrompt,
                attached: c.attachedImages || [],
                brandOverride: chosenBrand,
                platformsOverride: c.selectedPlatforms,
                scheduledDate: c.scheduledDate,
                scheduledTime: c.scheduledTime,
            });
        }
    };

    // User submits message -> AI asks clarifying questions (Brand, Social Networks, Mode)
    const handleSendMessage = async () => {
        const userText = inputText.trim();
        const attached = [...selectedImages];

        if (!userText && attached.length === 0) return;
        if (!currentBrand) {
            toast({ variant: 'destructive', title: t('Chưa có thương hiệu nào được chọn.') });
            return;
        }

        const userMsg = {
            id: `user-${Date.now()}`,
            role: 'user',
            text: userText || (attached.length ? `[Đã đính kèm ${attached.length} ảnh]` : ''),
            attachedImages: attached,
            createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInputText('');
        setSelectedImages([]);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        const isCampaign = isCampaignIntent(userText);
        const matchedBrand = detectBrandFromText(userText, brands) || currentBrand;
        const matchedBrandAccounts = accounts.filter(
            (acc) => !acc.brand_id || acc.brand_id === matchedBrand.id
        );
        const availablePlatformsForBrand =
            matchedBrandAccounts.length > 0
                ? [...new Set(matchedBrandAccounts.map((a) => a.platform))]
                : ['facebook', 'instagram', 'threads', 'linkedin'];

        const detectedPlatforms = detectPlatformsFromText(userText);
        const initialPlatforms =
            detectedPlatforms.length > 0 ? detectedPlatforms : availablePlatformsForBrand;

        const parsedCampaign = isCampaign
            ? parseCampaignPromptText(
                  userText,
                  campaignForm.name || `Campaign ${matchedBrand.name}`,
                  campaignForm.driveUrl
              )
            : null;
        const schedule = parseScheduleTime(userText, timezone || DEFAULT_TIMEZONE);

        const clarifyMsg = {
            id: `clarify-${Date.now()}`,
            role: 'agent',
            text: isCampaign
                ? `Tôi đã nhận yêu cầu tạo chiến dịch **"${parsedCampaign.campaignName}"**. Trước khi bắt đầu xào nấu dữ liệu & lên lịch, bạn xác nhận nhanh giúp tôi:`
                : `Tôi đã nhận ý tưởng của bạn! Trước khi soạn thảo, bạn xác nhận giúp tôi vài thông tin nhanh nhé:`,
            createdAt: new Date().toISOString(),
            clarification: {
                mode: isCampaign ? 'campaign' : 'single',
                status: 'pending',
                rawPrompt: userText,
                attachedImages: attached,
                selectedBrandId: matchedBrand.id,
                selectedPlatforms: initialPlatforms,
                autoSchedule: true,
                campaignName: parsedCampaign?.campaignName || '',
                driveUrl: parsedCampaign?.driveUrl || '',
                rawData: parsedCampaign?.rawData || userText,
                days: parsedCampaign?.days || campaignForm.days,
                frequency: campaignForm.frequency,
                scheduledDate: schedule.date,
                scheduledTime: schedule.time,
            },
        };

        setMessages((prev) => [...prev, clarifyMsg]);
    };

    // Confirm and schedule post
    const handleConfirmSchedule = async (messageId) => {
        const msgIndex = messages.findIndex((m) => m.id === messageId);
        if (msgIndex === -1) return;

        const draft = messages[msgIndex].postDraft;
        if (!draft) return;

        // Update state to saving
        setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, postDraft: { ...m.postDraft, isSaving: true, error: null } } : m))
        );

        try {
            const scheduledAtIso = toUtcIso(draft.scheduledDate, draft.scheduledTime, draft.timezone);
            if (!scheduledAtIso) throw new Error('Ngày hoặc giờ lên lịch không hợp lệ.');

            let effectiveCaption = draft.caption;
            let effectivePlatformCaptions = draft.platformCaptions || {};
            const targetBrandId = draft.brandId || currentBrand.id;
            const pref = getShortlinkPreference();
            if (pref === 'always' && /https?:\/\/[^\s]+/i.test(effectiveCaption) && !/(?:\/api\/links\/go\/|\/s\/[a-zA-Z0-9_-]+)/i.test(effectiveCaption)) {
                try {
                    const linkRes = await appClient.links.build({
                        brand_id: targetBrandId,
                        form: { caption: effectiveCaption, platform_captions: effectivePlatformCaptions },
                        options: { medium: 'social', campaign: draft.title || 'agent-post', tracking: true, short: true },
                    });
                    if (linkRes?.caption) {
                        effectiveCaption = linkRes.caption;
                        effectivePlatformCaptions = linkRes.platform_captions || effectivePlatformCaptions;
                    }
                } catch (linkErr) {
                    console.warn('Agent confirm auto-shorten warning:', linkErr);
                }
            }

            const allowedPlatforms = ['facebook', 'instagram', 'threads', 'tiktok', 'linkedin'];
            const payload = {
                brand_id: targetBrandId,
                title: draft.title.trim(),
                caption: effectiveCaption,
                platform_captions: Object.fromEntries(
                    Object.entries(effectivePlatformCaptions).filter(
                        ([k, c]) => allowedPlatforms.includes(k) && c && c.trim()
                    )
                ),
                destination_settings: {},
                media_ids: (draft.media || []).map((m) => m.id),
                platform_media_ids: {},
                account_ids: draft.selectedAccountIds,
                pillar_id: '',
                angle_id: '',
                timezone: draft.timezone,
                scheduled_at: scheduledAtIso,
                status: draft.selectedAccountIds?.length > 0 ? 'scheduled' : 'draft',
                is_demo: demoMode,
            };

            // Save post plan to backend
            const saved = await appClient.posts.save({ data: payload });

            // Arm publishing queue if not demo and accounts exist
            if (!demoMode && draft.selectedAccountIds.length > 0) {
                try {
                    const review = await appClient.publishing.prepareSchedule(saved.id, scheduledAtIso, draft.timezone);
                    if (review?.attemptId) {
                        await appClient.publishing.schedule(review.attemptId);
                    }
                } catch (queueErr) {
                    console.warn('Queue scheduling warning:', queueErr);
                }
            }

            toast({
                title: t('Lên lịch bài đăng thành công!'),
                description: t(`Đã lên lịch lúc ${draft.scheduledTime} ngày ${draft.scheduledDate}.`),
            });

            // Mark postDraft as scheduled
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === messageId
                        ? {
                              ...m,
                              postDraft: {
                                  ...m.postDraft,
                                  isSaving: false,
                                  isScheduled: true,
                                  scheduledPostId: saved.id,
                              },
                          }
                        : m
                )
            );
        } catch (err) {
            toast({ variant: 'destructive', title: t('Không thể lên lịch bài đăng'), description: err.message });
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === messageId ? { ...m, postDraft: { ...m.postDraft, isSaving: false, error: err.message } } : m
                )
            );
        }
    };

    // Update draft fields within card
    const updateDraftField = (messageId, key, value) => {
        setMessages((prev) =>
            prev.map((m) => {
                if (m.id !== messageId || !m.postDraft) return m;
                return {
                    ...m,
                    postDraft: {
                        ...m.postDraft,
                        [key]: value,
                    },
                };
            })
        );
    };

    // Toggle account selection for draft
    const toggleAccountSelection = (messageId, accountId) => {
        setMessages((prev) =>
            prev.map((m) => {
                if (m.id !== messageId || !m.postDraft) return m;
                const current = m.postDraft.selectedAccountIds || [];
                const updated = current.includes(accountId)
                    ? current.filter((id) => id !== accountId)
                    : [...current, accountId];
                return {
                    ...m,
                    postDraft: {
                        ...m.postDraft,
                        selectedAccountIds: updated,
                    },
                };
            })
        );
    };

    // Get current caption to display in preview based on active platform tab
    const currentPreviewCaption = useMemo(() => {
        if (!activeDraftMessage?.postDraft) return '';
        const draft = activeDraftMessage.postDraft;
        return draft.platformCaptions?.[activePlatformTab] || draft.caption || '';
    }, [activeDraftMessage, activePlatformTab]);

    return (
        <div className="w-full space-y-5">
            {/* Đầu trang Clean Studio */}
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-dark bg-brand text-brand-ink">
                        <Sparkle size={20} weight="duotone" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="truncate font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                                {t('AI Agent Lên lịch')}
                            </h1>
                            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/25">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                <span>Online</span>
                            </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {t('Trợ lý điều phối chiến dịch, xào nấu nội dung Google Drive và tự động lên lịch đa kênh.')}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {brands.length > 0 && (
                        <div className="relative">
                            <select
                                aria-label={t('Chọn thương hiệu')}
                                value={currentBrand?.id || ''}
                                onChange={(e) => setSelectedBrandId(e.target.value)}
                                className="h-9 min-h-[36px] cursor-pointer appearance-none rounded-xl border border-border bg-card pl-3 pr-8 text-xs font-medium text-foreground focus:border-brand-dark focus:outline-none"
                            >
                                {brands.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                            <CaretDown
                                size={13}
                                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                            />
                        </div>
                    )}

                    <div className="inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground">
                        <PlugsConnected size={15} weight="duotone" className="text-brand-ink" />
                        <span className="tabular-nums font-semibold">{brandAccounts.length}</span>
                        <span className="text-muted-foreground">{t('kênh')}</span>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowCampaignBuilder(true)}
                        className="btn-skew min-h-9 shrink-0 whitespace-nowrap cursor-pointer"
                    >
                        <HardDrives size={15} weight="bold" />
                        <span>{t('Tạo Campaign + Drive')}</span>
                    </button>
                </div>
            </header>

            {/* Mobile Tab Switcher (< lg) */}
            <div className="flex rounded-xl border border-border bg-zinc-100 p-1 lg:hidden">
                <button
                    type="button"
                    onClick={() => setMobileTab('chat')}
                    className={`flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition-colors ${
                        mobileTab === 'chat'
                            ? 'bg-brand text-brand-ink'
                            : 'text-zinc-700 hover:text-foreground'
                    }`}
                >
                    <ChatCircleDots size={15} weight="bold" />
                    <span>{t('Hội thoại')} ({messages.length})</span>
                </button>
                <button
                    type="button"
                    onClick={() => setMobileTab('preview')}
                    className={`flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition-colors ${
                        mobileTab === 'preview'
                            ? 'bg-brand text-brand-ink'
                            : 'text-zinc-700 hover:text-foreground'
                    }`}
                >
                    <Eye size={15} weight="bold" />
                    <span>{t('Xem trước trực quan')}</span>
                    {activeDraftMessage && (
                        <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                    )}
                </button>
            </div>

            {/* 2-COLUMN SPLIT-SCREEN COPILOT STUDIO */}
            <div className="grid grid-cols-1 gap-5 lg:h-[calc(100vh-11.5rem)] lg:min-h-[620px] lg:grid-cols-12">
                {/* CỘT TRÁI: LUỒNG TRAO ĐỔI & PROMPT DOCK */}
                <section
                    className={`panel flex min-w-0 flex-col overflow-hidden lg:col-span-6 ${
                        mobileTab === 'chat' ? 'flex h-[75vh] lg:h-full' : 'hidden lg:flex lg:h-full'
                    }`}
                >
                    {/* Subheader */}
                    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-zinc-50/70 px-4 py-3 sm:px-5">
                        <div className="flex min-w-0 items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-ink">
                                <ChatCircleDots size={15} weight="duotone" />
                            </span>
                            <h2 className="truncate font-heading text-sm font-semibold text-foreground">
                                {t('Luồng trao đổi với Agent')}
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowCampaignBuilder(true)}
                            className="inline-flex min-h-8 shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-zinc-100"
                        >
                            <HardDrives size={13} weight="bold" className="text-brand-ink" />
                            <span>{t('+ Campaign Drive')}</span>
                        </button>
                    </div>

                    {/* Scrollable Message Stream */}
                    <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {msg.role === 'agent' && (
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-brand-dark bg-brand text-brand-ink">
                                        <Sparkle size={16} weight="bold" />
                                    </div>
                                )}

                                <div
                                    className={`flex max-w-[90%] flex-col space-y-2.5 sm:max-w-[85%] ${
                                        msg.role === 'user' ? 'items-end' : 'items-start'
                                    }`}
                                >
                                    {/* Message Bubble */}
                                    <div
                                        className={`rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-line ${
                                            msg.role === 'user'
                                                ? 'rounded-tr-sm bg-zinc-900 text-white font-normal'
                                                : 'rounded-tl-sm border border-border bg-zinc-50/80 text-foreground'
                                        }`}
                                    >
                                        {renderFormattedText(msg.text, msg.role === 'user')}

                                        {msg.attachedImages?.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {msg.attachedImages.map((img, i) => (
                                                    <div
                                                        key={i}
                                                        className="relative h-16 w-16 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800"
                                                    >
                                                        <img
                                                            src={img.url}
                                                            alt={img.name || 'image'}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Interactive Clarification Card */}
                                    {msg.clarification && (() => {
                                        const c = msg.clarification;
                                        const isConfirmed = c.status === 'confirmed';
                                        const chosenBrandAccounts = accounts.filter(
                                            (acc) => !acc.brand_id || acc.brand_id === c.selectedBrandId
                                        );
                                        const brandPlatformList =
                                            chosenBrandAccounts.length > 0
                                                ? [...new Set(chosenBrandAccounts.map((a) => a.platform))]
                                                : [];
                                        const displayPlatforms = [...new Set([...brandPlatformList, ...CLARIFICATION_PLATFORMS])];

                                        return (
                                            <div className="w-full space-y-3 rounded-xl border border-brand-dark/40 bg-brand-50/70 p-3.5">
                                                {/* 1. Brand Selection */}
                                                <div className="space-y-1.5">
                                                    <div className="text-xs font-semibold text-foreground">
                                                        {t('1. Chọn thương hiệu')}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {brands.map((b) => {
                                                            const selected = c.selectedBrandId === b.id;
                                                            return (
                                                                <button
                                                                    key={b.id}
                                                                    type="button"
                                                                    disabled={isConfirmed}
                                                                    onClick={() => {
                                                                        const nextAccs = accounts.filter(
                                                                            (acc) => !acc.brand_id || acc.brand_id === b.id
                                                                        );
                                                                        const nextPlats =
                                                                            nextAccs.length > 0
                                                                                ? [...new Set(nextAccs.map((a) => a.platform))]
                                                                                : c.selectedPlatforms;
                                                                        updateClarificationField(msg.id, {
                                                                            selectedBrandId: b.id,
                                                                            selectedPlatforms: nextPlats,
                                                                        });
                                                                    }}
                                                                    className={`inline-flex min-h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
                                                                        selected
                                                                            ? 'border-brand-dark bg-brand text-brand-ink font-semibold'
                                                                            : 'border-border bg-card text-foreground hover:bg-zinc-100'
                                                                    } ${isConfirmed ? 'cursor-default opacity-75' : 'cursor-pointer'}`}
                                                                >
                                                                    {selected && <Check size={12} weight="bold" />}
                                                                    <span>{b.name}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* 2. Platform Selection */}
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs font-semibold text-foreground">
                                                            {t('2. Chọn mạng xã hội')}
                                                        </span>
                                                        {!isConfirmed && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    updateClarificationField(msg.id, {
                                                                        selectedPlatforms:
                                                                            c.selectedPlatforms.length === displayPlatforms.length
                                                                                ? []
                                                                                : displayPlatforms,
                                                                    })
                                                                }
                                                                className="cursor-pointer text-xs font-semibold text-brand-ink hover:underline"
                                                            >
                                                                {c.selectedPlatforms.length === displayPlatforms.length
                                                                    ? t('Bỏ chọn tất cả')
                                                                    : t('Chọn tất cả')}
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {displayPlatforms.map((plat) => {
                                                            const selected = c.selectedPlatforms.includes(plat);
                                                            const label = PLATFORM_CONFIG[plat]?.label || plat.toUpperCase();
                                                            return (
                                                                <button
                                                                    key={plat}
                                                                    type="button"
                                                                    disabled={isConfirmed}
                                                                    onClick={() => {
                                                                        const next = selected
                                                                            ? c.selectedPlatforms.filter((p) => p !== plat)
                                                                            : [...c.selectedPlatforms, plat];
                                                                        updateClarificationField(msg.id, {
                                                                            selectedPlatforms: next,
                                                                        });
                                                                    }}
                                                                    className={`inline-flex min-h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
                                                                        selected
                                                                            ? 'border-brand-dark bg-card text-foreground ring-1 ring-brand-dark font-semibold'
                                                                            : 'border-border bg-card/70 text-muted-foreground hover:bg-card'
                                                                    } ${isConfirmed ? 'cursor-default opacity-75' : 'cursor-pointer'}`}
                                                                >
                                                                    {selected && (
                                                                        <Check size={12} weight="bold" className="text-emerald-600" />
                                                                    )}
                                                                    <span>{label}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* 3. Schedule Preference */}
                                                {c.mode === 'campaign' ? (
                                                    <div className="border-t border-brand-dark/25 pt-2">
                                                        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
                                                            <input
                                                                type="checkbox"
                                                                disabled={isConfirmed}
                                                                checked={c.autoSchedule}
                                                                onChange={(e) =>
                                                                    updateClarificationField(msg.id, {
                                                                        autoSchedule: e.target.checked,
                                                                    })
                                                                }
                                                                className="rounded border-border text-brand-ink"
                                                            />
                                                            <span>
                                                                {t('Tự động lên lịch {days} ngày ngay sau khi xào nấu', {
                                                                    days: c.days,
                                                                })}
                                                            </span>
                                                        </label>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-wrap items-center gap-2 border-t border-brand-dark/25 pt-2">
                                                        <span className="text-xs font-semibold text-foreground">
                                                            {t('3. Thời gian dự kiến:')}
                                                        </span>
                                                        <input
                                                            type="date"
                                                            disabled={isConfirmed}
                                                            value={c.scheduledDate}
                                                            onChange={(e) =>
                                                                updateClarificationField(msg.id, {
                                                                    scheduledDate: e.target.value,
                                                                })
                                                            }
                                                            className="min-h-[34px] rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground"
                                                        />
                                                        <input
                                                            type="time"
                                                            disabled={isConfirmed}
                                                            value={c.scheduledTime}
                                                            onChange={(e) =>
                                                                updateClarificationField(msg.id, {
                                                                    scheduledTime: e.target.value,
                                                                })
                                                            }
                                                            className="min-h-[34px] rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground"
                                                        />
                                                    </div>
                                                )}

                                                {/* Confirm Action */}
                                                <div className="flex items-center justify-end gap-2 pt-1">
                                                    {isConfirmed ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/25">
                                                            <CheckCircle size={13} weight="bold" />
                                                            <span>
                                                                {t('Đã xác nhận')} ({c.confirmedBrandName} · {c.selectedPlatforms.length} {t('kênh')})
                                                            </span>
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleConfirmClarification(msg.id)}
                                                            className="btn-skew min-h-9 cursor-pointer whitespace-nowrap"
                                                        >
                                                            <Sparkle size={14} weight="bold" />
                                                            <span>
                                                                {c.mode === 'campaign'
                                                                    ? t('Xác nhận & Tạo Campaign ngay')
                                                                    : t('Xác nhận & Soạn bài ngay')}
                                                            </span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Compact Single Post Draft Summary Card */}
                                    {msg.postDraft && (
                                        <div
                                            onClick={() => {
                                                setActiveDraftMessageId(msg.id);
                                                if (window.innerWidth < 1024) setMobileTab('preview');
                                            }}
                                            className={`w-full cursor-pointer space-y-2 rounded-xl border p-3.5 transition-colors ${
                                                activeDraftMessageId === msg.id ||
                                                (!activeDraftMessageId && msg.id === activeDraftMessage?.id)
                                                    ? 'border-brand-dark bg-brand-50/50 ring-1 ring-brand-dark'
                                                    : 'border-border bg-card hover:border-zinc-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="flex min-w-0 items-center gap-1.5 truncate text-xs font-semibold text-foreground">
                                                    <CalendarBlank size={15} weight="duotone" className="shrink-0 text-brand-ink" />
                                                    <span className="truncate">
                                                        {msg.postDraft.title || t('Bản thảo bài viết')}
                                                    </span>
                                                </span>
                                                {msg.postDraft.isScheduled ? (
                                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/25">
                                                        <CheckCircle size={12} weight="bold" />
                                                        <span>{t('Đã lên lịch')}</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-brand-dark/30 bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-ink">
                                                        <Clock size={12} weight="bold" />
                                                        <span>
                                                            {msg.postDraft.scheduledTime} · {msg.postDraft.scheduledDate}
                                                        </span>
                                                    </span>
                                                )}
                                            </div>

                                            <p className="line-clamp-2 text-xs text-muted-foreground">
                                                {msg.postDraft.caption}
                                            </p>

                                            <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
                                                <span className="text-muted-foreground">
                                                    {msg.postDraft.selectedAccountIds?.length || 0} {t('kênh đã chọn')}
                                                </span>
                                                <span className="font-semibold text-foreground hover:underline">
                                                    {t('Xem & Tinh chỉnh →')}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Compact Campaign Summary Card */}
                                    {msg.campaignDraft && (
                                        <div
                                            onClick={() => {
                                                setActiveDraftMessageId(msg.id);
                                                if (window.innerWidth < 1024) setMobileTab('preview');
                                            }}
                                            className={`w-full cursor-pointer space-y-2 rounded-xl border p-3.5 transition-colors ${
                                                activeDraftMessageId === msg.id ||
                                                (!activeDraftMessageId && msg.id === activeDraftMessage?.id)
                                                    ? 'border-brand-dark bg-brand-50/50 ring-1 ring-brand-dark'
                                                    : 'border-border bg-card hover:border-zinc-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="flex min-w-0 items-center gap-1.5 truncate text-xs font-semibold text-foreground">
                                                    <Stack size={15} weight="duotone" className="shrink-0 text-brand-ink" />
                                                    <span className="truncate">{msg.campaignDraft.campaignName}</span>
                                                </span>
                                                {msg.campaignDraft.isScheduled ? (
                                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/25">
                                                        <CheckCircle size={12} weight="bold" />
                                                        <span>
                                                            {t('Đã lên lịch')} {msg.campaignDraft.posts?.length || 0} {t('bài')}
                                                        </span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-brand-dark/30 bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-ink">
                                                        <Clock size={12} weight="bold" />
                                                        <span>
                                                            {msg.campaignDraft.posts?.length || 0} {t('bài chờ duyệt')}
                                                        </span>
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 font-medium text-foreground">
                                                    <HardDrives size={12} weight="bold" />
                                                    Drive: {msg.campaignDraft.driveAssetsCount} {t('ảnh')}
                                                </span>
                                                <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 font-medium text-foreground">
                                                    <CalendarBlank size={12} weight="bold" />
                                                    {msg.campaignDraft.days} {t('ngày')}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
                                                <span className="text-muted-foreground">
                                                    {t('Đã xào nấu tự động đa kênh')}
                                                </span>
                                                <span className="font-semibold text-foreground hover:underline">
                                                    {t('Quản lý lịch Campaign →')}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Agent Thinking Indicator */}
                        {isAgentThinking && (
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-brand-dark bg-brand text-brand-ink">
                                    <Sparkle size={16} weight="bold" />
                                </div>
                                <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-xs text-foreground">
                                    <span className="h-2 w-2 rounded-full bg-brand animate-bounce [animation-delay:-0.3s]" />
                                    <span className="h-2 w-2 rounded-full bg-brand animate-bounce [animation-delay:-0.15s]" />
                                    <span className="h-2 w-2 rounded-full bg-brand animate-bounce" />
                                    <span className="ml-1 font-medium">
                                        {thinkingStage || t('AI Agent đang soạn thảo & tối ưu lịch đăng…')}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div ref={chatEndRef} />
                    </div>

                    {/* Prompt Input Dock */}
                    <div className="shrink-0 space-y-2.5 border-t border-border bg-card p-3.5 sm:p-4">
                        {/* AI Model Selector */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground">
                                    <Cpu size={14} weight="bold" className="text-foreground" />
                                    <span>{t('Model AI:')}</span>
                                </span>
                                {aiSettings.configured ? (
                                    <div className="flex min-w-0 max-w-sm flex-1 items-center gap-1.5">
                                        <span className="shrink-0 rounded-md border border-border bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-foreground">
                                            {aiSettings.provider === 'gemini'
                                                ? 'Gemini'
                                                : aiSettings.provider === 'openrouter'
                                                ? 'OpenRouter'
                                                : 'OpenAI'}
                                        </span>
                                        <div className="relative min-w-0 flex-1">
                                            <select
                                                aria-label={t('Chọn model AI')}
                                                value={aiSettings.model}
                                                disabled={savingAiModel || aiModelsLoading}
                                                onChange={(e) => handleChangeAiModel(e.target.value)}
                                                className="h-8 w-full cursor-pointer appearance-none truncate rounded-lg border border-border bg-zinc-50 pl-2.5 pr-7 text-xs font-medium text-foreground focus:border-brand-dark focus:outline-none"
                                            >
                                                {availableAiModelOptions.map((m) => (
                                                    <option key={m.id} value={m.id}>
                                                        {m.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <CaretDown
                                                size={12}
                                                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <span className="truncate text-xs text-muted-foreground">
                                        {t('Chưa cấu hình AI Key trong Settings')}
                                    </span>
                                )}
                            </div>

                            <Link
                                to="/settings"
                                className="inline-flex min-h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-zinc-100"
                            >
                                <span>{aiSettings.configured ? t('Cài đặt AI') : t('Cấu hình ngay')}</span>
                                <ArrowSquareOut size={12} />
                            </Link>
                        </div>

                        {/* Pending Images Strip */}
                        {selectedImages.length > 0 && (
                            <div className="flex items-center gap-2 overflow-x-auto py-1">
                                {selectedImages.map((img, idx) => (
                                    <div
                                        key={idx}
                                        className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-zinc-100"
                                    >
                                        <img src={img.url} alt="attached" className="h-full w-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeSelectedImage(idx)}
                                            className="absolute right-1 top-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-black/80 text-white opacity-0 transition-opacity group-hover:opacity-100"
                                        >
                                            <X size={10} weight="bold" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Prompt Input Container */}
                        <div className="flex items-center gap-2 rounded-xl border border-border bg-zinc-50/70 p-2 transition-colors focus-within:border-brand-dark focus-within:bg-card focus-within:ring-1 focus-within:ring-brand-dark">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleFileSelect}
                            />

                            <button
                                type="button"
                                disabled={isUploading || isAgentThinking}
                                onClick={() => fileInputRef.current?.click()}
                                title={t('Đính kèm hình ảnh')}
                                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-foreground disabled:opacity-40"
                            >
                                {isUploading ? (
                                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
                                ) : (
                                    <ImageIcon size={18} />
                                )}
                            </button>

                            <textarea
                                ref={textareaRef}
                                rows={1}
                                value={inputText}
                                onChange={handleInputChange}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder={t('Nhập yêu cầu hoặc dán link Drive…')}
                                className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent px-1.5 py-2 text-xs leading-snug text-foreground placeholder:text-muted-foreground focus:outline-none"
                            />

                            <button
                                type="button"
                                disabled={(!inputText.trim() && selectedImages.length === 0) || isAgentThinking}
                                onClick={handleSendMessage}
                                aria-label={t('Gửi yêu cầu')}
                                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-brand-dark bg-brand text-brand-ink transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <PaperPlaneRight size={16} weight="bold" />
                            </button>
                        </div>
                    </div>
                </section>

                {/* CỘT PHẢI: XEM TRƯỚC TRỰC QUAN & ĐIỀU PHỐI LỊCH */}
                <section
                    className={`panel flex min-w-0 flex-col overflow-hidden lg:col-span-6 ${
                        mobileTab === 'preview' ? 'flex h-[75vh] lg:h-full' : 'hidden lg:flex lg:h-full'
                    }`}
                >
                    {activeDraftMessage?.campaignDraft ? (
                        <>
                            {/* Campaign Preview Header */}
                            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-zinc-50/70 px-4 py-3 sm:px-5">
                                <div className="flex min-w-0 items-center gap-2.5">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-brand-dark bg-brand text-brand-ink">
                                        <Stack size={16} weight="bold" />
                                    </span>
                                    <div className="min-w-0">
                                        <h2 className="truncate font-heading text-sm font-semibold text-foreground">
                                            {activeDraftMessage.campaignDraft.campaignName}
                                        </h2>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="inline-flex items-center gap-1 truncate">
                                                <HardDrives size={12} weight="bold" />
                                                {activeDraftMessage.campaignDraft.driveAssetsCount} {t('ảnh Drive')}
                                            </span>
                                            <span>·</span>
                                            <span>
                                                {activeDraftMessage.campaignDraft.posts.length} {t('bài viết')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {activeDraftMessage.campaignDraft.isScheduled ? (
                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/25">
                                        <CheckCircle size={13} weight="bold" />
                                        <span>
                                            {t('Đã lên lịch')} ({activeDraftMessage.campaignDraft.posts.length})
                                        </span>
                                    </span>
                                ) : (
                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-brand-dark/40 bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-ink">
                                        <Clock size={13} weight="bold" />
                                        <span>
                                            {t('Chờ duyệt')} ({activeDraftMessage.campaignDraft.posts.length})
                                        </span>
                                    </span>
                                )}
                            </div>

                            {/* Scrollable Campaign Posts Timeline */}
                            <div className="flex-1 space-y-3.5 overflow-y-auto p-4 sm:p-5">
                                {/* Drive Banner */}
                                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-zinc-50/70 p-3 text-xs">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <FolderOpen size={16} weight="bold" className="shrink-0 text-foreground" />
                                        <span className="truncate text-muted-foreground">
                                            {t('Nguồn Drive:')}{' '}
                                            <strong className="text-foreground">
                                                {activeDraftMessage.campaignDraft.driveUrl}
                                            </strong>
                                        </span>
                                    </div>
                                    <Link
                                        to="/media"
                                        className="inline-flex shrink-0 items-center gap-1 font-semibold text-foreground hover:underline"
                                    >
                                        <span>{t('Thư viện Drive')}</span>
                                        <ArrowSquareOut size={12} />
                                    </Link>
                                </div>

                                {/* Timeline Cards */}
                                <div className="space-y-3">
                                    {activeDraftMessage.campaignDraft.posts.map((postItem, idx) => {
                                        const isExpanded = selectedCampaignPostId === postItem.id;
                                        return (
                                            <div
                                                key={postItem.id}
                                                className={`space-y-3 rounded-2xl border p-3.5 transition-colors ${
                                                    isExpanded
                                                        ? 'border-brand-dark bg-brand-50/20'
                                                        : 'border-border bg-card hover:border-zinc-300'
                                                }`}
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="rounded-lg bg-brand px-2 py-0.5 text-xs font-semibold text-brand-ink">
                                                            #{idx + 1} · {t('Ngày')} {postItem.dayIndex}
                                                        </span>
                                                        <input
                                                            type="date"
                                                            value={postItem.date}
                                                            onChange={(e) =>
                                                                updateCampaignPostField(
                                                                    activeDraftMessage.id,
                                                                    postItem.id,
                                                                    'date',
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="min-h-[34px] rounded-lg border border-border bg-zinc-50 px-2 text-xs font-medium text-foreground"
                                                        />
                                                        <input
                                                            type="time"
                                                            value={postItem.time}
                                                            onChange={(e) =>
                                                                updateCampaignPostField(
                                                                    activeDraftMessage.id,
                                                                    postItem.id,
                                                                    'time',
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="min-h-[34px] rounded-lg border border-border bg-zinc-50 px-2 text-xs font-medium text-foreground"
                                                        />
                                                        <span className="rounded-md border border-border bg-zinc-100 px-2 py-0.5 text-xs font-semibold uppercase text-foreground">
                                                            {postItem.platform}
                                                        </span>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        {postItem.isScheduled && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/25">
                                                                <CheckCircle size={11} weight="bold" />
                                                                <span>{t('Đã hẹn giờ')}</span>
                                                            </span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setPreviewCampaignPost({
                                                                    messageId: activeDraftMessage.id,
                                                                    postId: postItem.id,
                                                                    index: idx,
                                                                })
                                                            }
                                                            className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground hover:bg-zinc-100"
                                                        >
                                                            <Eye size={13} weight="bold" />
                                                            <span>{t('Xem')}</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleRegenerateCampaignPost(
                                                                    activeDraftMessage.id,
                                                                    postItem
                                                                )
                                                            }
                                                            className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground hover:bg-zinc-100"
                                                        >
                                                            <ArrowsClockwise size={13} weight="bold" />
                                                            <span>{t('Xào nấu lại')}</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setSelectedCampaignPostId(isExpanded ? null : postItem.id)
                                                            }
                                                            className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground hover:bg-zinc-100"
                                                        >
                                                            <PencilSimple size={13} weight="bold" />
                                                            <span>{isExpanded ? t('Thu gọn') : t('Sửa')}</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                removeCampaignPost(activeDraftMessage.id, postItem.id)
                                                            }
                                                            title={t('Xóa bài này')}
                                                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                                                        >
                                                            <Trash size={13} weight="bold" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-3">
                                                    {postItem.asset?.file_url && (
                                                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-zinc-100">
                                                            <img
                                                                src={postItem.asset.file_url}
                                                                alt={postItem.asset.name || 'Drive image'}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 flex-1 space-y-1">
                                                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                                            <span className="font-semibold text-foreground">
                                                                {postItem.pillar?.name}
                                                            </span>
                                                            <span>·</span>
                                                            <span>{postItem.angle?.name}</span>
                                                        </div>
                                                        <div className="break-words text-xs font-semibold text-foreground">
                                                            {postItem.title}
                                                        </div>
                                                        {!isExpanded && (
                                                            <p className="line-clamp-2 whitespace-pre-line text-xs text-muted-foreground">
                                                                {postItem.caption}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {isExpanded && (
                                                    <div className="space-y-2.5 border-t border-border pt-2.5">
                                                        <div>
                                                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                                                {t('Tiêu đề bài đăng')}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={postItem.title}
                                                                onChange={(e) =>
                                                                    updateCampaignPostField(
                                                                        activeDraftMessage.id,
                                                                        postItem.id,
                                                                        'title',
                                                                        e.target.value
                                                                    )
                                                                }
                                                                className="h-9 w-full rounded-lg border border-border bg-zinc-50 px-3 text-xs font-medium text-foreground"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                                                {t('Nội dung Caption')}
                                                            </label>
                                                            <textarea
                                                                rows={4}
                                                                value={postItem.caption}
                                                                onChange={(e) =>
                                                                    updateCampaignPostField(
                                                                        activeDraftMessage.id,
                                                                        postItem.id,
                                                                        'caption',
                                                                        e.target.value
                                                                    )
                                                                }
                                                                className="w-full resize-none rounded-lg border border-border bg-card p-2.5 text-xs leading-relaxed text-foreground"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Campaign Footer Action Bar */}
                            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-zinc-50/70 p-4">
                                {activeDraftMessage.campaignDraft.isScheduled ? (
                                    <>
                                        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                                            <CheckCircle size={16} weight="bold" />
                                            <span>
                                                {t('Đã lên lịch toàn bộ')} {activeDraftMessage.campaignDraft.posts.length} {t('bài viết!')}
                                            </span>
                                        </span>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                disabled={activeDraftMessage.campaignDraft.isSaving}
                                                onClick={() => scheduleCampaignPosts(activeDraftMessage.id)}
                                                className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-zinc-100"
                                            >
                                                <ArrowsClockwise size={14} weight="bold" />
                                                <span>{t('Cập nhật lại lịch')}</span>
                                            </button>
                                            <Link to="/calendar" className="btn-skew min-h-9 whitespace-nowrap">
                                                <CalendarBlank size={15} weight="bold" />
                                                <span>{t('Xem trên Lịch')}</span>
                                            </Link>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-xs text-muted-foreground">
                                            {t('Tạo')} {activeDraftMessage.campaignDraft.posts.length}{' '}
                                            {t('bài đăng & đẩy vào hàng đợi xuất bản')}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={
                                                activeDraftMessage.campaignDraft.isSaving ||
                                                activeDraftMessage.campaignDraft.posts.length === 0
                                            }
                                            onClick={() => scheduleCampaignPosts(activeDraftMessage.id)}
                                            className="btn-skew min-h-10 shrink-0 whitespace-nowrap cursor-pointer disabled:opacity-40"
                                        >
                                            <CheckCircle size={16} weight="duotone" />
                                            <span>
                                                {activeDraftMessage.campaignDraft.isSaving
                                                    ? t('Đang setup lịch…')
                                                    : t('Setup lịch tự động ({n} bài)', {
                                                          n: activeDraftMessage.campaignDraft.posts.length,
                                                      })}
                                            </span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </>
                    ) : activeDraftMessage?.postDraft ? (
                        <>
                            {/* Single Post Preview Header */}
                            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-zinc-50/70 px-4 py-3 sm:px-5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-semibold text-muted-foreground">
                                        {t('Xem trước:')}
                                    </span>
                                    <div className="flex items-center rounded-xl border border-border bg-card p-0.5">
                                        {PLATFORM_TABS.map((tab) => {
                                            const Icon = tab.icon;
                                            const isActive = activePlatformTab === tab.key;
                                            return (
                                                <button
                                                    key={tab.key}
                                                    type="button"
                                                    onClick={() => setActivePlatformTab(tab.key)}
                                                    className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-xs font-medium transition-colors ${
                                                        isActive
                                                            ? 'bg-brand font-semibold text-brand-ink'
                                                            : 'text-muted-foreground hover:text-foreground'
                                                    }`}
                                                >
                                                    <Icon
                                                        size={14}
                                                        weight="bold"
                                                        className={isActive ? 'text-brand-ink' : tab.color}
                                                    />
                                                    <span>{tab.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {activeDraftMessage.postDraft.isScheduled ? (
                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/25">
                                        <CheckCircle size={13} weight="bold" />
                                        <span>{t('Đã xếp lịch đăng')}</span>
                                    </span>
                                ) : (
                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-brand-dark/30 bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-ink">
                                        <Clock size={13} weight="bold" />
                                        <span>
                                            {activeDraftMessage.postDraft.scheduledTime} ·{' '}
                                            {activeDraftMessage.postDraft.scheduledDate}
                                        </span>
                                    </span>
                                )}
                            </div>

                            {/* Single Post Live Mockup Content */}
                            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
                                <div className="space-y-3.5 rounded-2xl border border-border bg-card p-4 sm:p-5">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold uppercase text-brand-ink">
                                                {currentBrand?.name ? currentBrand.name.slice(0, 2) : 'SC'}
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-foreground">
                                                    {currentBrand?.name || 'Socialchoice Brand'}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {t('Lên lịch bởi AI Agent')} · {activeDraftMessage.postDraft.scheduledTime}
                                                </div>
                                            </div>
                                        </div>

                                        {(() => {
                                            const currentTabConfig =
                                                PLATFORM_TABS.find((tTab) => tTab.key === activePlatformTab) ||
                                                PLATFORM_TABS[0];
                                            const TabIcon = currentTabConfig.icon;
                                            return (
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${currentTabConfig.badgeClass}`}
                                                >
                                                    <TabIcon size={12} weight="bold" />
                                                    <span>{currentTabConfig.label}</span>
                                                </span>
                                            );
                                        })()}
                                    </div>

                                    <input
                                        type="text"
                                        disabled={activeDraftMessage.postDraft.isScheduled}
                                        value={activeDraftMessage.postDraft.title}
                                        onChange={(e) =>
                                            updateDraftField(activeDraftMessage.id, 'title', e.target.value)
                                        }
                                        placeholder={t('Tiêu đề nội bộ bài viết…')}
                                        className="h-9 w-full rounded-xl border border-border bg-zinc-50/70 px-3 text-xs font-medium text-foreground focus:border-brand-dark focus:outline-none disabled:opacity-75"
                                    />

                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-semibold text-muted-foreground">
                                                {t('Nội dung')} ({activePlatformTab})
                                            </span>
                                            <div className="flex items-center gap-2.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsEditingCaption(!isEditingCaption)}
                                                    className="inline-flex cursor-pointer items-center gap-1 font-semibold text-foreground hover:underline"
                                                >
                                                    <PencilSimple size={12} />
                                                    <span>{isEditingCaption ? t('Xong') : t('Chỉnh sửa')}</span>
                                                </button>
                                                <span className="tabular-nums text-muted-foreground">
                                                    {currentPreviewCaption.length} {t('ký tự')}
                                                </span>
                                            </div>
                                        </div>

                                        {isEditingCaption ? (
                                            <textarea
                                                rows={5}
                                                disabled={activeDraftMessage.postDraft.isScheduled}
                                                value={
                                                    activeDraftMessage.postDraft.platformCaptions?.[
                                                        activePlatformTab
                                                    ] ?? activeDraftMessage.postDraft.caption
                                                }
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    const existing =
                                                        activeDraftMessage.postDraft.platformCaptions || {};
                                                    updateDraftField(activeDraftMessage.id, 'platformCaptions', {
                                                        ...existing,
                                                        [activePlatformTab]: newVal,
                                                    });
                                                }}
                                                className="w-full resize-none rounded-xl border border-border bg-card p-3 text-xs leading-relaxed text-foreground focus:border-brand-dark focus:outline-none"
                                            />
                                        ) : (
                                            <div className="whitespace-pre-line rounded-xl border border-border bg-zinc-50/70 p-3.5 text-xs leading-relaxed text-foreground">
                                                {currentPreviewCaption}
                                            </div>
                                        )}
                                    </div>

                                    {getShortlinkPreference() === 'ask' &&
                                        !activeDraftMessage.postDraft.shortlinkDismissed &&
                                        !activeDraftMessage.postDraft.isScheduled &&
                                        /https?:\/\/[^\s]+/i.test(activeDraftMessage.postDraft.caption) &&
                                        !/(?:\/api\/links\/go\/|\/s\/[a-zA-Z0-9_-]+)/i.test(
                                            activeDraftMessage.postDraft.caption
                                        ) && (
                                            <div className="flex flex-col justify-between gap-2 rounded-xl border border-brand-dark/40 bg-brand-50 p-3 text-xs text-brand-ink sm:flex-row sm:items-center">
                                                <span className="flex items-center gap-1.5 font-medium">
                                                    <LinkSimple size={14} weight="bold" className="shrink-0" />
                                                    <span>
                                                        {t('Phát hiện link URL. Rút gọn sang Shortlink để đo click?')}
                                                    </span>
                                                </span>
                                                <div className="flex shrink-0 items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            try {
                                                                const res = await appClient.links.build({
                                                                    brand_id: currentBrand.id,
                                                                    form: {
                                                                        caption: activeDraftMessage.postDraft.caption,
                                                                        platform_captions:
                                                                            activeDraftMessage.postDraft.platformCaptions,
                                                                    },
                                                                    options: {
                                                                        medium: 'social',
                                                                        campaign:
                                                                            activeDraftMessage.postDraft.title ||
                                                                            'agent-post',
                                                                        tracking: true,
                                                                        short: true,
                                                                    },
                                                                });
                                                                if (res?.caption) {
                                                                    updateDraftField(
                                                                        activeDraftMessage.id,
                                                                        'caption',
                                                                        res.caption
                                                                    );
                                                                    if (res.platform_captions) {
                                                                        updateDraftField(
                                                                            activeDraftMessage.id,
                                                                            'platformCaptions',
                                                                            res.platform_captions
                                                                        );
                                                                    }
                                                                    toast({
                                                                        title: t('Đã rút gọn liên kết thành công!'),
                                                                    });
                                                                }
                                                            } catch (e) {
                                                                toast({
                                                                    variant: 'destructive',
                                                                    title: t('Lỗi rút gọn link'),
                                                                    description: e.message,
                                                                });
                                                            }
                                                        }}
                                                        className="min-h-8 cursor-pointer rounded-lg bg-brand px-2.5 text-xs font-semibold text-brand-ink"
                                                    >
                                                        {t('Rút gọn ngay')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            updateDraftField(
                                                                activeDraftMessage.id,
                                                                'shortlinkDismissed',
                                                                true
                                                            )
                                                        }
                                                        className="min-h-8 cursor-pointer rounded-lg border border-border bg-card px-2.5 text-xs text-muted-foreground hover:text-foreground"
                                                    >
                                                        {t('Bỏ qua')}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                    {activeDraftMessage.postDraft.media?.length > 0 && (
                                        <div className="space-y-1.5">
                                            <span className="text-xs font-semibold text-muted-foreground">
                                                {t('Ảnh đính kèm')} ({activeDraftMessage.postDraft.media.length})
                                            </span>
                                            <div className="flex flex-wrap gap-2">
                                                {activeDraftMessage.postDraft.media.map((img, i) => (
                                                    <div
                                                        key={i}
                                                        className="relative h-20 w-20 overflow-hidden rounded-xl border border-border bg-zinc-100"
                                                    >
                                                        <img
                                                            src={img.url}
                                                            alt={img.name || 'image'}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Target Channels */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-foreground">
                                            {t('Đích đăng')} ({activeDraftMessage.postDraft.selectedAccountIds?.length || 0}{' '}
                                            {t('kênh')})
                                        </span>
                                        <Link to="/accounts" className="text-muted-foreground hover:text-foreground hover:underline">
                                            {t('Quản lý kênh')}
                                        </Link>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {brandAccounts.length === 0 ? (
                                            <p className="text-xs italic text-muted-foreground">
                                                {t('Chưa có kênh nào được liên kết cho thương hiệu này.')}
                                            </p>
                                        ) : (
                                            brandAccounts.map((acc) => {
                                                const isSelected =
                                                    activeDraftMessage.postDraft.selectedAccountIds?.includes(acc.id);
                                                const platformCfg = PLATFORM_CONFIG[acc.platform] || {
                                                    label: acc.platform,
                                                    color: 'text-foreground',
                                                };
                                                const Icon = platformCfg.icon;

                                                return (
                                                    <button
                                                        key={acc.id}
                                                        type="button"
                                                        disabled={activeDraftMessage.postDraft.isScheduled}
                                                        onClick={() =>
                                                            toggleAccountSelection(activeDraftMessage.id, acc.id)
                                                        }
                                                        className={`inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors ${
                                                            isSelected
                                                                ? 'border-brand-dark bg-brand-100 font-semibold text-brand-ink'
                                                                : 'border-border bg-card text-muted-foreground hover:border-zinc-300 hover:text-foreground'
                                                        }`}
                                                    >
                                                        {Icon && (
                                                            <Icon
                                                                size={14}
                                                                className={isSelected ? 'text-brand-ink' : platformCfg.color}
                                                            />
                                                        )}
                                                        <span>{acc.name}</span>
                                                        {isSelected && (
                                                            <Check size={12} weight="bold" className="text-emerald-700" />
                                                        )}
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* Schedule Time Box */}
                                <div className="space-y-2.5 rounded-xl border border-border bg-zinc-50/70 p-3.5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                            <Clock size={15} weight="bold" />
                                            <span>{t('Thời gian xuất bản')}</span>
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {activeDraftMessage.postDraft.timezone}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2.5">
                                        <input
                                            type="date"
                                            disabled={activeDraftMessage.postDraft.isScheduled}
                                            value={activeDraftMessage.postDraft.scheduledDate}
                                            onChange={(e) =>
                                                updateDraftField(activeDraftMessage.id, 'scheduledDate', e.target.value)
                                            }
                                            className="min-h-[36px] rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground disabled:opacity-75"
                                        />
                                        <input
                                            type="time"
                                            disabled={activeDraftMessage.postDraft.isScheduled}
                                            value={activeDraftMessage.postDraft.scheduledTime}
                                            onChange={(e) =>
                                                updateDraftField(activeDraftMessage.id, 'scheduledTime', e.target.value)
                                            }
                                            className="min-h-[36px] rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground disabled:opacity-75"
                                        />

                                        {!activeDraftMessage.postDraft.isScheduled && (
                                            <div className="ml-auto flex flex-wrap items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const today = todayInZone(activeDraftMessage.postDraft.timezone);
                                                        updateDraftField(
                                                            activeDraftMessage.id,
                                                            'scheduledDate',
                                                            addDays(today, 1)
                                                        );
                                                        updateDraftField(
                                                            activeDraftMessage.id,
                                                            'scheduledTime',
                                                            '09:00'
                                                        );
                                                    }}
                                                    className="min-h-8 cursor-pointer rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground hover:bg-zinc-100"
                                                >
                                                    {t('Sáng mai 09:00')}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const today = todayInZone(activeDraftMessage.postDraft.timezone);
                                                        updateDraftField(
                                                            activeDraftMessage.id,
                                                            'scheduledDate',
                                                            today
                                                        );
                                                        updateDraftField(
                                                            activeDraftMessage.id,
                                                            'scheduledTime',
                                                            '20:00'
                                                        );
                                                    }}
                                                    className="min-h-8 cursor-pointer rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground hover:bg-zinc-100"
                                                >
                                                    {t('Tối nay 20:00')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Sticky Bottom Action Bar */}
                            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-zinc-50/70 p-4">
                                {activeDraftMessage.postDraft.isScheduled ? (
                                    <>
                                        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                                            <CheckCircle size={16} weight="bold" />
                                            <span>{t('Bài đăng đã được xếp lịch xuất bản!')}</span>
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <Link to="/calendar" className="btn-skew min-h-9 whitespace-nowrap">
                                                <CalendarBlank size={15} weight="bold" />
                                                <span>{t('Xem trên Lịch')}</span>
                                            </Link>
                                            {activeDraftMessage.postDraft.scheduledPostId && (
                                                <Link
                                                    to={`/posts?post=${activeDraftMessage.postDraft.scheduledPostId}`}
                                                    className="inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-zinc-100"
                                                >
                                                    <ArrowSquareOut size={13} />
                                                    <span>{t('Chi tiết')}</span>
                                                </Link>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <Link
                                            to="/create"
                                            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                                        >
                                            <span>{t('Soạn thảo đầy đủ')}</span>
                                            <ArrowSquareOut size={13} />
                                        </Link>
                                        <button
                                            type="button"
                                            disabled={activeDraftMessage.postDraft.isSaving}
                                            onClick={() => handleConfirmSchedule(activeDraftMessage.id)}
                                            className="btn-skew min-h-10 shrink-0 whitespace-nowrap cursor-pointer disabled:opacity-40"
                                        >
                                            <CheckCircle size={16} weight="bold" />
                                            <span>
                                                {activeDraftMessage.postDraft.isSaving
                                                    ? t('Đang lên lịch…')
                                                    : t('Xác nhận lên lịch ngay')}
                                            </span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </>
                    ) : (
                        /* Empty Preview Guide State */
                        <div className="flex flex-1 flex-col items-center justify-center space-y-5 p-6 text-center sm:p-8">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-dark bg-brand text-brand-ink">
                                <Sparkle size={28} weight="duotone" />
                            </div>
                            <div className="max-w-sm space-y-1.5">
                                <h3 className="font-heading text-base font-semibold text-foreground">
                                    {t('Bản xem trước & Lịch Campaign tự động')}
                                </h3>
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    {t(
                                        'Nhập ý tưởng lẻ hoặc tạo Campaign kết nối Google Drive để AI xào nấu nội dung đa kênh và xếp lịch tự động.'
                                    )}
                                </p>
                            </div>

                            <div className="flex w-full max-w-sm flex-col gap-2 text-xs">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {t('Chọn nhanh tác vụ tự động')}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setShowCampaignBuilder(true)}
                                    className="flex min-h-10 cursor-pointer items-center justify-between gap-2 whitespace-nowrap rounded-xl border border-brand-dark/50 bg-brand-100 px-3.5 py-2.5 text-left font-semibold text-brand-ink transition-colors hover:bg-brand-200"
                                >
                                    <span className="flex items-center gap-2">
                                        <HardDrives size={16} weight="bold" className="shrink-0" />
                                        <span>{t('Tạo Campaign + Drive & Xào nấu')}</span>
                                    </span>
                                    <ArrowSquareOut size={14} className="shrink-0" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        handleQuickPrompt('Ra mắt tính năng mới vào 9h sáng mai trên Threads và Facebook')
                                    }
                                    className="flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-left font-medium text-foreground transition-colors hover:bg-zinc-100"
                                >
                                    <span>{t('Ra mắt tính năng 9h sáng mai')}</span>
                                    <ArrowSquareOut size={14} className="shrink-0 text-muted-foreground" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        handleQuickPrompt(
                                            'Chia sẻ bài học tối ưu nội dung MXH vào 20:00 tối nay trên LinkedIn'
                                        )
                                    }
                                    className="flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-left font-medium text-foreground transition-colors hover:bg-zinc-100"
                                >
                                    <span>{t('Bài học kinh nghiệm 20:00 tối')}</span>
                                    <ArrowSquareOut size={14} className="shrink-0 text-muted-foreground" />
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            </div>

            {/* Modal: Campaign + Google Drive Autopilot */}
            <Dialog open={showCampaignBuilder} onOpenChange={setShowCampaignBuilder}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-dark bg-brand text-brand-ink">
                                <Stack size={18} weight="bold" />
                            </span>
                            <div>
                                <DialogTitle className="font-heading text-sm font-semibold text-foreground">
                                    {t('Tạo Campaign + Liên kết Ảnh Google Drive')}
                                </DialogTitle>
                                <DialogDescription className="mt-0.5 text-xs text-muted-foreground">
                                    {t('Đồng bộ ảnh từ Google Drive, xào nấu dữ liệu bằng AI và lên lịch đa kênh.')}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                            <div>
                                <label htmlFor="camp-name" className="mb-1.5 block text-xs font-semibold text-foreground">
                                    {t('1. Tên Chiến dịch')}
                                </label>
                                <input
                                    id="camp-name"
                                    type="text"
                                    value={campaignForm.name}
                                    onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                                    placeholder={t('VD: Ra mắt Sản phẩm Mới…')}
                                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-brand-dark focus:outline-none"
                                />
                            </div>

                            <div>
                                <label htmlFor="camp-drive" className="mb-1.5 block text-xs font-semibold text-foreground">
                                    {t('2. Link thư mục Google Drive')}
                                </label>
                                <input
                                    id="camp-drive"
                                    type="text"
                                    value={campaignForm.driveUrl}
                                    onChange={(e) => setCampaignForm({ ...campaignForm, driveUrl: e.target.value })}
                                    placeholder="https://drive.google.com/drive/folders/…"
                                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-brand-dark focus:outline-none"
                                />
                                {autopilotSources.length > 0 && (
                                    <div className="mt-1.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                                        <span>{t('Đã lưu:')}</span>
                                        {autopilotSources.map((src) => (
                                            <button
                                                key={src.id}
                                                type="button"
                                                onClick={() =>
                                                    setCampaignForm({
                                                        ...campaignForm,
                                                        driveUrl: src.folder || src.name,
                                                    })
                                                }
                                                className="cursor-pointer rounded border border-border bg-zinc-100 px-1.5 py-0.5 font-medium text-foreground hover:bg-zinc-200"
                                            >
                                                {src.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="camp-raw" className="mb-1.5 block text-xs font-semibold text-foreground">
                                {t('3. Dữ liệu thô của chiến dịch')}
                            </label>
                            <textarea
                                id="camp-raw"
                                rows={4}
                                value={campaignForm.rawData}
                                onChange={(e) => setCampaignForm({ ...campaignForm, rawData: e.target.value })}
                                placeholder={t('Nhập thông tin sản phẩm, ưu đãi, USP…')}
                                className="w-full resize-none rounded-xl border border-border bg-card p-3 text-xs leading-relaxed text-foreground focus:border-brand-dark focus:outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3">
                            <div>
                                <label htmlFor="camp-days" className="mb-1.5 block text-xs font-semibold text-foreground">
                                    {t('Số ngày chạy')}
                                </label>
                                <select
                                    id="camp-days"
                                    value={campaignForm.days}
                                    onChange={(e) =>
                                        setCampaignForm({ ...campaignForm, days: Number(e.target.value) })
                                    }
                                    className="h-9 w-full rounded-xl border border-border bg-card px-2.5 text-xs font-medium text-foreground"
                                >
                                    <option value={3}>3 {t('ngày')}</option>
                                    <option value={5}>5 {t('ngày')}</option>
                                    <option value={7}>7 {t('ngày')}</option>
                                    <option value={14}>14 {t('ngày')}</option>
                                    <option value={30}>30 {t('ngày')}</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="camp-freq" className="mb-1.5 block text-xs font-semibold text-foreground">
                                    {t('Tần suất đăng')}
                                </label>
                                <select
                                    id="camp-freq"
                                    value={campaignForm.frequency}
                                    onChange={(e) =>
                                        setCampaignForm({ ...campaignForm, frequency: e.target.value })
                                    }
                                    className="h-9 w-full rounded-xl border border-border bg-card px-2.5 text-xs font-medium text-foreground"
                                >
                                    <option value="1_per_day">{t('1 bài / ngày')}</option>
                                    <option value="2_per_day">{t('2 bài / ngày')}</option>
                                    <option value="3_per_week">{t('3 bài / tuần')}</option>
                                    <option value="5_per_week">{t('5 bài / tuần')}</option>
                                </select>
                            </div>

                            <label className="flex h-9 cursor-pointer select-none items-center gap-2 rounded-xl border border-border bg-zinc-50 px-3 text-xs font-medium text-foreground">
                                <input
                                    type="checkbox"
                                    checked={campaignForm.autoSchedule}
                                    onChange={(e) =>
                                        setCampaignForm({ ...campaignForm, autoSchedule: e.target.checked })
                                    }
                                    className="rounded border-border text-brand-ink"
                                />
                                <span className="truncate">{t('Tự động lên lịch')}</span>
                            </label>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 border-t border-border pt-3">
                            <button
                                type="button"
                                onClick={() => setShowCampaignBuilder(false)}
                                className="min-h-9 cursor-pointer rounded-xl border border-border bg-card px-4 text-xs font-medium text-foreground hover:bg-zinc-100"
                            >
                                {t('Hủy')}
                            </button>
                            <button
                                type="button"
                                disabled={isAgentThinking}
                                onClick={() => handleRunCampaignAutopilot()}
                                className="btn-skew min-h-9 cursor-pointer whitespace-nowrap disabled:opacity-40"
                            >
                                <Sparkle size={15} weight="duotone" />
                                <span>{t('Bắt đầu Xào nấu & Setup Lịch')}</span>
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal: Full Preview of Campaign Post */}
            <Dialog
                open={Boolean(previewCampaignPost)}
                onOpenChange={(open) => {
                    if (!open) setPreviewCampaignPost(null);
                }}
            >
                <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-5 sm:p-6">
                    {(() => {
                        if (!previewCampaignPost) return null;
                        const targetMsg = messages.find((m) => m.id === previewCampaignPost.messageId);
                        const postItem = targetMsg?.campaignDraft?.posts?.find(
                            (p) => p.id === previewCampaignPost.postId
                        );
                        if (!postItem) return null;

                        return (
                            <div className="space-y-4">
                                <DialogHeader className="space-y-1.5 text-left">
                                    <div className="flex flex-wrap items-center gap-2 pr-6">
                                        <span className="rounded-lg bg-brand px-2.5 py-0.5 text-xs font-semibold text-brand-ink">
                                            #{previewCampaignPost.index + 1} · {t('Ngày')} {postItem.dayIndex}
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-md border border-border bg-zinc-50 px-2 py-0.5 text-xs font-medium text-foreground">
                                            <CalendarBlank size={12} /> {postItem.date}
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-md border border-border bg-zinc-50 px-2 py-0.5 text-xs font-medium text-foreground">
                                            <Clock size={12} /> {postItem.time}
                                        </span>
                                        <span className="rounded-md border border-border bg-zinc-100 px-2 py-0.5 text-xs font-semibold uppercase text-foreground">
                                            {postItem.platform}
                                        </span>
                                    </div>
                                    <DialogTitle className="pt-1 font-heading text-base font-semibold leading-snug text-foreground">
                                        {postItem.title}
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-muted-foreground">
                                        {postItem.pillar?.name} · {postItem.angle?.name}
                                    </DialogDescription>
                                </DialogHeader>

                                {postItem.asset?.file_url && (
                                    <div className="flex max-h-72 items-center justify-center overflow-hidden rounded-xl border border-border bg-zinc-50">
                                        <img
                                            src={postItem.asset.file_url}
                                            alt={postItem.asset.name || 'Drive asset'}
                                            className="max-h-72 w-auto object-contain"
                                        />
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        {t('Nội dung đầy đủ')}
                                    </div>
                                    <div className="whitespace-pre-wrap rounded-xl border border-border bg-zinc-50/70 p-4 text-sm leading-relaxed text-foreground">
                                        {postItem.caption}
                                    </div>
                                </div>

                                {postItem.reason && (
                                    <div className="rounded-xl border border-brand-dark/30 bg-brand-50 px-3.5 py-2.5 text-xs text-brand-ink">
                                        <span className="font-semibold">{t('Ghi chú AI Remix:')} </span>
                                        {postItem.reason}
                                    </div>
                                )}

                                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleRegenerateCampaignPost(previewCampaignPost.messageId, postItem)
                                        }
                                        className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-zinc-100"
                                    >
                                        <ArrowsClockwise size={13} weight="bold" />
                                        <span>{t('Xào nấu lại')}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedCampaignPostId(postItem.id);
                                            setPreviewCampaignPost(null);
                                        }}
                                        className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-zinc-100"
                                    >
                                        <PencilSimple size={13} weight="bold" />
                                        <span>{t('Chỉnh sửa')}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewCampaignPost(null)}
                                        className="btn-skew min-h-9 cursor-pointer"
                                    >
                                        <span>{t('Đóng')}</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </div>
    );
}
