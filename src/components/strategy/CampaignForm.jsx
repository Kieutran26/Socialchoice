import { useTranslation } from '@/lib/i18n';
import EntityForm from '../common/EntityForm';

export default function CampaignForm({ brands, defaultBrandId, ...props }) {
    const { t } = useTranslation();

    return (
        <EntityForm
            {...props}
            title={props.initial ? t('Chỉnh sửa chiến dịch') : t('Tạo chiến dịch mới')}
            defaults={{
                name: '',
                description: '',
                utm_campaign: '',
                start_date: '',
                end_date: '',
                color: '#ffd631',
                status: 'active',
                brand_id: defaultBrandId || brands[0]?.id || '',
            }}
            fields={[
                {
                    key: 'brand_id',
                    label: t('Thương hiệu'),
                    required: true,
                    options: brands.map((b) => ({ value: b.id, label: b.name })),
                },
                {
                    key: 'name',
                    label: t('Tên chiến dịch'),
                    required: true,
                    placeholder: 'VD: Khai xuân đón lộc Tết 2027',
                },
                {
                    key: 'utm_campaign',
                    label: t('Mã UTM Campaign (tự động gắn link tracking)'),
                    placeholder: 'VD: tet_2027, black_friday',
                },
                {
                    key: 'start_date',
                    label: t('Ngày bắt đầu'),
                    type: 'date',
                },
                {
                    key: 'end_date',
                    label: t('Ngày kết thúc'),
                    type: 'date',
                },
                {
                    key: 'color',
                    label: t('Màu nhận diện chiến dịch'),
                    type: 'color',
                },
                {
                    key: 'description',
                    label: t('Mục tiêu & Ghi chú chiến dịch'),
                    type: 'textarea',
                    placeholder: 'VD: Mục tiêu tăng 30% doanh thu, tập trung góc khai thác quà tặng và lì xì...',
                },
            ]}
        />
    );
}
