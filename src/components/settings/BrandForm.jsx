import { useTranslation } from '@/lib/i18n';
import EntityForm from '../common/EntityForm';
import { DEFAULT_TIMEZONE, TIMEZONES } from '@/lib/constants';
export default function BrandForm(/** @type {import("../component-types").FormProps} */ props) { const { t } = useTranslation(); return <EntityForm {...props} title={props.initial ? t("Edit brand") : t("New brand")} defaults={{ name: '', description: '', color: '#79D94B', timezone: DEFAULT_TIMEZONE, status: 'active' }} fields={[{ key: 'name', label: t("Brand name"), required: true }, { key: 'description', label: t("Description"), type: 'textarea' }, { key: 'color', label: t("Color"), type: 'color' }, { key: 'timezone', label: t("Timezone"), required: true, options: TIMEZONES.map(value => ({ value, label: value })) }]} />; }
