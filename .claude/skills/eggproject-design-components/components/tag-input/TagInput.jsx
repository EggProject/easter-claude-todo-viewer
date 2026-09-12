/* global React */
const { useState, useRef } = React;

/* ============ TagInput ============
   Props:
     - value:    string[]
     - onChange: (string[]) => void
     - placeholder: string
     - tone:     'blue' (default) | 'ink' | 'yolk' | 'paper'
     - separators: array of keys that commit a tag (default Enter, Comma)
     - ariaLabel: accessible name for the embedded input (default 'Tags')
============================================ */
function TagInput({ value = [], onChange, placeholder = 'Add a tag…', tone = 'blue', separators = ['Enter', ','], className = '', ariaLabel = 'Tags' }) {
  const [draft, setDraft] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const inputRef = useRef(null);

  const addTag = (raw) => {
    const trimmed = raw.trim().replace(/,$/, '');
    if (!trimmed) return;
    if (value.includes(trimmed)) { setDraft(''); return; }
    onChange?.([...value, trimmed]);
    setDraft('');
    setAnnouncement(`Added ${trimmed}`);
  };
  const removeTag = (index) => {
    const removed = value[index];
    onChange?.(value.filter((_, itemIndex) => itemIndex !== index));
    setAnnouncement(`Removed ${removed}`);
  };

  const onKeyDown = (event) => {
    if (separators.includes(event.key) || (event.key === ',' && separators.includes(','))) {
      event.preventDefault();
      addTag(draft);
    } else if (event.key === 'Backspace' && !draft && value.length) {
      removeTag(value.length - 1);
    }
  };

  return (
    <div className={`tagi ${className}`} onClick={() => inputRef.current?.focus()}>
      {value.map((tag, index) => (
        <span key={`${tag}-${index}`} className={`tagi__tag tagi__tag--${tone}`}>
          <span className="tagi__tag-text">{tag}</span>
          <button type="button" className="tagi__tag-x" onClick={(event) => { event.stopPropagation(); removeTag(index); }} aria-label={`Remove ${tag}`}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        className="tagi__input"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => addTag(draft)}
        placeholder={value.length ? '' : placeholder}
        aria-label={ariaLabel || 'Tags'}
      />
      <span className="tagi__status" role="status" aria-live="polite">{announcement}</span>
    </div>
  );
}

Object.assign(window, { TagInput });
