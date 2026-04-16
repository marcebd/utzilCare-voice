import { useEffect, useState } from 'react';
import type { Language } from '../../types';

interface AccessibilityControlsProps {
  language: Language;
}

const COPY = {
  es: {
    label: 'Accesibilidad',
    largeText: 'Texto grande',
    largeTextOn: 'Texto grande activado',
    largeTextOff: 'Texto grande desactivado',
    highContrast: 'Alto contraste',
    highContrastOn: 'Alto contraste activado',
    highContrastOff: 'Alto contraste desactivado',
  },
  en: {
    label: 'Accessibility',
    largeText: 'Large text',
    largeTextOn: 'Large text on',
    largeTextOff: 'Large text off',
    highContrast: 'High contrast',
    highContrastOn: 'High contrast on',
    highContrastOff: 'High contrast off',
  },
} as const;

export default function AccessibilityControls({
  language,
}: AccessibilityControlsProps) {
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const copy = COPY[language];

  useEffect(() => {
    document.documentElement.classList.toggle('large-text', largeText);
    return () => {
      document.documentElement.classList.remove('large-text');
    };
  }, [largeText]);

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
    return () => {
      document.documentElement.classList.remove('high-contrast');
    };
  }, [highContrast]);

  const toggleButtonClass = (active: boolean): string =>
    `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-forest-600 focus:ring-offset-2 focus:ring-offset-cream ${
      active
        ? 'border-forest-800 bg-forest-800 text-white'
        : 'border-stone-300 bg-white text-stone-700 hover:border-stone-400'
    }`;

  return (
    <div
      role="group"
      aria-label={copy.label}
      className="flex flex-wrap items-center gap-2"
    >
      <button
        type="button"
        aria-pressed={largeText}
        aria-label={largeText ? copy.largeTextOn : copy.largeTextOff}
        onClick={() => setLargeText((prev) => !prev)}
        className={toggleButtonClass(largeText)}
      >
        <span aria-hidden="true" className="font-display text-sm">
          A<sup className="text-[0.6em]">+</sup>
        </span>
        <span>{copy.largeText}</span>
      </button>

      <button
        type="button"
        aria-pressed={highContrast}
        aria-label={highContrast ? copy.highContrastOn : copy.highContrastOff}
        onClick={() => setHighContrast((prev) => !prev)}
        className={toggleButtonClass(highContrast)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
          className="h-3.5 w-3.5"
        >
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2v16a8 8 0 0 1 0-16z" />
        </svg>
        <span>{copy.highContrast}</span>
      </button>
    </div>
  );
}
