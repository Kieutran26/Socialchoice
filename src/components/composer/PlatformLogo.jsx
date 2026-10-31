import React from 'react';

/**
 * Standard authentic brand logo for social platforms
 * @param {{ platform: string, size?: number, className?: string }} props
 */
export default function PlatformLogo({ platform, size = 32, className = '' }) {
    switch (platform) {
        case 'facebook':
            return (
                <div
                    className={`flex shrink-0 items-center justify-center rounded-full bg-[#1877F2] text-white shadow-2xs ${className}`}
                    style={{ width: size, height: size }}
                >
                    <svg viewBox="0 0 24 24" className="w-[58%] h-[58%] fill-current" aria-hidden="true">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                </div>
            );
        case 'instagram':
            return (
                <div
                    className={`flex shrink-0 items-center justify-center rounded-full text-white shadow-2xs ${className}`}
                    style={{
                        width: size,
                        height: size,
                        background: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)',
                    }}
                >
                    <svg viewBox="0 0 24 24" className="w-[56%] h-[56%] fill-current" aria-hidden="true">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                </div>
            );
        case 'linkedin':
            return (
                <div
                    className={`flex shrink-0 items-center justify-center rounded-full bg-[#0A66C2] text-white shadow-2xs ${className}`}
                    style={{ width: size, height: size }}
                >
                    <svg viewBox="0 0 24 24" className="w-[56%] h-[56%] fill-current" aria-hidden="true">
                        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                    </svg>
                </div>
            );
        case 'tiktok':
            return (
                <div
                    className={`flex shrink-0 items-center justify-center rounded-full bg-black text-white shadow-2xs ${className}`}
                    style={{ width: size, height: size }}
                >
                    <svg viewBox="0 0 24 24" className="w-[56%] h-[56%] fill-current" aria-hidden="true">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.12V9.42a6.34 6.34 0 0 0-6.61 6.34 6.34 6.34 0 0 0 10.82 4.48 6.27 6.27 0 0 0 1.83-4.48V8.34a8.16 8.16 0 0 0 4.81 1.57V6.69z" />
                    </svg>
                </div>
            );
        case 'threads':
            return (
                <div
                    className={`flex shrink-0 items-center justify-center rounded-full bg-black text-white shadow-2xs ${className}`}
                    style={{ width: size, height: size }}
                >
                    <svg viewBox="0 0 24 24" className="w-[56%] h-[56%] fill-current" aria-hidden="true">
                        <path d="M12.186 24C5.508 24 0 18.636 0 12.146 0 5.602 5.508.24 12.186.24c6.626 0 12.134 5.362 12.134 11.906 0 3.268-1.282 6.348-3.606 8.672-2.325 2.324-5.405 3.606-8.674 3.606v-2.39c2.634 0 5.116-1.032 6.984-2.9 1.868-1.868 2.9-4.35 2.9-6.988 0-5.244-4.417-9.516-9.744-9.516-5.326 0-9.743 4.272-9.743 9.516 0 5.245 4.417 9.516 9.743 9.516 1.84 0 3.626-.525 5.163-1.517l1.328 1.986c-1.954 1.261-4.225 1.921-6.572 1.921zm-.09-6.666c-2.97 0-5.385-2.416-5.385-5.386 0-2.97 2.415-5.385 5.385-5.385 2.97 0 5.385 2.415 5.385 5.385 0 .693-.132 1.355-.374 1.966l2.128 1.096c.414-.943.636-1.981.636-3.062 0-4.286-3.489-7.775-7.775-7.775-4.286 0-7.775 3.489-7.775 7.775 0 4.286 3.489 7.775 7.775 7.775 2.016 0 3.864-.77 5.263-2.032l-1.579-1.792c-1.01.91-2.33 1.439-3.684 1.439z" />
                    </svg>
                </div>
            );
        default:
            return null;
    }
}

