import { ChevronDown, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getLanguageBadge, getLanguageLabel, languageOptions } from '../shared/languages';

type LanguagePickerProps = {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function LanguagePicker({ ariaLabel, value, onChange, className = '' }: LanguagePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selectedLabel = getLanguageLabel(value);
  const filteredLanguageOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return languageOptions;
    }

    return languageOptions.filter((option) =>
      [option.label, option.value, option.region, option.badge].some((item) => item.toLowerCase().includes(normalizedQuery))
    );
  }, [query]);
  const regions = useMemo(() => Array.from(new Set(filteredLanguageOptions.map((option) => option.region))), [filteredLanguageOptions]);

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

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => searchRef.current?.focus(), 0);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  function selectLanguage(nextValue: string) {
    onChange(nextValue);
    setIsOpen(false);
    setQuery('');
  }

  return (
    <div className={`language-picker${className ? ` ${className}` : ''}`} ref={pickerRef}>
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
          <label className="language-search">
            <Search size={17} aria-hidden="true" />
            <input
              ref={searchRef}
              value={query}
              aria-label={`检索${ariaLabel}`}
              placeholder="输入语言名称或代码检索"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          {regions.map((region) => (
            <section className="language-menu-region" key={region} aria-label={region}>
              <span className="language-menu-heading">{region}</span>
              <div className="language-menu-grid">
                {filteredLanguageOptions
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
          {filteredLanguageOptions.length === 0 ? <p className="language-empty">未找到匹配语言</p> : null}
        </div>
      ) : null}
    </div>
  );
}
