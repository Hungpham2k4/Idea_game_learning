/**
 * @file src/components/arena/RoomNotices.tsx
 * @description Thông báo nổi + hộp thoại xác nhận rời phòng, dùng chung cho
 *              cả đấu trường lẫn bàn cờ.
 *
 * Ba việc, đều xuất phát từ cùng một vấn đề: người chơi không biết chuyện gì
 * đang xảy ra với những người khác trong phòng.
 *
 *   1. Ai vào / ai rời / ai mất kết nối → hiện thông báo nổi vài giây
 *   2. Bấm "Rời phòng" → hỏi lại, vì đang giữa ván thì rời là bỏ cuộc
 *   3. Đóng tab hoặc tải lại trang → trình duyệt cảnh báo giúp
 */
import React, { useEffect, useState } from 'react';

// ─── Thông báo nổi ───────────────────────────────────────────────────────────

export interface RoomNotice {
    id: number;
    kind: 'join' | 'leave' | 'disconnect' | 'reconnect' | 'host';
    text: string;
}

const NOTICE_STYLE: Record<RoomNotice['kind'], { icon: string; cls: string }> = {
    join: { icon: '→', cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
    reconnect: { icon: '↻', cls: 'border-cq-neon/40 bg-cq-neon/10 text-cq-neon' },
    leave: { icon: '←', cls: 'border-cq-line bg-cq-panel text-cq-muted' },
    disconnect: { icon: '⚡', cls: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
    host: { icon: '★', cls: 'border-cq-gold/40 bg-cq-gold/10 text-cq-gold' },
};

export const NoticeStack: React.FC<{ notices: RoomNotice[] }> = ({ notices }) => {
    if (notices.length === 0) return null;

    return (
        <div className="pointer-events-none fixed right-4 top-20 z-40 flex w-72 flex-col gap-2">
            {notices.map((n) => {
                const s = NOTICE_STYLE[n.kind] ?? NOTICE_STYLE.leave;
                return (
                    <div
                        key={n.id}
                        className={`animate-cq-rise flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm shadow-lg backdrop-blur ${s.cls}`}
                    >
                        <span className="font-bold">{s.icon}</span>
                        <span className="flex-1 leading-snug">{n.text}</span>
                    </div>
                );
            })}
        </div>
    );
};

/**
 * Quản lý hàng thông báo: tự xoá sau vài giây, giữ tối đa 4 cái.
 *
 * Trả về `push` để nơi gọi chỉ việc đưa thông báo vào, không phải tự lo dọn.
 */
export function useRoomNotices(): { notices: RoomNotice[]; push: (n: Omit<RoomNotice, 'id'>) => void } {
    const [notices, setNotices] = useState<RoomNotice[]>([]);

    useEffect(() => {
        if (notices.length === 0) return;
        const id = setTimeout(() => setNotices((prev) => prev.slice(1)), 4200);
        return () => clearTimeout(id);
    }, [notices]);

    const push = (n: Omit<RoomNotice, 'id'>) => {
        setNotices((prev) => [...prev.slice(-3), { ...n, id: Date.now() + Math.random() }]);
    };

    return { notices, push };
}

// ─── Xác nhận rời phòng ──────────────────────────────────────────────────────

interface ConfirmProps {
    open: boolean;
    /** Đang giữa ván hay còn ở sảnh — hai tình huống hậu quả khác hẳn nhau */
    inGame: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

export const LeaveConfirm: React.FC<ConfirmProps> = ({ open, inGame, onCancel, onConfirm }) => {
    // Esc để huỷ — người chơi bấm nhầm thì thoát nhanh được
    useEffect(() => {
        if (!open) return;
        const h = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [open, onCancel]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={onCancel}
            role="dialog"
            aria-modal="true"
        >
            <div className="cq-glass w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
                <p className="text-lg font-extrabold text-cq-strong">
                    {inGame ? 'Rời phòng giữa ván?' : 'Rời phòng?'}
                </p>

                <p className="mt-2 text-sm leading-relaxed text-cq-muted">
                    {inGame ? (
                        <>
                            Ván đang diễn ra. Rời bây giờ là <b className="text-cq-strong">bỏ cuộc</b> — quân của bạn
                            vẫn ở trên bàn nhưng sẽ bị bỏ lượt, và điểm đang có không được tính vào bảng xếp hạng.
                        </>
                    ) : (
                        <>Bạn sẽ rời khỏi phòng và quay lại sảnh. Vào lại bằng mã phòng bất cứ lúc nào.</>
                    )}
                </p>

                <div className="mt-6 flex gap-2">
                    <button onClick={onCancel} className="cq-btn flex-1 justify-center border border-cq-line">
                        Ở lại
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 justify-center rounded-lg px-4 py-2 text-sm font-semibold transition ${
                            inGame
                                ? 'bg-rose-500 text-white hover:bg-rose-600'
                                : 'bg-cq-neon text-cq-onaccent hover:opacity-90'
                        }`}
                    >
                        {inGame ? 'Vẫn rời' : 'Rời phòng'}
                    </button>
                </div>

                <p className="mt-3 text-center text-[11px] text-cq-muted">Bấm Esc để ở lại</p>
            </div>
        </div>
    );
};

/**
 * Cảnh báo khi đóng tab hoặc tải lại trang giữa ván.
 *
 * Trình duyệt luôn hiện câu chữ của riêng nó, không dùng được nội dung mình
 * đặt — nhưng chỉ cần hộp thoại hiện ra là đã cứu được cú Ctrl+W nhầm.
 */
export function useLeaveWarning(active: boolean): void {
    useEffect(() => {
        if (!active) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [active]);
}
