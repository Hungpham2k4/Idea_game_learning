/**
 * @file src/components/arena/board/Dice3D.tsx
 * @description Xúc xắc 3D thật — khối lập phương lăn tới đúng kết quả.
 *
 * Bản cũ chỉ đổi số liên tục rồi dừng. Nhìn ra ngay là "đang giả vờ": không có
 * cảm giác viên xúc xắc lăn tới kết quả đó, mà giống một cái đồng hồ đếm.
 *
 * Ở đây là khối lập phương thật với sáu mặt đặt theo đúng quy ước xúc xắc
 * (tổng hai mặt đối diện luôn bằng 7). Khi đổ, khối quay vài vòng ngẫu nhiên
 * rồi **dừng đúng ở góc** để mặt cần hiện quay về phía người xem.
 *
 *          mặt sau (6)
 *               ┆
 *   trái(4) ── khối ── phải(3)
 *               ┆
 *          mặt trước (1)      trên(2) / dưới(5)
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';

/** Chấm trên mặt xúc xắc, theo lưới 3×3 (cột, hàng). */
const PIPS: Record<number, [number, number][]> = {
    1: [[1, 1]],
    2: [[0, 0], [2, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [2, 0], [0, 2], [2, 2]],
    5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
    6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};

/**
 * Góc quay để mặt N hướng về người xem.
 * Đây là phép quay NGƯỢC với vị trí đặt mặt đó trên khối.
 */
const FACE_ANGLE: Record<number, { x: number; y: number }> = {
    1: { x: 0, y: 0 },
    2: { x: -90, y: 0 },
    3: { x: 0, y: -90 },
    4: { x: 0, y: 90 },
    5: { x: 90, y: 0 },
    6: { x: 0, y: 180 },
};

/**
 * Nghiêng nhẹ lúc dừng, để thấy được đây là một KHỐI chứ không phải hình vuông.
 *
 * Quay thẳng mặt vào người xem thì viên xúc xắc trông y hệt một cái thẻ phẳng —
 * mất hết cảm giác vật thể. Xúc xắc thật lăn xong cũng luôn nằm hơi nghiêng.
 * Góc nhỏ nên mặt cần đọc vẫn rõ.
 */
const REST_TILT = { x: -14, y: 16 };

/** Vị trí đặt từng mặt trên khối lập phương. */
const FACE_TRANSFORM: Record<number, string> = {
    1: 'translateZ(var(--half))',
    6: 'rotateY(180deg) translateZ(var(--half))',
    3: 'rotateY(90deg) translateZ(var(--half))',
    4: 'rotateY(-90deg) translateZ(var(--half))',
    2: 'rotateX(90deg) translateZ(var(--half))',
    5: 'rotateX(-90deg) translateZ(var(--half))',
};

interface Props {
    value: number;
    /** true = đang lăn; chuyển sang false thì khối dừng ở mặt `value` */
    rolling: boolean;
    size?: number;
    /** Lệch pha khi có nhiều viên, để chúng không quay giống hệt nhau */
    index?: number;
}

const Dice3D: React.FC<Props> = ({ value, rolling, size = 64, index = 0 }) => {
    // Số vòng quay thêm — đổi mỗi lần đổ để hai lần liên tiếp không giống nhau
    const [spin, setSpin] = useState({ x: 0, y: 0 });
    const [landed, setLanded] = useState(false);
    const wasRolling = useRef(false);

    useEffect(() => {
        if (rolling && !wasRolling.current) {
            // Bắt đầu lăn: cộng thêm vài vòng đầy, lệch nhau giữa các viên
            setLanded(false);
            setSpin((s) => ({
                x: s.x + 720 + index * 180 + Math.floor(Math.random() * 3) * 360,
                y: s.y + 900 + index * 90 + Math.floor(Math.random() * 3) * 360,
            }));
        }
        if (!rolling && wasRolling.current) {
            // Vừa dừng — loé sáng một cái
            setLanded(true);
            const t = setTimeout(() => setLanded(false), 750);
            wasRolling.current = rolling;
            return () => clearTimeout(t);
        }
        wasRolling.current = rolling;
    }, [rolling, index]);

    const face = Math.min(6, Math.max(1, Math.round(value) || 1));
    const angle = FACE_ANGLE[face];

    const transform = useMemo(
        () =>
            `rotateX(${spin.x + angle.x + REST_TILT.x}deg) ` +
            `rotateY(${spin.y + angle.y + REST_TILT.y}deg)`,
        [spin, angle],
    );

    return (
        <div
            className="cq-dice-stage relative animate-cq-dice-drop"
            style={{ width: size, height: size }}
            aria-label={`Xúc xắc ${face}`}
            role="img"
        >
            <div
                className="cq-dice h-full w-full"
                style={{ transform, ['--half' as any]: `${size / 2}px` }}
            >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div key={n} className="cq-dice-face" style={{ transform: FACE_TRANSFORM[n] }}>
                        {Array.from({ length: 9 }, (_, i) => {
                            const c = i % 3;
                            const r = Math.floor(i / 3);
                            const on = PIPS[n].some(([px, py]) => px === c && py === r);
                            return (
                                <span key={i}>
                                    {on && <span className={`cq-pip${n === 1 ? ' cq-pip--one' : ''}`} />}
                                </span>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Vệt sáng loé lên lúc chạm bàn */}
            {landed && (
                <span
                    className="animate-cq-dice-land pointer-events-none absolute inset-0 rounded-full"
                    style={{ background: 'radial-gradient(circle, rgb(var(--cq-neon) / 0.55), transparent 65%)' }}
                />
            )}

            {/* Bóng đổ dưới viên xúc xắc */}
            <span
                className="pointer-events-none absolute left-1/2 h-2 -translate-x-1/2 rounded-[50%] bg-black/40 blur-[3px] transition-all duration-500"
                style={{ bottom: -8, width: rolling ? size * 0.5 : size * 0.72, opacity: rolling ? 0.25 : 0.45 }}
            />
        </div>
    );
};

export default Dice3D;
