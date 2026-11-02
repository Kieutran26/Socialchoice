// Built-in curated directory of verified LinkedIn organizations (vanity name -> id & official name)
// Allows instant @company autocomplete even without LinkedIn Community Management Enterprise API approval.

export const BUILTIN_LINKEDIN_ORGANIZATIONS = [
    // Global Tech Giants & Platforms
    { id: '1035', name: 'Microsoft', vanity: 'microsoft' },
    { id: '1441', name: 'Google', vanity: 'google' },
    { id: '10667', name: 'Facebook', vanity: 'facebook' },
    { id: '10667', name: 'Meta', vanity: 'meta' },
    { id: '1586', name: 'Amazon', vanity: 'amazon' },
    { id: '162479', name: 'Apple', vanity: 'apple' },
    { id: '3437', name: 'IBM', vanity: 'ibm' },
    { id: '1025', name: 'Oracle', vanity: 'oracle' },
    { id: '1337', name: 'LinkedIn', vanity: 'linkedin' },
    { id: '1680', name: 'Intel Corporation', vanity: 'intel-corporation' },
    { id: '3608', name: 'NVIDIA', vanity: 'nvidia' },
    { id: '9677', name: 'Salesforce', vanity: 'salesforce' },
    { id: '1063', name: 'Cisco', vanity: 'cisco' },
    { id: '15564', name: 'Tesla', vanity: 'tesla-motors' },
    { id: '16615', name: 'Netflix', vanity: 'netflix' },
    { id: '1497', name: 'Adobe', vanity: 'adobe' },
    { id: '2808457', name: 'Spotify', vanity: 'spotify' },
    { id: '13473', name: 'GitHub', vanity: 'github' },
    { id: '1668', name: 'OpenAI', vanity: 'openai' },
    { id: '1138', name: 'Dell Technologies', vanity: 'delltechnologies' },
    { id: '1318', name: 'HP', vanity: 'hp' },
    { id: '1288', name: 'SAP', vanity: 'sap' },
    { id: '1657', name: 'Sony', vanity: 'sony' },
    { id: '1483', name: 'Samsung Electronics', vanity: 'samsung-electronics' },

    // International Organizations, Governments & Media
    { id: '4949', name: 'European Commission', vanity: 'european-commission' },
    { id: '2866', name: 'European Union', vanity: 'european-union' },
    { id: '3382', name: 'United Nations', vanity: 'united-nations' },
    { id: '1669', name: 'World Health Organization', vanity: 'world-health-organization' },
    { id: '1814', name: 'The World Bank', vanity: 'the-world-bank' },
    { id: '1480', name: 'BBC', vanity: 'bbc' },
    { id: '1426', name: 'CNN', vanity: 'cnn' },
    { id: '2028', name: 'Reuters', vanity: 'reuters' },
    { id: '1093', name: 'Forbes', vanity: 'forbes-magazine' },
    { id: '1572', name: 'Bloomberg LP', vanity: 'bloomberg' },
    { id: '1342', name: 'The New York Times', vanity: 'the-new-york-times' },

    // Top Universities & Academic Institutions
    { id: '1646', name: 'Harvard University', vanity: 'harvard-university' },
    { id: '1665', name: 'Stanford University', vanity: 'stanford-university' },
    { id: '1505', name: 'Massachusetts Institute of Technology', vanity: 'mit' },
    { id: '1540', name: 'University of Oxford', vanity: 'university-of-oxford' },
    { id: '1584', name: 'University of Cambridge', vanity: 'university-of-cambridge' },

    // Top Vietnamese Enterprises & Tech Companies
    { id: '254504', name: 'FPT Software', vanity: 'fpt-software' },
    { id: '34305', name: 'FPT Corporation', vanity: 'fpt-corporation' },
    { id: '61917', name: 'Viettel Group', vanity: 'viettel-group' },
    { id: '369651', name: 'Vingroup JSC', vanity: 'vingroup-jsc' },
    { id: '13361845', name: 'VinFast', vanity: 'vinfastofficial' },
    { id: '1452281', name: 'VNPT', vanity: 'vnpt-group' },
    { id: '1326462', name: 'VNG Corporation', vanity: 'vng-corporation' },
    { id: '2491565', name: 'Momo (M-Service)', vanity: 'momo-mservice' },
    { id: '124976', name: 'Vietcombank', vanity: 'vietcombank' },
    { id: '529524', name: 'Techcombank', vanity: 'techcombank' },
    { id: '1370258', name: 'MBBank', vanity: 'mbbank' },
    { id: '704207', name: 'VPBank', vanity: 'vpbank' },
    { id: '3813359', name: 'Tiki.vn', vanity: 'tiki-vn' },
    { id: '10292350', name: 'Shopee', vanity: 'shopee' },
    { id: '3203487', name: 'Grab', vanity: 'grabapp' },
    { id: '3543324', name: 'Gojek', vanity: 'gojek' },
    { id: '1318059', name: 'Masan Group', vanity: 'masan-group' },
    { id: '15096530', name: 'Vinamilk', vanity: 'vinamilk' },
];

const LOCAL_STORAGE_KEY = 'socialchoice_linkedin_custom_mentions';

export function getCustomLinkedinOrganizations() {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
        const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function saveCustomLinkedinOrganization({ id, name, vanity = '' }) {
    if (!id || !name || typeof window === 'undefined' || !window.localStorage) return;
    try {
        const cleanId = String(id).trim().replace(/^urn:li:organization:/, '');
        const cleanName = String(name).trim();
        const cleanVanity = String(vanity).trim().toLowerCase();
        if (!cleanId || !cleanName) return;

        const list = getCustomLinkedinOrganizations().filter(org => String(org.id) !== cleanId);
        list.unshift({ id: cleanId, name: cleanName, vanity: cleanVanity });
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list.slice(0, 200)));
    } catch {
        // Safe fallback
    }
}

