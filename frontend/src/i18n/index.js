import { createI18n } from 'vue-i18n';

// Import English translations
import enCommon from '../locales/en/common.json';
import enAuth from '../locales/en/auth.json';
import enUsers from '../locales/en/users.json';
import enAdmin from '../locales/en/admin.json';
import esCommon from '../locales/es/common.json';
import esAuth from '../locales/es/auth.json';
import esUsers from '../locales/es/users.json';
import esAdmin from '../locales/es/admin.json';

// Import Hungarian translations
import huCommon from '../locales/hu/common.json';
import huAuth from '../locales/hu/auth.json';
import huUsers from '../locales/hu/users.json';
import huAdmin from '../locales/hu/admin.json';

// Import German translations
import deCommon from '../locales/de/common.json';
import deAuth from '../locales/de/auth.json';
import deUsers from '../locales/de/users.json';
import deAdmin from '../locales/de/admin.json';

const messages = {
    en: {
        common: enCommon,
        auth: enAuth,
        users: enUsers,
        admin: enAdmin
    },
    es: {
        common: esCommon,
        auth: esAuth,
        users: esUsers,
        admin: esAdmin
    },
    hu: {
        common: huCommon,
        auth: huAuth,
        users: huUsers,
        admin: huAdmin
    },
    de: {
        common: deCommon,
        auth: deAuth,
        users: deUsers,
        admin: deAdmin
    }
};

const i18n = createI18n({
    legacy: false,
    locale: localStorage.getItem('locale') || 'en',
    fallbackLocale: 'en',
    messages,
    globalInjection: true
});

export default i18n;
