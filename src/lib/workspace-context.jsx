import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { appClient } from '@/api/app-client';
import { seedDemoWorkspace } from './demo-seed';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
    const [brands, setBrands] = useState([]);
    const [selectedBrandId, setSelectedBrandId] = useState('all');
    const [demoMode, setDemoMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [seeding, setSeeding] = useState(false);

    const loadBrands = useCallback(async (demo) => {
        const page = await appClient.entities.Brand.filter(
            { is_demo: demo, status: 'active' },
            { sort: 'name', limit: 100 },
        );
        setBrands(page.items);
        return page.items;
    }, []);

    useEffect(() => {
        let active = true;
        (async () => {
            await loadBrands(false);
            if (active) setLoading(false);
        })();
        return () => {
            active = false;
        };
    }, [loadBrands]);

    const switchMode = useCallback(
        async (demo) => {
            if (demo && await appClient.entities.Brand.count({ is_demo: true }) === 0) {
                setSeeding(true);
                try { await seedDemoWorkspace(); } finally { setSeeding(false); }
            }
            setDemoMode(demo);
            setSelectedBrandId('all');
            setLoading(true);
            await loadBrands(demo);
            setLoading(false);
        },
        [loadBrands],
    );

    const reload = useCallback(() => loadBrands(demoMode), [demoMode, loadBrands]);

    const activeBrand = brands.find((b) => b.id === selectedBrandId) || null;
    const scope = useMemo(() => ({ is_demo: demoMode, ...(selectedBrandId === 'all' ? {} : { brand_id: selectedBrandId }) }), [demoMode, selectedBrandId]);

    const value = {
        brands,
        loading,
        seeding,
        selectedBrandId,
        setSelectedBrandId,
        activeBrand,
        demoMode,
        switchMode,
        reload,
        scope,
        timezone: activeBrand?.timezone || 'Asia/Ho_Chi_Minh',
    };

    return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export const useWorkspace = () => {
    const context = useContext(WorkspaceContext);
    if (!context) throw new Error('useWorkspace must be used inside WorkspaceProvider');
    return context;
};
