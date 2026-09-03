/**
 * @file src/components/arena/DisconnectWatch.tsx
 * @description Thanh cảnh báo có đồng hồ đếm ngược cho người đang mất kết nối.
 *
 * Không có thứ này thì người còn lại chỉ thấy tên đối thủ chuyển sang xám, và
 * không biết nên đợi hay nên bỏ đi. Đồng hồ đếm ngược trả lời đúng câu hỏi đó:
 * **còn bao lâu nữa thì họ bị tính bỏ cuộc**.
 *
 * Đếm ngược chạy ở client, lấy mốc từ ảnh chụp mà server gửi. Server không bơm
 * từng giây — nó chỉ gửi số giây còn lại mỗi khi có gì đó thay đổi.
 */
import React, { useEffect, useState } from 'react';

export interface WatchedSeat {
    userId: string;
    name: string;
    connected: boolean;
    forfeited?: boolean;
    graceSecondsLeft?: number;
}

interface Props {
    seats: WatchedSeat[];
    /** Đang ở sảnh thì không cảnh báo — rời sảnh không mất gì */
    active: boolean;
}

const DisconnectWatch: React.FC<Props> = ({ seats, active }) => {
    // Bản đồ userId → số giây còn lại, tự trừ dần mỗi giây ở client
    const [countdown, setCountdown] = useState<Record<string, number>>({});

    // Nhận mốc mới từ server thì đặt lại đồng hồ
    useEffect(() => {
        const next: Record<string, number> = {};
        for (const s of seats) {
            if (!s.connected && !s.forfeited && (s.graceSecondsLeft ?? 0) > 0) {
                next[s.userId] = s.graceSecondsLeft!;
            }
        }
        setCountdown(next);
    }, [seats]);

    useEffect(() => {
        if (Object.keys(countdown).length === 0) return;
        const id = setInterval(() => {
            setCountdown((prev) => {
                const next: Record<string, number> = {};
                for (const [k, v] of Object.entries(prev)) {
                    if (v > 1) next[k] = v - 1;
                }
                return next;
            });
        }, 1000);
        return () => clearInterval(id);
    }, [countdown]);

    if (!active) return null;

    const waiting = seats.filter((s) => countdown[s.userId] !== undefined);
    if (waiting.length === 0) return null;

    return (
        <div className="animate-cq-rise rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="flex items-center gap-2 text-sm font-bold text-amber-300">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
                    </span>
                    Đang chờ kết nối lại
                </span>

                {waiting.map((s) => {
                    const left = countdown[s.userId];
                    const urgent = left <= 20;
                    return (
                        <span key={s.userId} className="flex items-center gap-2 text-sm">
                            <span className="font-semibold text-cq-strong">{s.name}</span>
                            <span
                                className={`font-mono font-bold tabular-nums ${
                                    urgent ? 'animate-[cqPulseDot_1s_ease-in-out_infinite] text-rose-400' : 'text-amber-300'
                                }`}
                            >
                                {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
                            </span>
                        </span>
                    );
                })}
            </div>

            <p className="mt-1.5 text-xs leading-relaxed text-cq-muted">
                Quân của họ vẫn ở trên bàn và lượt bị bỏ qua. Hết giờ mà không quay lại thì tính bỏ cuộc — nếu chỉ
                còn bạn thì bạn thắng.
            </p>
        </div>
    );
};

export default DisconnectWatch;
