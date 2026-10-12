import { DEFAULT_TIMEZONE } from './constants';
import { addDays, toUtcIso, todayInZone } from './tz';

const BRANDS = [
    {
        key: 'b1',
        name: 'Aster Coffee Roasters',
        description: 'Specialty roastery with four cafés across Saigon.',
        color: '#79D94B',
        timezone: DEFAULT_TIMEZONE,
    },
    {
        key: 'b2',
        name: 'Northwind Fitness',
        description: 'Boutique strength and conditioning studios.',
        color: '#4F7CA8',
        timezone: DEFAULT_TIMEZONE,
    },
    {
        key: 'b3',
        name: 'Lumen Skincare',
        description: 'Clean-formula skincare built for tropical climates.',
        color: '#C6A15B',
        timezone: DEFAULT_TIMEZONE,
    },
];

const PILLAR_TEMPLATES = [
    {
        key: 'p1',
        name: 'Product Education',
        description: 'Teach people how to get the most out of the product.',
        color: '#79D94B',
        target_percentage: 35,
    },
    {
        key: 'p2',
        name: 'Brand Awareness',
        description: 'Who we are, what we stand for, what happens behind the counter.',
        color: '#4F7CA8',
        target_percentage: 25,
    },
    {
        key: 'p3',
        name: 'Customer Stories',
        description: 'Real customers, real outcomes, told plainly.',
        color: '#C6A15B',
        target_percentage: 20,
    },
    {
        key: 'p4',
        name: 'Community Engagement',
        description: 'Conversations, questions and shout-outs.',
        color: '#8A7FB5',
        target_percentage: 12,
    },
    {
        key: 'p5',
        name: 'Promotional Content',
        description: 'Offers, launches and seasonal pushes.',
        color: '#C2705F',
        target_percentage: 8,
    },
];

const ANGLE_TEMPLATES = {
    p1: ['How-to', 'Common Mistakes', 'Problem–Solution', 'Myth vs Fact', 'Tips & Tricks'],
    p2: ['Behind the Scenes', 'Milestones', 'Culture & Values'],
    p3: ['Success Story', 'Testimonial', 'Transformation'],
    p4: ['Ask the Audience', 'Polls & Questions', 'Customer Shoutouts'],
    p5: ['Limited Offer', 'Seasonal Push', 'Bundle Deal'],
};

const ACCOUNTS = [
    { key: 'a1', brandKey: 'b1', name: 'Aster Coffee Roasters', username: '@astercoffee', external_id: 'demo-page-101', followers: 48210 },
    { key: 'a2', brandKey: 'b1', name: 'Aster Coffee — Thao Dien', username: '@asterthaodien', external_id: 'demo-page-102', followers: 12640 },
    { key: 'a3', brandKey: 'b2', name: 'Northwind Fitness', username: '@northwindfitness', external_id: 'demo-page-201', followers: 31780 },
    { key: 'a4', brandKey: 'b2', name: 'Northwind — District 2', username: '@northwindd2', external_id: 'demo-page-202', followers: 8940 },
    { key: 'a5', brandKey: 'b3', name: 'Lumen Skincare', username: '@lumenskin', external_id: 'demo-page-301', followers: 63920 },
    { key: 'a6', brandKey: 'b3', name: 'Lumen Beauty Vietnam', username: '@lumenbeautyvn', external_id: 'demo-page-302', followers: 15230 },
    {
        key: 'a7',
        brandKey: 'b3',
        name: 'Lumen Skincare (LinkedIn)',
        username: 'lumen-skincare',
        external_id: '',
        followers: 4310,
        platform: 'linkedin',
        account_type: 'profile',
        connection_status: 'configuration_required',
    },
];

const BRAND_ACCOUNTS = { b1: ['a1', 'a2'], b2: ['a3', 'a4'], b3: ['a5', 'a6'] };

