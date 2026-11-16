export default function ZaloIcon({ size = 16, className = '', style = {}, ...props }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`shrink-0 ${className}`}
            style={style}
            {...props}
        >
            <rect width="24" height="24" rx="5.5" fill="#0068FF" />
            <text
                x="12"
                y="15.5"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="8.5"
                fontWeight="800"
                fontFamily="system-ui, -apple-system, sans-serif"
                letterSpacing="-0.3px"
            >
                Zalo
            </text>
        </svg>
    );
}
