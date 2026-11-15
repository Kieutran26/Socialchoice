import { useTranslation } from '@/lib/i18n';
import EntityForm from '../common/EntityForm';

export default function PillarForm({ brands, defaultBrandId, campaigns = [], ...props }) {
    const { t } = useTranslation();
    return (
        <EntityForm
            {...props}
            title={props.initial ? t('Edit pillar') : t('New pillar')}
            defaults={{
                name: '',
                description: '',
                color: '#79D94B',
                target_percentage: 0,
                status: 'active',
                campaign_id: '',
                brand_id: defaultBrandId || brands[0]?.id || '',
            }}
            fields={[
                {
                    key: 'brand_id',
                    label: t('Brand'),
                    required: true,
                    options: brands.map((b) => ({ value: b.id, label: b.name })),
                    reset: () => ({ campaign_id: '' }),
                },
                ...(campaigns.length > 0
                    ? [
                        {
                            key: 'campaign_id',
                            label: t('Chiến dịch liên kết (tuỳ chọn)'),
                            options: (values) => [
                                { value: '', label: t('Chung (toàn thương hiệu)') },
                                ...campaigns
                                    .filter((c) => !values.brand_id || c.brand_id === values.brand_id)
                                    .map((c) => ({ value: c.id, label: c.name })),
                            ],
                        },
                    ]
                    : []),
                { key: 'name', label: t('Pillar name'), required: true },
                { key: 'description', label: t('Description'), type: 'textarea' },
                { key: 'color', label: t('Color'), type: 'color' },
                {
                    key: 'target_percentage',
                    label: t('Target percentage (0–100)'),
                    type: 'number',
                    min: 0,
                    max: 100,
                    required: true,
                },
            ]}
        />
    );
}
