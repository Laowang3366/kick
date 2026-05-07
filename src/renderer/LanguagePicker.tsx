import { ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getLanguageBadge, getLanguageLabel, languageOptions } from '../shared/languages';

type LanguagePickerProps = {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
};

export function LanguagePicker({ ariaLabel, value, onChange }: LanguagePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const selectedLabel = getLanguageLabel(value);
  const regions = useMemo(() => Array.from(new Set(languageOptions.map((option) => option.region))), []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeOnOutsidePointerDown, { capture: true });
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointerDown, { capture: true });
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  function selectLanguage(nextValue: string) {
    onChange(nextValue);
    setIsOpen(false);
  }

  return (
    <div className="language-picker" ref={pickerRef}>
      <button
        className="language-trigger"
        type="button"
        aria-label={`${ariaLabel}：${selectedLabel}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="language-badge" aria-hidden="true">
          {getLanguageBadge(value)}
        </span>
        <span className="language-trigger-label">{selectedLabel}</span>
        <ChevronDown className="select-chevron" size={18} aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className="language-menu" role="listbox" aria-label={`${ariaLabel}列表`}>
          {regions.map((region) => (
            <section className="language-menu-region" key={region} aria-label={region}>
              <span className="language-menu-heading">{region}</span>
              <div className="language-menu-grid">
                {languageOptions
                  .filter((option) => option.region === region)
                  .map((option) => (
                    <button
                      className={`language-option${option.value === value ? ' selected' : ''}`}
                      type="button"
                      role="option"
                      aria-label={option.label}
                      aria-selected={option.value === value}
                      key={option.value}
                      onClick={() => selectLanguage(option.value)}
                    >
                      <span>{option.badge}</span>
                      <strong>{option.label}</strong>
                    </button>
                  ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
