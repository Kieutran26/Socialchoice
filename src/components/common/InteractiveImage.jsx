import { useId, useState } from 'react';

/** Coordinates are percentages of the image, so highlights follow responsive resizing. */
export default function InteractiveImage({ src, alt, hotspots, clearLabel }) {
    const maskId = useId().replace(/:/g, '');
    const [active, setActive] = useState(null);
    const [hover, setHover] = useState(null);
    const selected = hotspots.find(item => item.id === active);
    return <div onKeyDown={event => { if (event.key === 'Escape') { setActive(null); setHover(null); } }}>
        <div className="relative isolate overflow-hidden rounded-xl border bg-muted">
            <img src={src} alt={alt} className="block w-full h-auto" draggable={false} />
            {selected && <>
                <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <defs><mask id={maskId}><rect width="100" height="100" fill="white" /><rect x={selected.x} y={selected.y} width={selected.width} height={selected.height} fill="black" /></mask></defs>
                    <rect width="100" height="100" fill="black" opacity="0.65" mask={`url(#${maskId})`} />
                </svg>
                <button type="button" className="absolute inset-0 cursor-default" aria-label={clearLabel} onClick={() => setActive(null)} />
                <div className="absolute pointer-events-none border-2 border-brand rounded-sm" style={{ left: `${selected.x}%`, top: `${selected.y}%`, width: `${selected.width}%`, height: `${selected.height}%` }} />
            </>}
            {hotspots.map((item, index) => <div key={item.id} className="absolute" style={{ left: `${item.x}%`, top: `${item.y}%` }}>
                <button type="button" className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-card font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${active === item.id ? 'bg-brand text-brand-ink' : 'bg-foreground text-background'}`}
                    aria-label={`${index + 1}. ${item.title}`} aria-pressed={active === item.id} aria-describedby={hover === item.id ? `${maskId}-${item.id}` : undefined}
                    onMouseEnter={() => setHover(item.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(item.id)} onBlur={() => setHover(null)}
                    onClick={() => setActive(value => value === item.id ? null : item.id)}>{index + 1}</button>
            </div>)}
        </div>
        {hover !== null && <div role="tooltip" id={`${maskId}-${hover}`} className="mt-3 rounded-lg border bg-popover text-popover-foreground p-3 text-sm break-words">
            <strong>{hotspots.find(item => item.id === hover)?.title}</strong><p className="mt-1 whitespace-pre-wrap">{hotspots.find(item => item.id === hover)?.description}</p>
        </div>}
        {selected && hover !== active && <div className="mt-3 text-sm break-words" role="status"><strong>{selected.title}</strong><p className="mt-1 whitespace-pre-wrap">{selected.description}</p></div>}
    </div>;
}
