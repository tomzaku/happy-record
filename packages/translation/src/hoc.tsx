import React from 'react';

// Component
import { TranslationContext } from './context';

// Enum
import { Language, useLocalStorage } from '@dreamer/global';

// Type
import { MessageDescriptor } from './type';

export const withTranslation = (Component: React.FC) =>
  function TranslationWrapper<T>(props: T) {
    const [language, setLanguage] = useLocalStorage<Language>(
      'app_language',
      Language.En,
    );
    const [messages, setMessages] = React.useState<Record<string, string>>({});
    const loadLanguage = async (nextLanguage: Language) => {
      const { default: messages } = await import(
        `./language/${nextLanguage}.json`
      );
      setMessages(messages);
    };
    React.useEffect(() => {
      loadLanguage(language);
    }, []);
    const formatMessage = (
      descriptor: MessageDescriptor,
      values?: Record<string, string>,
    ) => {
      const { id, defaultMessage } = descriptor;
      const message = messages[id] || defaultMessage;
      if (!values) return message;
      return Object.entries(values).reduce(
        (result, [key, value]) =>
          result.replace(new RegExp(`{{${key}}}`, 'gm'), value),
        message,
      );
    };
    return (
      <TranslationContext.Provider
        value={{
          messages: messages,
          language,
          changeLanguage: async (nextLanguage: Language) => {
            setLanguage(nextLanguage);
            loadLanguage(nextLanguage);
          },
          formatMessage,
        }}
      >
        <Component {...props} />
      </TranslationContext.Provider>
    );
  };
