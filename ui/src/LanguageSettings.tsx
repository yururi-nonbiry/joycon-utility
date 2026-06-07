import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSettings = () => {
  const { i18n } = useTranslation();

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = event.target.value;
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  return (
    <div className="settings-section">
      <h3>Language / 言語</h3>
      <div className="setting-item">
        <label htmlFor="language-select">Select Language:</label>
        <select id="language-select" value={i18n.language} onChange={handleLanguageChange}>
          <option value="en">English</option>
          <option value="ja">日本語</option>
        </select>
      </div>
    </div>
  );
};

export default LanguageSettings;
