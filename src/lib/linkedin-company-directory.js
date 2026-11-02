// Built-in curated directory of verified LinkedIn organizations (vanity name -> id, official name, domain & avatar)
// Allows instant @company autocomplete with company avatars even without LinkedIn Community Management Enterprise API approval.

const avatarForDomain = (domain) =>
    domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128` : '';

const RAW_ORGANIZATIONS = [
    // Global Tech Giants & Platforms
    { id: '1035', name: 'Microsoft', vanity: 'microsoft', domain: 'microsoft.com' },
    { id: '1441', name: 'Google', vanity: 'google', domain: 'google.com' },
    { id: '10667', name: 'Meta', vanity: 'meta', domain: 'meta.com' },
    { id: '10667', name: 'Facebook', vanity: 'facebook', domain: 'facebook.com' },
    { id: '1586', name: 'Amazon', vanity: 'amazon', domain: 'amazon.com' },
    { id: '162479', name: 'Apple', vanity: 'apple', domain: 'apple.com' },
    { id: '3437', name: 'IBM', vanity: 'ibm', domain: 'ibm.com' },
    { id: '1025', name: 'Oracle', vanity: 'oracle', domain: 'oracle.com' },
    { id: '1337', name: 'LinkedIn', vanity: 'linkedin', domain: 'linkedin.com' },
    { id: '1680', name: 'Intel Corporation', vanity: 'intel-corporation', domain: 'intel.com' },
    { id: '3608', name: 'NVIDIA', vanity: 'nvidia', domain: 'nvidia.com' },
    { id: '9677', name: 'Salesforce', vanity: 'salesforce', domain: 'salesforce.com' },
    { id: '1063', name: 'Cisco', vanity: 'cisco', domain: 'cisco.com' },
    { id: '15564', name: 'Tesla', vanity: 'tesla-motors', domain: 'tesla.com' },
    { id: '16615', name: 'Netflix', vanity: 'netflix', domain: 'netflix.com' },
    { id: '1497', name: 'Adobe', vanity: 'adobe', domain: 'adobe.com' },
    { id: '2808457', name: 'Spotify', vanity: 'spotify', domain: 'spotify.com' },
    { id: '13473', name: 'GitHub', vanity: 'github', domain: 'github.com' },
    { id: '11130470', name: 'OpenAI', vanity: 'openai', domain: 'openai.com' },
    { id: '1138', name: 'Dell Technologies', vanity: 'delltechnologies', domain: 'dell.com' },
    { id: '1318', name: 'HP', vanity: 'hp', domain: 'hp.com' },
    { id: '1288', name: 'SAP', vanity: 'sap', domain: 'sap.com' },
    { id: '1657', name: 'Sony', vanity: 'sony', domain: 'sony.com' },
    { id: '1483', name: 'Samsung Electronics', vanity: 'samsung-electronics', domain: 'samsung.com' },
    { id: '11197074', name: 'Canva', vanity: 'canva', domain: 'canva.com' },
    { id: '3552708', name: 'TikTok', vanity: 'tiktok', domain: 'tiktok.com' },
    { id: '166388', name: 'YouTube', vanity: 'youtube', domain: 'youtube.com' },
    { id: '3178878', name: 'Stripe', vanity: 'stripe', domain: 'stripe.com' },
    { id: '784652', name: 'Shopify', vanity: 'shopify', domain: 'shopify.com' },
    { id: '3290211', name: 'Zoom', vanity: 'zoom-video-communications', domain: 'zoom.us' },
    { id: '2751', name: 'Accenture', vanity: 'accenture', domain: 'accenture.com' },
    { id: '1038', name: 'Deloitte', vanity: 'deloitte', domain: 'deloitte.com' },
    { id: '1044', name: 'PwC', vanity: 'pwc', domain: 'pwc.com' },
    { id: '1073', name: 'EY', vanity: 'ernstandyoung', domain: 'ey.com' },
    { id: '2525300', name: 'KPMG', vanity: 'kpmg', domain: 'kpmg.com' },
    { id: '1371', name: 'McKinsey & Company', vanity: 'mckinsey', domain: 'mckinsey.com' },
    { id: '1784', name: 'Boston Consulting Group (BCG)', vanity: 'boston-consulting-group', domain: 'bcg.com' },

    // International Organizations, Governments & Media
    { id: '1809', name: 'European Commission', vanity: 'european-commission', domain: 'ec.europa.eu' },
    { id: '1816', name: 'European Parliament', vanity: 'european-parliament', domain: 'europarl.europa.eu' },
    { id: '2866', name: 'European Union', vanity: 'european-union', domain: 'europa.eu' },
    { id: '3382', name: 'United Nations', vanity: 'united-nations', domain: 'un.org' },
    { id: '1669', name: 'World Health Organization', vanity: 'world-health-organization', domain: 'who.int' },
    { id: '1814', name: 'The World Bank', vanity: 'the-world-bank', domain: 'worldbank.org' },
    { id: '1480', name: 'BBC', vanity: 'bbc', domain: 'bbc.com' },
    { id: '1426', name: 'CNN', vanity: 'cnn', domain: 'cnn.com' },
    { id: '2028', name: 'Reuters', vanity: 'reuters', domain: 'reuters.com' },
    { id: '1093', name: 'Forbes', vanity: 'forbes-magazine', domain: 'forbes.com' },
    { id: '1572', name: 'Bloomberg LP', vanity: 'bloomberg', domain: 'bloomberg.com' },
    { id: '1342', name: 'The New York Times', vanity: 'the-new-york-times', domain: 'nytimes.com' },

    // Top Universities & Academic Institutions
    { id: '1646', name: 'Harvard University', vanity: 'harvard-university', domain: 'harvard.edu' },
    { id: '1665', name: 'Stanford University', vanity: 'stanford-university', domain: 'stanford.edu' },
    { id: '1505', name: 'Massachusetts Institute of Technology', vanity: 'mit', domain: 'mit.edu' },
    { id: '1540', name: 'University of Oxford', vanity: 'university-of-oxford', domain: 'ox.ac.uk' },
    { id: '1584', name: 'University of Cambridge', vanity: 'university-of-cambridge', domain: 'cam.ac.uk' },

    // Top Vietnamese Enterprises, E-Commerce, Banking & Tech Companies
    { id: '6451760', name: 'Shopee', vanity: 'shopee', domain: 'shopee.vn' },
    { id: '2938573', name: 'ShopeePay', vanity: 'shopeepay', domain: 'shopeepay.vn' },
    { id: '2790704', name: 'Lazada', vanity: 'lazada', domain: 'lazada.vn' },
    { id: '890815', name: 'TIKI', vanity: 'tiki-vn', domain: 'tiki.vn' },
    { id: '5382086', name: 'Grab', vanity: 'grabapp', domain: 'grab.com' },
    { id: '3543324', name: 'Gojek', vanity: 'gojek', domain: 'gojek.com' },
    { id: '208401', name: 'FPT Software', vanity: 'fpt-software', domain: 'fptsoftware.com' },
    { id: '14616208', name: 'FPT Corporation', vanity: 'fpt-corporation', domain: 'fpt.com' },
    { id: '13374020', name: 'Viettel Group', vanity: 'viettel-group', domain: 'viettel.com.vn' },
    { id: '13272776', name: 'Vingroup JSC', vanity: 'vingroup-jsc', domain: 'vingroup.net' },
    { id: '14397297', name: 'VINFAST', vanity: 'vinfast', domain: 'vinfastauto.com' },
    { id: '1452281', name: 'VNPT', vanity: 'vnpt-group', domain: 'vnpt.com.vn' },
    { id: '1059735', name: 'VNG', vanity: 'vng-corporation', domain: 'vng.com.vn' },
    { id: '13688376', name: 'MoMo (M_Service)', vanity: 'momo-mservice', domain: 'momo.vn' },
    { id: '41418', name: 'Vietcombank', vanity: 'vietcombank', domain: 'vietcombank.com.vn' },
    { id: '343210', name: 'Techcombank (TCB)', vanity: 'techcombank', domain: 'techcombank.com' },
    { id: '14390800', name: 'MBBank', vanity: 'mbbank', domain: 'mbbank.com.vn' },
    { id: '938339', name: 'VPBank', vanity: 'vpbank', domain: 'vpbank.com.vn' },
    { id: '90672235', name: 'Masan Group', vanity: 'masan-group', domain: 'masangroup.com' },
    { id: '914574', name: 'Vinamilk', vanity: 'vinamilk', domain: 'vinamilk.com.vn' },
];

export const BUILTIN_LINKEDIN_ORGANIZATIONS = RAW_ORGANIZATIONS.map(org => ({
    ...org,
    avatar: avatarForDomain(org.domain || `${org.vanity}.com`),
}));

export function companyAvatarForNameOrVanity(name = '', vanity = '', explicitAvatar = '') {
    if (explicitAvatar) return explicitAvatar;
    const normName = String(name).trim().toLowerCase();
    const normVanity = String(vanity).trim().toLowerCase();
    const found = BUILTIN_LINKEDIN_ORGANIZATIONS.find(
        org => org.name.toLowerCase() === normName || (normVanity && org.vanity.toLowerCase() === normVanity)
    );
    if (found?.avatar) return found.avatar;
    const guessedSlug = (normVanity || normName).replace(/[^a-z0-9]/g, '');
    return guessedSlug ? avatarForDomain(`${guessedSlug}.com`) : '';
}

const LOCAL_STORAGE_KEY = 'socialchoice_linkedin_custom_mentions';

export function getCustomLinkedinOrganizations() {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
        const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed)
            ? parsed.map(org => ({
                  ...org,
                  avatar: org.avatar || companyAvatarForNameOrVanity(org.name, org.vanity),
              }))
            : [];
    } catch {
        return [];
    }
}

export function saveCustomLinkedinOrganization({ id, name, vanity = '', avatar = '' }) {
    if (!id || !name || typeof window === 'undefined' || !window.localStorage) return;
    try {
        const cleanId = String(id).trim().replace(/^urn:li:organization:/, '');
        const cleanName = String(name).trim();
        const cleanVanity = String(vanity).trim().toLowerCase();
        if (!cleanId || !cleanName) return;
        const resolvedAvatar = avatar || companyAvatarForNameOrVanity(cleanName, cleanVanity);

        const list = getCustomLinkedinOrganizations().filter(org => String(org.id) !== cleanId);
        list.unshift({ id: cleanId, name: cleanName, vanity: cleanVanity, avatar: resolvedAvatar });
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list.slice(0, 200)));
    } catch {
        // Safe fallback
    }
}
