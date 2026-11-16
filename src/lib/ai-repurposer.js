import { aiRequest } from '@/api/ai';

/**
 * Tách các câu hoặc ý chính từ văn bản gốc
 */
function extractPoints(text) {
    if (!text || typeof text !== 'string') return [];
    return text
        .split(/(?:\r?\n)+|(?<=[.!?])\s+/)
        .map((s) => s.trim().replace(/^[-*•▸\d.]+\s*/, ''))
        .filter((s) => s.length > 10);
}

/**
 * Thuật toán mẫu tạo biến thể đa kênh theo tiêu chuẩn thuật toán từng nền tảng (Fallback khi không có server AI API)
 */
export function generateHeuristicVariants({ text = '', title = '', tone = 'engaging' }) {
    const raw = (text || title || 'Chia sẻ kiến thức hữu ích').trim();
    const points = extractPoints(raw);
    const mainIdea = points[0] || raw.slice(0, 100);
    const subPoints = points.slice(1, 4);

    // 1. Facebook: Kể chuyện, khoảng trống thoáng, câu hỏi kích thích tương tác
    const fbBullets = subPoints.length > 0
        ? subPoints.map((p) => `👉 ${p}`).join('\n\n')
        : '👉 Tập trung vào giá trị thực tế\n\n👉 Đo lường và tối ưu liên tục\n\n👉 Giữ vững tính nhất quán trên mọi điểm chạm';

    const facebook = [
        `🔥 ${mainIdea}`,
        '',
        'Nhiều bạn thường hỏi mình đâu là điểm mấu chốt để tạo ra sự khác biệt bền vững? Câu trả lời không nằm ở sự phức tạp, mà là cách chúng ta thực thi từng chi tiết nhỏ:',
        '',
        fbBullets,
        '',
        '💡 Bạn nghĩ sao về điều này? Đã từng gặp tình huống tương tự chưa?',
        '👇 Để lại bình luận bên dưới để cùng trao đổi nhé!',
        '',
        '#KinhDoanh #PhatTrien #Socialchoice #ChiaSeKinhNghiem'
    ].join('\n');

    // 2. Threads: Ngắn gọn, kích thích tranh luận/tò mò, giới hạn dưới 500 ký tự
    const threadsHook = mainIdea.length > 100 ? `${mainIdea.slice(0, 95)}...` : mainIdea;
    const threadsCore = subPoints.length > 0
        ? subPoints.slice(0, 2).map((p) => `• ${p}`).join('\n')
        : '• Không cần làm quá nhiều thứ cùng lúc.\n• Chỉ cần làm đúng thứ quan trọng nhất.';

    const threads = [
        `Góc nhìn thẳng: ${threadsHook}`,
        '',
        threadsCore,
        '',
        'Ai đồng ý hoặc có trải nghiệm ngược lại không? Bàn luận nhé 👇'
    ].join('\n');

    // 3. LinkedIn: Phong cách lãnh đạo tư tưởng (thought-leadership), chuyên nghiệp, bài học hành động
    const linkedinBullets = subPoints.length > 0
        ? subPoints.map((p, idx) => `0${idx + 1}. ${p}`).join('\n')
        : '01. Định vị rõ ràng trước khi hành động\n02. Tối ưu quy trình trước khi mở rộng\n03. Lấy dữ liệu và khách hàng làm trung tâm';

    const linkedin = [
        `Bài học quan trọng nhất mình đúc kết được gần đây:`,
        `"${mainIdea}"`,
        '',
        'Trong hành trình xây dựng và phát triển, có 3 nguyên lý mà chúng ta rất dễ bỏ quên khi mải chạy theo kết quả ngắn hạn:',
        '',
        linkedinBullets,
        '',
        '💡 Key takeaway: Đừng đợi mọi thứ hoàn hảo mới bắt đầu. Hãy bắt đầu từ những bước đi nhất quán và đo lường thường xuyên.',
        '',
        'Góc nhìn từ phía bạn thế nào? Kết nối cùng mình để cùng thảo luận nhé.',
        '',
        '#Leadership #Strategy #MarketingGrowth #Management'
    ].join('\n');

    // 4. TikTok / Reels: Kịch bản video ngắn (Video Script) chuẩn cấu trúc 30s
    const tiktokScript = [
        `🎬 [KỊCH BẢN VIDEO NGẮN 30S]`,
        `⚡ [0-3s HOOK]: "Dừng lại 3 giây nếu bạn đang quan tâm đến: ${mainIdea.slice(0, 50)}!" (Quay cận cảnh / Text nổi bật)`,
        `💡 [3-15s VẤN ĐỀ]: Đa số mọi người đều mắc lỗi ở chỗ làm quá phức tạp. Nhưng sự thật là:`,
        subPoints[0] ? `👉 Ý 1: ${subPoints[0]}` : '👉 Bước 1: Xác định đúng trọng tâm.',
        subPoints[1] ? `👉 Ý 2: ${subPoints[1]}` : '👉 Bước 2: Tối ưu hoá quy trình đơn giản.',
        `🚀 [20-28s CTA]: "Thử ngay hôm nay và xem kết quả thay đổi thế nào nhé! Nhớ thả tim và follow để cập nhật thêm."`,
        '',
        `📝 [CAPTION ĐĂNG VIDEO]:`,
        `${mainIdea.slice(0, 120)}... Lưu lại video để áp dụng ngay! 👇`,
        '#TikTokTips #LearnOnTikTok #KienThuc #Xuhuong #Socialchoice'
    ].join('\n');

    // 5. Zalo OA: Bản tin Broadcast / Nhật ký OA thân thiện, cô đọng, định hướng tương tác chat
    const zaloBullets = subPoints.length > 0
        ? subPoints.map((p) => `🔹 ${p}`).join('\n')
        : '🔹 Tối ưu quy trình & trải nghiệm khách hàng\n🔹 Cập nhật thông tin nhanh chóng, chính xác\n🔹 Luôn sẵn sàng hỗ trợ trực tiếp qua Zalo OA';

    const zalo = [
        `[THÔNG BÁO TỪ OA] 📢`,
        `Kính gửi Quý khách hàng & Đối tác,`,
        '',
        `${mainIdea}`,
        '',
        zaloBullets,
        '',
        '💬 Quý khách có bất kỳ thắc mắc hoặc cần tư vấn chi tiết, vui lòng nhấn "Nhắn tin" ngay cho OA để được đội ngũ chuyên viên hỗ trợ 24/7.',
        '',
        'Trân trọng,\nĐội ngũ CSKH Socialchoice'
    ].join('\n');

    return {
        facebook,
        threads,
        linkedin,
        tiktok: tiktokScript,
        zalo,
    };
}

