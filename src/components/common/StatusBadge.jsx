const tones = { neutral: 'bg-muted text-muted-foreground', success: 'bg-successBg text-successFg', warn: 'bg-warnBg text-warnFg', danger: 'bg-dangerBg text-dangerFg', info: 'bg-infoBg text-infoFg' };
export default function StatusBadge({ tone = 'neutral', children }) { return <span className={`inline-flex rounded-md px-2 py-1 text-[11px] ${tones[tone] || tones.neutral}`}>{children}</span>; }
