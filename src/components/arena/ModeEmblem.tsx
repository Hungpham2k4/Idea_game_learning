/**
 * @file src/components/arena/ModeEmblem.tsx
 * @description Huy hiệu của từng chế độ chơi, vẽ bằng SVG.
 *
 * Thay cho emoji 🗺️⚔️🛡️. Emoji lệ thuộc phông chữ của hệ điều hành nên mỗi máy
 * hiện một kiểu, không đổi được màu theo chủ đề sáng/tối, và không thể cho
 * chuyển động. SVG vẽ tay thì kiểm soát được cả ba.
 */
import React from 'react';

interface Props {
    mode: string;
    size?: number;
    className?: string;
}

const ModeEmblem: React.FC<Props> = ({ mode, size = 44, className = '' }) => {
    const common = {
        width: size,
        height: size,
        viewBox: '0 0 48 48',
        fill: 'none',
        className,
        'aria-hidden': true as const,
    };

    if (mode === 'battle') {
        // Hai thanh kiếm bắt chéo, tia lửa ở điểm chạm
        return (
            <svg {...common}>
                <defs>
                    <linearGradient id="cqBlade" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#f87171" />
                        <stop offset="100%" stopColor="#fb923c" />
                    </linearGradient>
                </defs>
                <g stroke="url(#cqBlade)" strokeWidth="3" strokeLinecap="round">
                    <path d="M12 38 L34 12" />
                    <path d="M36 38 L14 12" />
                </g>
                <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.55">
                    <path d="M10 40 L15 35" />
                    <path d="M38 40 L33 35" />
                </g>
                {/* Tia lửa nhấp nháy tại điểm hai lưỡi chạm nhau */}
                <g className="animate-cq-breathe" style={{ transformOrigin: '24px 25px' }}>
                    <circle cx="24" cy="25" r="3.4" fill="#fbbf24" opacity="0.9" />
                    <path
                        d="M24 17 L25.4 23 L31 24 L25.4 25.4 L24 31 L22.6 25.4 L17 24 L22.6 23 Z"
                        fill="#fde68a"
                        opacity="0.85"
                    />
                </g>
            </svg>
        );
    }

    if (mode === 'board') {
        // Xúc xắc nghiêng, mặt 5 chấm, kèm hai ô bàn cờ phía sau
        return (
            <svg {...common}>
                <defs>
                    <linearGradient id="cqDie" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                </defs>

                {/* Hai ô bàn cờ mờ phía sau, gợi ý đây là trò đi vòng */}
                <rect x="4" y="6" width="11" height="11" rx="2.5" stroke="url(#cqDie)" strokeWidth="1.6" opacity="0.35" />
                <rect x="33" y="31" width="11" height="11" rx="2.5" stroke="url(#cqDie)" strokeWidth="1.6" opacity="0.35" />

                {/* Xúc xắc */}
                <rect
                    x="13"
                    y="13"
                    width="22"
                    height="22"
                    rx="5"
                    fill="url(#cqDie)"
                    fillOpacity="0.16"
                    stroke="url(#cqDie)"
                    strokeWidth="2.2"
                    transform="rotate(-12 24 24)"
                />
                <g transform="rotate(-12 24 24)" className="animate-cq-breathe">
                    {[
                        [18, 18], [30, 18],
                        [24, 24],
                        [18, 30], [30, 30],
                    ].map(([cx, cy]) => (
                        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.4" fill="url(#cqDie)" />
                    ))}
                </g>
            </svg>
        );
    }

    if (mode === 'survival') {
        // Khiên, với ba đợt quái ập vào từ ngoài
        return (
            <svg {...common}>
                <defs>
                    <linearGradient id="cqShield" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4ade80" />
                        <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>
                </defs>
                <path
                    d="M24 6 L38 12 V24 C38 32 32 39 24 42 C16 39 10 32 10 24 V12 Z"
                    fill="url(#cqShield)"
                    fillOpacity="0.18"
                    stroke="url(#cqShield)"
                    strokeWidth="2.4"
                    strokeLinejoin="round"
                />
                <path
                    d="M18 24 L22.5 28.5 L31 19"
                    stroke="url(#cqShield)"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                {/* Ba chấm quái tiến vào, lệch pha nhau */}
                {[
                    { cx: 4, cy: 14, d: '0ms' },
                    { cx: 44, cy: 20, d: '700ms' },
                    { cx: 6, cy: 34, d: '1400ms' },
                ].map((p) => (
                    <circle
                        key={p.cx + '-' + p.cy}
                        cx={p.cx}
                        cy={p.cy}
                        r="2.4"
                        fill="#f87171"
                        className="animate-cq-breathe"
                        style={{ animationDelay: p.d }}
                    />
                ))}
            </svg>
        );
    }

    // territory — lưới ô, một lá cờ cắm ở ô đã chiếm
    return (
        <svg {...common}>
            <defs>
                <linearGradient id="cqTile" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
            </defs>

            {/* Lưới 3×3, ba ô sáng dần so le nhau như đang bị chiếm */}
            {[0, 1, 2].map((r) =>
                [0, 1, 2].map((c) => {
                    const claimed = (r + c) % 2 === 0;
                    return (
                        <rect
                            key={`${r}-${c}`}
                            x={8 + c * 11}
                            y={12 + r * 11}
                            width="9"
                            height="9"
                            rx="2"
                            fill={claimed ? 'url(#cqTile)' : 'transparent'}
                            fillOpacity={claimed ? 0.35 : 0}
                            stroke="url(#cqTile)"
                            strokeWidth="1.6"
                            className={claimed ? 'animate-cq-breathe' : undefined}
                            style={claimed ? { animationDelay: `${(r + c) * 260}ms` } : undefined}
                        />
                    );
                }),
            )}

            {/* Cột cờ */}
            <path d="M31 30 V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M31 9 L41 13 L31 17 Z" fill="url(#cqTile)" />
        </svg>
    );
};

export default ModeEmblem;
