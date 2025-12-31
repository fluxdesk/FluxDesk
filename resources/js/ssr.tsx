import { createInertiaApp } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import ReactDOMServer from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from './i18n';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createServer((page) =>
    createInertiaApp({
        page,
        render: ReactDOMServer.renderToString,
        title: (title) => (title ? `${title} - ${appName}` : appName),
        resolve: (name) =>
            resolvePageComponent(
                `./pages/${name}.tsx`,
                import.meta.glob('./pages/**/*.tsx'),
            ),
        setup: ({ App, props }) => {
            // Initialize i18n with server-provided locale
            const locale = (props.initialPage.props.locale as string) || 'en';
            const i18n = initI18n(locale);

            return (
                <I18nextProvider i18n={i18n}>
                    <App {...props} />
                </I18nextProvider>
            );
        },
    }),
);
