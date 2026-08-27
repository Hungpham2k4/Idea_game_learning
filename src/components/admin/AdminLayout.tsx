/**
 * @file src/components/admin/AdminLayout.tsx
 * @description Admin SPA Layout — Sidebar + Header shell.
 *
 * Renders a collapsible sidebar with grouped navigation,
 * a top header with user info, and an <Outlet /> for page content.
 *
 * Navigation structure is driven by `adminMenu` from @/config/menu.
 *
 * Sidebar behavior:
 *   - Desktop: collapses to icon-only (w-16) or expands to full (w-64)
 *   - Mobile: slides in as an overlay drawer
 *
 * @todo When real auth is wired, replace AUTH_CONFIG with actual user context.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Settings,
    User,
    Users,
    Menu,
    ChevronDown,
    ChevronRight,
    LogOut,
    X,
    Gamepad2,
    Layers,
    FileCode,
} from 'lucide-react';
import { SITE_CONFIG } from '@/config/site';
import { cq, getCachedUser } from '@/lib/codequest';
import { adminMenu, type AdminNavItem } from '@/config/menu';
import '@/styles/global.css';

// ─── Icon Map ────────────────────────────────────────────────────────────────
// Maps icon name strings from menu.ts to actual lucide-react components
const ICON_MAP: Record<string, React.ReactNode> = {
    LayoutDashboard: <LayoutDashboard className="w-4 h-4" />,
    Settings:        <Settings className="w-4 h-4" />,
    User:            <User className="w-4 h-4" />,
    Users:           <Users className="w-4 h-4" />,
    Gamepad2:        <Gamepad2 className="w-4 h-4" />,
    Layers:          <Layers className="w-4 h-4" />,
    FileCode:        <FileCode className="w-4 h-4" />,
};

function getIcon(name: string): React.ReactNode {
    return ICON_MAP[name] ?? <ChevronRight className="w-4 h-4" />;
}

// ─── Sidebar Nav Item ────────────────────────────────────────────────────────

interface NavGroupProps {
    item:          AdminNavItem;
    isSidebarOpen: boolean;
    pathname:      string;
    onLinkClick:   () => void;
}

const NavGroup: React.FC<NavGroupProps> = ({ item, isSidebarOpen, pathname, onLinkClick }) => {
    const norm = (p: string) => p.replace(/\/+$/, '') || '/';
    const isChildActive = item.children?.some(c => norm(c.path) === norm(pathname)) ?? false;

    const [isOpen, setIsOpen] = useState(isChildActive);

    // Auto-expand the group if a child route becomes active
    useEffect(() => {
        if (isChildActive) setIsOpen(true);
    }, [isChildActive]);

    // Top-level link (no children)
    if (!item.children || item.children.length === 0) {
        const active = item.path ? norm(item.path) === norm(pathname) : false;
        return (
            <Link
                to={item.path ?? '#'}
                onClick={onLinkClick}
                className={[
                    'flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg text-sm font-medium transition-all duration-150',
                    active
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                ].join(' ')}
            >
                <span className="shrink-0">{getIcon(item.icon)}</span>
                {isSidebarOpen && <span className="truncate">{item.label}</span>}
            </Link>
        );
    }

    // Group with children
    return (
        <div>
            <button
                type="button"
                onClick={() => setIsOpen(o => !o)}
                title={isSidebarOpen ? undefined : item.label}
                className={[
                    'w-full flex items-center gap-3 px-3 py-2.5 mx-0 text-sm font-medium transition-all duration-150 rounded-none',
                    isChildActive
                        ? 'text-primary-700 font-semibold'
                        : 'text-slate-500 hover:text-slate-800',
                ].join(' ')}
                style={{ paddingLeft: '0.75rem', paddingRight: '0.75rem' }}
            >
                <span className={`shrink-0 ${isChildActive ? 'text-primary-600' : 'text-slate-400'}`}>
                    {getIcon(item.icon)}
                </span>
                {isSidebarOpen && (
                    <>
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        <ChevronDown
                            className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary-500' : 'text-slate-300'}`}
                        />
                    </>
                )}
            </button>

            {/* Child links */}
            <div className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${isOpen && isSidebarOpen ? 'max-h-96' : 'max-h-0'}`}>
                <div className="flex flex-col gap-0.5 pb-1 pt-0.5">
                    {item.children.map(child => {
                        const active = norm(child.path) === norm(pathname);
                        return (
                            <Link
                                key={child.key}
                                to={child.path}
                                onClick={onLinkClick}
                                className={[
                                    'flex items-center gap-2.5 text-[12.5px] font-medium py-2 mx-2 px-3 rounded-lg transition-all duration-150 pl-9',
                                    active
                                        ? 'bg-accent text-slate-900 font-semibold shadow-sm'
                                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
                                ].join(' ')}
                            >
                                <span className={`shrink-0 ${active ? 'text-slate-800' : 'text-slate-400'}`}>
                                    {getIcon(child.icon)}
                                </span>
                                <span className="truncate">{child.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// ─── Admin Layout ────────────────────────────────────────────────────────────

const AdminLayout: React.FC = () => {
    const location  = useLocation();
    const navigate  = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [userMenuOpen,  setUserMenuOpen]  = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    // Close user menu on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Close sidebar on mobile when navigating
    const handleLinkClick = () => {
        if (window.innerWidth < 768) setIsSidebarOpen(false);
    };

    /** Đăng xuất thật: thu hồi refresh token ở backend rồi rời SPA */
    const handleLogout = async () => {
        await cq.logout();
        window.location.href = '/login';
    };

    const currentUser = getCachedUser();
    const displayName = currentUser?.displayName ?? 'Khách';
    const currentRole = currentUser?.role ?? 'GUEST';
    const initial     = (displayName[0] || '?').toUpperCase();

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">

            {/* ── Mobile overlay ───────────────────────────────────────── */}
            <div
                className={`fixed inset-0 bg-slate-900/50 z-30 md:hidden transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsSidebarOpen(false)}
            />

            {/* ── Sidebar ──────────────────────────────────────────────── */}
            <aside
                className={[
                    'bg-white border-r border-slate-200 z-40 h-full shrink-0 flex flex-col',
                    'absolute top-0 left-0 md:relative',
                    'transition-all duration-300 ease-in-out',
                    isSidebarOpen
                        ? 'w-64 shadow-[4px_0_24px_rgba(0,0,0,0.07)]'
                        : 'w-0 overflow-hidden md:w-16 md:overflow-visible',
                ].join(' ')}
            >
                {/* Logo */}
                <div className={`border-b border-slate-100 flex items-center shrink-0 transition-all duration-300 ${isSidebarOpen ? 'px-5 py-4' : 'px-3 py-4 justify-center'}`}>
                    <div className="flex items-center gap-3">
                        <img
                            src="/favicon.svg"
                            alt={SITE_CONFIG.name}
                            className={`rounded-lg object-contain shrink-0 transition-all duration-300 ${isSidebarOpen ? 'w-8 h-8' : 'w-7 h-7'}`}
                        />
                        <div className={`overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'max-w-[10rem] opacity-100' : 'max-w-0 opacity-0'}`}>
                            <h2 className="text-sm font-bold text-slate-900 leading-tight whitespace-nowrap">
                                {SITE_CONFIG.name}
                            </h2>
                            <p className="text-[11px] font-semibold text-accent-dark leading-tight uppercase whitespace-nowrap tracking-wider">
                                Admin Panel
                            </p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className={`flex-1 min-h-0 py-3 flex flex-col gap-0.5 ${isSidebarOpen ? 'overflow-y-auto scrollbar-slim' : ''}`}>
                    {adminMenu.map((item, i) => (
                        <React.Fragment key={item.key}>
                            {/* Divider between groups */}
                            {i > 0 && isSidebarOpen && (
                                <div className="mx-4 border-t border-slate-100 my-1" />
                            )}
                            <NavGroup
                                item={item}
                                isSidebarOpen={isSidebarOpen}
                                pathname={location.pathname}
                                onLinkClick={handleLinkClick}
                            />
                        </React.Fragment>
                    ))}
                    <div className="h-4" />
                </nav>
            </aside>

            {/* ── Main content area ────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 h-screen">

                {/* Header */}
                <header className="h-16 bg-white border-b border-slate-200 shadow-sm z-20 flex items-center justify-between px-4 sm:px-6 shrink-0">
                    {/* Hamburger */}
                    <button
                        type="button"
                        onClick={() => setIsSidebarOpen(o => !o)}
                        className="w-9 h-9 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center"
                        aria-label="Toggle sidebar"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    {/* Page breadcrumb placeholder — replace with <Breadcrumb /> */}
                    <div className="flex-1 px-4 hidden md:block">
                        <p className="text-sm text-slate-400">Admin / {location.pathname.replace('/admin/', '').replace('/admin', '') || 'Dashboard'}</p>
                    </div>

                    {/* User menu */}
                    <div className="relative" ref={userMenuRef}>
                        <button
                            type="button"
                            onClick={() => setUserMenuOpen(o => !o)}
                            className="flex items-center gap-2.5 rounded-xl pl-1 pr-3 py-1.5 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-left"
                            aria-expanded={userMenuOpen}
                            aria-haspopup="menu"
                        >
                            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-700 to-primary-500 text-white text-sm font-bold flex items-center justify-center shrink-0 shadow-sm">
                                {initial}
                            </span>
                            <div className="hidden sm:block min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate leading-tight">{displayName}</p>
                                <p className="text-xs text-slate-400 truncate">{currentRole}</p>
                            </div>
                            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {userMenuOpen && (
                            <div
                                className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-slate-200 bg-white shadow-lg py-1.5 z-50"
                                role="menu"
                            >
                                <div className="px-3 py-2 border-b border-slate-100 sm:hidden">
                                    <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                                    <p className="text-xs text-slate-400">{currentRole}</p>
                                </div>
                                <a
                                    href="/hub"
                                    role="menuitem"
                                    onClick={() => setUserMenuOpen(false)}
                                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    <Gamepad2 className="w-4 h-4 text-slate-400" />
                                    Về khu vực chơi game
                                </a>
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Đăng xuất
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
