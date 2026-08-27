/**
 * @file src/i18n/index.ts
 * @description i18n setup entry point.
 *
 * // i18next configuration goes here
 *
 * This file is intentionally left as a stub.
 * Wire up i18next (or any i18n library) when your project is ready.
 *
 * Recommended approach (i18next + react-i18next):
 *
 *   npm install i18next react-i18next i18next-http-backend i18next-browser-languagedetector
 *
 * Then replace this file with:
 *
 *   import i18n from 'i18next';
 *   import { initReactI18next } from 'react-i18next';
 *   import LanguageDetector from 'i18next-browser-languagedetector';
 *   import vi from './locales/vi.json';
 *   import en from './locales/en.json';
 *
 *   i18n
 *     .use(LanguageDetector)
 *     .use(initReactI18next)
 *     .init({
 *       resources: {
 *         vi: { translation: vi },
 *         en: { translation: en },
 *       },
 *       fallbackLng: 'vi',
 *       interpolation: { escapeValue: false },
 *     });
 *
 *   export default i18n;
 *
 * Usage in React components:
 *   import { useTranslation } from 'react-i18next';
 *   const { t } = useTranslation();
 *   return <h1>{t('common.welcome')}</h1>;
 *
 * Usage in Astro pages:
 *   import { t } from '@/i18n';
 *   // Or use a helper function that reads Accept-Language header
 */

// ── Stub: placeholder until i18next is configured ──────────────────────────

/**
 * Supported locales.
 * Extend this list as you add new locale JSON files.
 */
export const SUPPORTED_LOCALES = ['vi', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Default locale for the project. */
export const DEFAULT_LOCALE: Locale = 'vi';

/**
 * Simple stub `t` function — returns the key as-is.
 * Replace this with the real i18next `t` function after setup.
 */
export const t = (key: string, _fallback?: string): string => {
    return _fallback ?? key;
};
