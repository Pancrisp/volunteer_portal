import i18n from 'i18next'
import { reactI18nextModule } from 'react-i18next'
import Backend from 'i18next-xhr-backend'

i18n
  .use(Backend)
  .use(reactI18nextModule) // passes i18n down to react-i18next
  .init({
    lng: 'en',
    fallbackLng: 'en',

    keySeparator: false, // we do not use keys in form messages.welcome

    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    backend: {
      loadPath: '/assets/locales/{{lng}}/{{ns}}.json',
    },
  })

export default i18n
