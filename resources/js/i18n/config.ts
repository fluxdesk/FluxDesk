export const SUPPORTED_LOCALES = ['en', 'nl'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en';

export const NAMESPACES = [
    'common',
    'auth',
    'inbox',
    'ticket',
    'settings',
    'organization',
    'portal',
    'contacts',
    'validation',
    'dashboard',
] as const;

export type Namespace = (typeof NAMESPACES)[number];
export const DEFAULT_NAMESPACE: Namespace = 'common';

export const LOCALE_NAMES: Record<SupportedLocale, string> = {
    en: 'English',
    nl: 'Nederlands',
};
