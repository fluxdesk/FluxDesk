import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LOCALE, DEFAULT_NAMESPACE, NAMESPACES } from './config';

// Import all translation files statically for SSR compatibility
import enCommon from '@/locales/en/common.json';
import enAuth from '@/locales/en/auth.json';
import enInbox from '@/locales/en/inbox.json';
import enTicket from '@/locales/en/ticket.json';
import enSettings from '@/locales/en/settings.json';
import enOrganization from '@/locales/en/organization.json';
import enPortal from '@/locales/en/portal.json';
import enContacts from '@/locales/en/contacts.json';
import enValidation from '@/locales/en/validation.json';
import enDashboard from '@/locales/en/dashboard.json';

import nlCommon from '@/locales/nl/common.json';
import nlAuth from '@/locales/nl/auth.json';
import nlInbox from '@/locales/nl/inbox.json';
import nlTicket from '@/locales/nl/ticket.json';
import nlSettings from '@/locales/nl/settings.json';
import nlOrganization from '@/locales/nl/organization.json';
import nlPortal from '@/locales/nl/portal.json';
import nlContacts from '@/locales/nl/contacts.json';
import nlValidation from '@/locales/nl/validation.json';
import nlDashboard from '@/locales/nl/dashboard.json';

const resources = {
    en: {
        common: enCommon,
        auth: enAuth,
        inbox: enInbox,
        ticket: enTicket,
        settings: enSettings,
        organization: enOrganization,
        portal: enPortal,
        contacts: enContacts,
        validation: enValidation,
        dashboard: enDashboard,
    },
    nl: {
        common: nlCommon,
        auth: nlAuth,
        inbox: nlInbox,
        ticket: nlTicket,
        settings: nlSettings,
        organization: nlOrganization,
        portal: nlPortal,
        contacts: nlContacts,
        validation: nlValidation,
        dashboard: nlDashboard,
    },
};

export function initI18n(locale: string = DEFAULT_LOCALE) {
    if (!i18n.isInitialized) {
        i18n.use(initReactI18next).init({
            resources,
            lng: locale,
            fallbackLng: DEFAULT_LOCALE,
            defaultNS: DEFAULT_NAMESPACE,
            ns: [...NAMESPACES],
            interpolation: {
                escapeValue: false, // React already escapes
            },
            react: {
                useSuspense: false, // For SSR compatibility
            },
        });
    } else if (i18n.language !== locale) {
        i18n.changeLanguage(locale);
    }

    return i18n;
}

export { i18n };
