/**
 * @file src/components/game/AuthForm.tsx
 * @description Form đăng nhập / đăng ký dùng chung.
 */
import React, { useState } from 'react';
import { ApiError, cq } from '@/lib/codequest';

interface Props {
    mode: 'login' | 'register';
}

const AuthForm: React.FC<Props> = ({ mode }) => {
    const isLogin = mode === 'login';

    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [classCode, setClassCode] = useState('');
    const [studentCode, setStudentCode] = useState('');

    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setBusy(true);

        try {
            if (isLogin) {
                await cq.login(identifier.trim(), password);
            } else {
                await cq.register({
                    email: email.trim(),
                    username: username.trim(),
                    password,
                    displayName: displayName.trim(),
                    classCode: classCode.trim() || undefined,
                    studentCode: studentCode.trim() || undefined,
                });
            }
            window.location.href = '/hub';
        } catch (err) {
            const message =
                err instanceof ApiError
                    ? err.message
                    : 'Không kết nối được máy chủ. Vui lòng thử lại sau ít phút.';
            setError(message);
            setBusy(false);
        }
    }

    return (
        <div className="w-full max-w-md">
            <div className="cq-panel p-6 sm:p-8">
                <h1 className="text-2xl font-extrabold text-cq-strong">
                    {isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}
                </h1>
                <p className="mt-1 text-sm text-cq-muted">
                    {isLogin
                        ? 'Tiếp tục hành trình chinh phục 10 game lập trình.'
                        : 'Game đầu tiên mở ngay sau khi đăng ký — các game sau phải tự mở khoá.'}
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    {isLogin ? (
                        <div>
                            <label className="cq-label" htmlFor="identifier">
                                Email hoặc tên đăng nhập
                            </label>
                            <input
                                id="identifier"
                                className="cq-input"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                autoComplete="username"
                                required
                            />
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="cq-label" htmlFor="displayName">
                                    Họ và tên
                                </label>
                                <input
                                    id="displayName"
                                    className="cq-input"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="Nguyễn Văn A"
                                    required
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="cq-label" htmlFor="username">
                                        Tên đăng nhập
                                    </label>
                                    <input
                                        id="username"
                                        className="cq-input"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="nguyenvana"
                                        pattern="[a-zA-Z0-9_.]+"
                                        minLength={3}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="cq-label" htmlFor="classCode">
                                        Mã lớp
                                    </label>
                                    <input
                                        id="classCode"
                                        className="cq-input"
                                        value={classCode}
                                        onChange={(e) => setClassCode(e.target.value)}
                                        placeholder="SE1801"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="cq-label" htmlFor="email">
                                        Email
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        className="cq-input"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="cq-label" htmlFor="studentCode">
                                        Mã sinh viên
                                    </label>
                                    <input
                                        id="studentCode"
                                        className="cq-input"
                                        value={studentCode}
                                        onChange={(e) => setStudentCode(e.target.value)}
                                        placeholder="SV2026001"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <div>
                        <label className="cq-label" htmlFor="password">
                            Mật khẩu
                        </label>
                        <input
                            id="password"
                            type="password"
                            className="cq-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete={isLogin ? 'current-password' : 'new-password'}
                            minLength={6}
                            required
                        />
                    </div>

                    {error && (
                        <p className="rounded-lg border border-cq-rose/40 bg-cq-rose/10 px-3 py-2 text-sm text-cq-rose">
                            {error}
                        </p>
                    )}

                    <button type="submit" className="cq-btn-primary w-full" disabled={busy}>
                        {busy ? 'Đang xử lý…' : isLogin ? 'Vào game' : 'Bắt đầu chơi'}
                    </button>
                </form>

                <p className="mt-5 text-center text-sm text-cq-muted">
                    {isLogin ? (
                        <>
                            Chưa có tài khoản?{' '}
                            <a href="/register" className="font-semibold text-cq-neon hover:underline">
                                Đăng ký
                            </a>
                        </>
                    ) : (
                        <>
                            Đã có tài khoản?{' '}
                            <a href="/login" className="font-semibold text-cq-neon hover:underline">
                                Đăng nhập
                            </a>
                        </>
                    )}
                </p>
            </div>
        </div>
    );
};

export default AuthForm;
