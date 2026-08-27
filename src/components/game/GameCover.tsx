/**
 * @file src/components/game/GameCover.tsx
 * @description Bìa minh hoạ cho từng game, vẽ bằng SVG theo loại engine.
 *
 * Trước đây mỗi game chỉ có một emoji trong ô vuông màu. Mười emoji cạnh nhau
 * trông rời rạc, và ở cỡ nhỏ thì gần như không phân biệt được.
 *
 * Ở đây bìa được **sinh ra từ dữ liệu sẵn có**: `engine` quyết định hoạ tiết,
 * `color` quyết định tông màu. Nhìn hoạ tiết là đoán được game dạy gì —
 *
 *   sql    → hàng bảng dữ liệu sáng dần
 *   shell  → dòng lệnh terminal gõ ra
 *   git    → đồ thị commit rẽ nhánh rồi gộp
 *   script → dấu ngoặc và dòng code thụt lề
 *
 * Không cần vẽ tay mười tấm, thêm game mới cũng tự có bìa.
 */
import React from 'react';

interface Props {
    engine: string;
    color: string;
    /** Biểu tượng cũ, vẫn hiện đè lên bìa cho dễ nhận ra */
    icon?: string;
    locked?: boolean;
    className?: string;
}

const GameCover: React.FC<Props> = ({ engine, color, icon, locked = false, className = '' }) => (
    <div
        className={`relative shrink-0 overflow-hidden rounded-xl border border-cq-line/60 ${className}`}
        style={{
            background: `linear-gradient(150deg, ${color}33, ${color}0d 55%, transparent)`,
            filter: locked ? 'grayscale(1)' : undefined,
        }}
        aria-hidden="true"
    >
        <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full" fill="none">
            <Pattern engine={engine} color={color} />
        </svg>

        {/* Quầng sáng góc trên, tạo chiều sâu */}
        <span
            className="pointer-events-none absolute -left-2 -top-2 h-10 w-10 rounded-full blur-xl"
            style={{ backgroundColor: `${color}55` }}
        />

        {icon && (
            <span className="absolute inset-0 grid place-items-center text-2xl drop-shadow-lg">
                {locked ? '🔒' : icon}
            </span>
        )}
    </div>
);

/** Hoạ tiết theo loại engine. Toạ độ trong hệ 64×64. */
const Pattern: React.FC<{ engine: string; color: string }> = ({ engine, color }) => {
    const stroke = { stroke: color, strokeWidth: 1.4, strokeLinecap: 'round' as const, opacity: 0.55 };

    if (engine === 'shell') {
        // Dòng lệnh terminal, độ dài khác nhau, sáng so le
        return (
            <g>
                {[14, 24, 34, 44].map((y, i) => (
                    <g key={y} className="animate-cq-breathe" style={{ animationDelay: `${i * 420}ms` }}>
                        <path d={`M8 ${y} l4 3 -4 3`} {...stroke} fill="none" />
                        <path d={`M18 ${y + 3} H${34 + (i % 3) * 9}`} {...stroke} />
                    </g>
                ))}
                <rect x="8" y="52" width="6" height="7" rx="1" fill={color} opacity="0.75" className="animate-cq-caret" />
            </g>
        );
    }

    if (engine === 'git') {
        // Đồ thị commit: một nhánh tách ra rồi gộp lại
        return (
            <g>
                <path d="M14 6 V58" {...stroke} />
                <path d="M14 22 C14 16, 44 16, 44 24 V38 C44 46, 14 46, 14 40" {...stroke} fill="none" />
                {[
                    { cx: 14, cy: 12 },
                    { cx: 14, cy: 30 },
                    { cx: 14, cy: 50 },
                    { cx: 44, cy: 24 },
                    { cx: 44, cy: 38 },
                ].map((c, i) => (
                    <circle
                        key={`${c.cx}-${c.cy}`}
                        cx={c.cx}
                        cy={c.cy}
                        r="3.4"
                        fill={color}
                        opacity="0.85"
                        className="animate-cq-breathe"
                        style={{ animationDelay: `${i * 300}ms` }}
                    />
                ))}
            </g>
        );
    }

    if (engine === 'sql') {
        // Bảng dữ liệu: hàng tiêu đề đậm, các hàng dưới sáng dần như đang truy vấn
        return (
            <g>
                <rect x="7" y="10" width="50" height="10" rx="2" fill={color} opacity="0.4" />
                {[24, 34, 44].map((y, i) => (
                    <g key={y} className="animate-cq-breathe" style={{ animationDelay: `${i * 480}ms` }}>
                        <rect x="7" y={y} width="50" height="8" rx="2" fill={color} opacity="0.14" />
                        <rect x="10" y={y + 2.5} width="14" height="3" rx="1.5" fill={color} opacity="0.6" />
                        <rect x="28" y={y + 2.5} width={10 + i * 6} height="3" rx="1.5" fill={color} opacity="0.4" />
                    </g>
                ))}
                <path d="M7 22 H57" {...stroke} />
            </g>
        );
    }

    // script — dấu ngoặc lớn hai bên, các dòng code thụt lề ở giữa
    return (
        <g>
            <path d="M20 10 C12 10, 12 28, 8 32 C12 36, 12 54, 20 54" {...stroke} fill="none" strokeWidth="2" />
            <path d="M44 10 C52 10, 52 28, 56 32 C52 36, 52 54, 44 54" {...stroke} fill="none" strokeWidth="2" />
            {[20, 28, 36, 44].map((y, i) => (
                <rect
                    key={y}
                    x={20 + (i % 2) * 5}
                    y={y}
                    width={18 - (i % 3) * 4}
                    height="3"
                    rx="1.5"
                    fill={color}
                    opacity="0.55"
                    className="animate-cq-breathe"
                    style={{ animationDelay: `${i * 360}ms` }}
                />
            ))}
        </g>
    );
};

export default GameCover;
