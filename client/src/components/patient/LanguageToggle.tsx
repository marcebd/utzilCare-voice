import type { Language } from '../../types';

interface LanguageToggleProps {
  value: Language;
  onChange: (lang: Language) => void;
}

export default function LanguageToggle({ value, onChange }: LanguageToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Language"
      className="inline-flex rounded-full border border-stone-200 bg-white p-1 shadow-sm"
    >
      {(['es', 'en'] as const).map((lang) => {
        const isActive = value === lang;
        const label = lang === 'es' ? 'Español' : 'English';
        return (
          <button
            key={lang}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(lang)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-forest-600 focus:ring-offset-2 focus:ring-offset-cream ${
              isActive
                ? 'bg-forest-800 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-800'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