const BRAND_POSTS = {
    b1: [
        ['p1', 0, 'Pour-over basics: three ratios that never miss', 'Water at 93°C, 1:15 ratio, 2:45 total brew time. Save this for tomorrow morning.'],
        ['p2', 0, '6am at the roastery: how a batch gets approved', 'Every batch is cupped three times before it goes on the shelf. Here is what we look for.'],
        ['p3', 0, 'Mai switched from instant coffee to single origin', '"I did not think I would notice the difference. Now I cannot go back."'],
        ['p1', 1, 'The five mistakes we see in home brewing', 'Stale beans, boiling water, uneven grind, no scale, and brewing the day after grinding.'],
        ['p5', 0, 'Weekend bundle: 2 bags + a ceramic dripper', 'Available at all four cafés until Sunday evening.'],
        ['p1', 2, 'Cold brew that stays smooth for five days', 'The trick is a coarse grind and a slow 16-hour steep in the fridge.'],
        ['p3', 1, 'From a pop-up cart to four cafés', 'A short look at the last five years, told by the people who were there from the start.'],
        ['p2', 1, 'Why we roast in small batches', 'Small batches cost us more. They also mean every bag reaches you within ten days of roasting.'],
        ['p5', 1, 'Single-origin Ethiopian back in stock', 'Blueberry, jasmine, and a long finish. Limited to 200 bags this month.'],
    ],
    b2: [
        ['p1', 0, 'The four-move warm-up that saves your shoulders', 'Five minutes before every session. No equipment needed.'],
        ['p2', 0, 'A look at how our coaching team plans a block', 'Twelve weeks, three phases, one very full whiteboard.'],
        ['p3', 0, 'Linh deadlifted 100kg for the first time', 'Eighteen months of twice-weekly sessions, and a lot of patience on the last rep.'],
        ['p1', 2, 'Training around a desk job: what actually helps', 'Short sessions, heavy carries, and walking meetings beat one long weekend workout.'],
        ['p5', 0, 'Founding member rate: 12 spots left', 'Locked-in pricing for the District 2 studio opening next month.'],
        ['p1', 3, 'Progress you can measure without a scale', 'Rep counts, sleep, and how stairs feel on a Monday.'],
        ['p3', 1, 'What members say after their first 90 days', 'Three members, three very different starting points.'],
        ['p2', 2, 'How we pick our coaches', 'Two practical assessments, one full week on the floor, and a lot of feedback.'],
        ['p5', 2, 'Bring-a-friend week starts Monday', 'Members can bring one guest to any class, free, all week.'],
    ],
    b3: [
        ['p1', 0, 'How to layer a serum without pilling', 'Thinnest to thickest, thirty seconds between layers, and no rubbing.'],
        ['p2', 0, 'Why we formulate for humidity', 'Most cleansers are built for dry climates. Ours are not.'],
        ['p3', 0, 'Hoa cleared her post-acne marks in 10 weeks', 'Niacinamide in the morning, retinol twice a week, and sunscreen every day.'],
        ['p1', 1, 'Three ingredients that fight each other', 'Retinol and strong acids are the usual culprits. Here is how to alternate them safely.'],
        ['p5', 0, 'Travel kit launch: five minis, one pouch', 'Everything you need for a two-week trip, under 100ml each.'],
        ['p1', 4, 'The order of your routine matters more than the price', 'A clear list you can follow with whatever is already on your shelf.'],
        ['p3', 1, 'A dermatologist on why she recommends our cleanser', 'Short interview, one honest caveat.'],
        ['p2', 1, 'Every batch is tested on 20 volunteers first', 'Here is what that process looks like from the inside.'],
        ['p5', 1, 'Rainy season set: 20% off this week', 'Cleanser, barrier cream and SPF, bundled for the wet months ahead.'],
    ],
};

