import { useTranslation } from '@/lib/i18n';

export default function MediaAttachments({ media = [] }) {
    const { t } = useTranslation();
    if (!media.length) return <p className="label-xs">{t('No media')}</p>;
    return <div className={media[0]?.file_type === 'video' ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-2 sm:grid-cols-3 gap-2'}>
        {media.map((asset, index) => <div key={asset.id} className="min-w-0">
            {asset.file_type === 'video'
                ? <video src={asset.file_url} controls preload="metadata" className="max-h-64 w-full rounded-lg" />
                : <img src={asset.file_url} alt={asset.name} className="h-28 w-full object-contain rounded-lg border" />}
            <p className="label-xs truncate">{index + 1}. {asset.name}</p>
        </div>)}
    </div>;
}
