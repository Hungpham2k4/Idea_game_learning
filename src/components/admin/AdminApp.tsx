/**
 * @file src/components/admin/AdminApp.tsx
 * @description Gốc của React Admin SPA cho CodeQuest.
 *
 * Được `[...all].astro` render bằng client:only="react".
 * Bao gồm: kiểm tra quyền (TEACHER/ADMIN) và toàn bộ route quản trị.
 */

import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import DashboardPage from './pages/DashboardPage';
import GamesPage from './pages/GamesPage';
import LevelsPage from './pages/LevelsPage';
import ArenaPage from './pages/ArenaPage';
import ProblemsPage from './pages/ProblemsPage';
import SubmissionsPage from './pages/SubmissionsPage';
import UsersPage from './pages/UsersPage';
import { cq, isLoggedIn, type CqUser } from '@/lib/codequest';

// ─── Cổng kiểm tra quyền ─────────────────────────────────────────────────────

const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<'checking' | 'allowed' | 'denied'>('checking');
    const [user, setUser] = useState<CqUser | null>(null);

    useEffect(() => {
        if (!isLoggedIn()) {
            window.location.href = '/login';
            return;
        }
        cq.me()
            .then((u) => {
                setUser(u);
                setState(u.role === 'ADMIN' || u.role === 'TEACHER' ? 'allowed' : 'denied');
            })
            .catch(() => setState('denied'));
    }, []);

    if (state === 'checking') {
        return (
            <div className="grid min-h-screen place-items-center bg-slate-50">
                <p className="text-sm text-slate-400">Đang kiểm tra quyền truy cập…</p>
            </div>
        );
    }

    if (state === 'denied') {
        return (
            <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
                <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center">
                    <p className="text-4xl">⛔</p>
                    <h1 className="mt-3 text-xl font-bold text-slate-900">Không có quyền truy cập</h1>
                    <p className="mt-2 text-sm text-slate-500">
                        Khu vực này chỉ dành cho giảng viên và quản trị viên
                        {user ? ` (tài khoản của bạn đang là ${user.role}).` : '.'}
                    </p>
                    <a href="/hub" className="btn-primary mt-6">
                        Về khu vực chơi game
                    </a>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

// ─── Router ──────────────────────────────────────────────────────────────────

const AdminRouter: React.FC = () => (
    <Routes>
        <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="games" element={<GamesPage />} />
            <Route path="levels" element={<LevelsPage />} />
            <Route path="submissions" element={<SubmissionsPage />} />
            <Route path="arena" element={<ArenaPage />} />
            <Route path="problems" element={<ProblemsPage />} />
        </Route>

        <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
        <Route path="/" element={<Navigate to="/admin" replace />} />
    </Routes>
);

const AdminApp: React.FC = () => (
    <AuthGate>
        <BrowserRouter>
            <AdminRouter />
        </BrowserRouter>
    </AuthGate>
);

export default AdminApp;