const MEDIA = [
    { key: 'm1', brandKey: 'b1', name: 'aster-roastery.jpg', file_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80', file_type: 'image' },
    { key: 'm2', brandKey: 'b1', name: 'aster-beans.jpg', file_url: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1200&q=80', file_type: 'image' },
    { key: 'm3', brandKey: 'b1', name: 'aster-pourover.jpg', file_url: 'https://images.unsplash.com/photo-1521302200778-33500795e128?auto=format&fit=crop&w=1200&q=80', file_type: 'image' },
    { key: 'm4', brandKey: 'b2', name: 'northwind-floor.jpg', file_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=80', file_type: 'image' },
    { key: 'm5', brandKey: 'b2', name: 'northwind-lifting.jpg', file_url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80', file_type: 'image' },
    { key: 'm6', brandKey: 'b3', name: 'lumen-serum.jpg', file_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1200&q=80', file_type: 'image' },
    { key: 'm7', brandKey: 'b3', name: 'lumen-flatlay.jpg', file_url: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=1200&q=80', file_type: 'image' },
    { key: 'm8', brandKey: 'b3', name: 'lumen-bottles.jpg', file_url: 'https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?auto=format&fit=crop&w=1200&q=80', file_type: 'image' },
];

const SCHEDULE = [
    { offset: -18, status: 'published', hour: '09:00' },
    { offset: -12, status: 'published', hour: '18:00' },
    { offset: -6, status: 'published', hour: '12:30' },
    { offset: -2, status: 'failed', hour: '10:00' },
    { offset: 1, status: 'scheduled', hour: '09:00' },
    { offset: 3, status: 'scheduled', hour: '18:00' },
    { offset: 6, status: 'scheduled', hour: '12:00' },
    { offset: 0, status: 'draft', hour: '15:00' },
    { offset: 9, status: 'draft', hour: '11:00' },
];

const MEDIA_FOR_POST = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'];

export const DEMO_SEED_FLAG = 'sph_demo_seeded_v1';

/** Builds the full sample workspace. Ids are assigned when the records are written. */
export const buildDemoWorkspace = () => {
    const today = todayInZone(DEFAULT_TIMEZONE);
    const brands = BRANDS.map((b) => ({ ...b, status: 'active', is_demo: true }));
    const pillars = [];
    const angles = [];
    const posts = [];
    const jobs = [];
    const logs = [];

    BRANDS.forEach((brand) => {
        PILLAR_TEMPLATES.forEach((pillar) => {
            pillars.push({
                key: `${brand.key}-${pillar.key}`,
                brandKey: brand.key,
                name: pillar.name,
                description: pillar.description,
                color: pillar.color,
                target_percentage: pillar.target_percentage,
                status: 'active',
                is_demo: true,
            });
            ANGLE_TEMPLATES[pillar.key].forEach((angleName, index) => {
                angles.push({
                    key: `${brand.key}-${pillar.key}-a${index}`,
                    brandKey: brand.key,
                    pillarKey: `${brand.key}-${pillar.key}`,
                    name: angleName,
                    description: `${angleName} posts that support ${pillar.name.toLowerCase()} for ${brand.name}.`,
                    status: 'active',
                    is_demo: true,
                });
            });
        });

        BRAND_POSTS[brand.key].forEach((entry, index) => {
            const [pillarKey, angleIndex, title, caption] = entry;
            const plan = SCHEDULE[index];
            const dateKey = addDays(today, plan.offset);
            const scheduledAt = toUtcIso(dateKey, plan.hour, brand.timezone);
            const accountKeys = BRAND_ACCOUNTS[brand.key];
            const mediaKeys = index % 3 === 0 ? [MEDIA_FOR_POST[index % MEDIA_FOR_POST.length]] : [];
            const postKey = `${brand.key}-post-${index}`;

            posts.push({
                key: postKey,
                brandKey: brand.key,
                title,
                caption,
                platform_captions: {},
                accountKeys,
                mediaKeys,
                pillarKey: `${brand.key}-${pillarKey}`,
                angleKey: `${brand.key}-${pillarKey}-a${angleIndex}`,
                scheduled_at: scheduledAt,
                timezone: brand.timezone,
                status: plan.status,
                published_at: plan.status === 'published' ? scheduledAt : null,
                notes: '',
                is_demo: true,
            });

            if (plan.status === 'draft') return;

            accountKeys.forEach((accountKey, accountIndex) => {
                const account = ACCOUNTS.find((a) => a.key === accountKey);
                const published = plan.status === 'published';
                const blocked = plan.status === 'failed';
                jobs.push({
                    postKey,
                    accountKey,
                    brandKey: brand.key,
                    accountName: account.name,
                    platform: 'facebook',
                    status: published ? 'published' : blocked ? 'blocked' : 'pending',
                    scheduled_for: scheduledAt,
                    attempts: published ? 1 : blocked ? 1 : 0,
                    max_attempts: 3,
                    external_post_id: published ? `DEMO-${brand.key.toUpperCase()}-${1000 + index * 10 + accountIndex}` : '',
                    published_url: '',
                    error_message: blocked
                        ? 'Meta connection required: no approved Facebook Pages connection is available for this workspace, so nothing was sent to Facebook.'
                        : '',
                    last_attempt_at: published || blocked ? scheduledAt : null,
                    is_demo: true,
                });
                logs.push({
                    postKey,
                    jobIndex: jobs.length - 1,
                    account_name: account.name,
                    platform: 'facebook',
                    level: published ? 'success' : blocked ? 'error' : 'info',
                    message: published
                        ? 'Sample dataset: destination recorded as published. No external API call was made.'
                        : blocked
                            ? 'Job blocked before any API call — Meta connection not configured.'
                            : 'Queued for publishing in the sample dataset.',
                    occurred_at: scheduledAt,
                    is_demo: true,
                });
            });
        });
    });

    return {
        brands,
        accounts: ACCOUNTS.map((a) => ({
            ...a,
            platform: a.platform || 'facebook',
            account_type: a.account_type || 'page',
            connection_status: a.connection_status || 'demo',
            brand_id: '',
            avatar_url: '',
            last_synced_at: null,
            is_demo: true,
        })),
        media: MEDIA.map((m) => ({ ...m, file_type: m.file_type || 'image', mime_type: 'image/jpeg', size_bytes: 420000, is_demo: true })),
        pillars,
        angles,
        posts,
        jobs,
        logs,
    };
};