/**
 * Gọi AI tái sinh nội dung cho 4 nền tảng (hỗ trợ thử Server AI API hoặc fallback heuristic mượt mà)
 */
export async function repurposeAllPlatforms({
    text = '',
    title = '',
    brandId = '',
    tone = 'engaging',
    aiConfig = null,
    onProgress = null,
}) {
    const rawText = (text || title || '').trim();
    if (!rawText) {
        throw new Error('Vui lòng nhập nội dung hoặc dàn ý gốc để AI tái sinh.');
    }

    // Heuristic baseline
    const fallbackVariants = generateHeuristicVariants({ text: rawText, title, tone });

    // Nếu không có cấu hình AI API key trên server, dùng ngay heuristic chuẩn
    if (!aiConfig?.configured) {
        if (onProgress) {
            onProgress({ step: 'heuristic', message: 'Tái sinh qua mô hình chuẩn Socialchoice...' });
        }
        return {
            variants: fallbackVariants,
            provider: 'Socialchoice Smart Templates',
            model: 'Algorithmic Repurposer',
            isAiGenerated: false,
        };
    }

    // Nếu server có API key (OpenAI/Gemini/OpenRouter), gọi tuần tự/song song với graceful fallback
    const platforms = ['facebook', 'threads', 'linkedin', 'tiktok', 'zalo'];
    const results = { ...fallbackVariants };
    let successCount = 0;

    for (let i = 0; i < platforms.length; i++) {
        const plat = platforms[i];
        if (onProgress) {
            onProgress({
                step: plat,
                index: i + 1,
                total: platforms.length,
                message: `Đang tái sinh nội dung cho ${plat.toUpperCase()}...`,
            });
        }

        try {
            const res = await aiRequest('generate', {
                action: 'adapt',
                platform: plat,
                caption: rawText,
                title: title || rawText.slice(0, 60),
                brand_id: brandId,
                language: 'vi',
                confirmed: true,
            });

            if (res?.text && res.text.trim()) {
                results[plat] = res.text.trim();
                successCount++;
            }
        } catch (err) {
            console.warn(`[AI Repurpose] Could not adapt for ${plat}, using smart heuristic fallback:`, err);
            // Giữ lại kết quả từ fallbackVariants
        }
    }

    return {
        variants: results,
        provider: aiConfig?.provider || 'AI',
        model: aiConfig?.model || 'gpt-4o-mini',
        isAiGenerated: successCount > 0,
    };
}
