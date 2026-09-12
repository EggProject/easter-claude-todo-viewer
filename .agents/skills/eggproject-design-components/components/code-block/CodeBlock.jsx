/* global React */
const { useState } = React;

/* ============ CodeBlock ============
   Props:
     - children:   string code (use plain string + manual <Token> spans, OR
                   pass an array of pre-built ReactNode lines as `lines`)
     - lines:      Array<ReactNode>  — line-by-line content
     - filename:   string — header label
     - lang:       string — small uppercase chip
     - lineNumbers: boolean
     - ink:        boolean — dark variant
     - copy:       boolean (default true)
============================================ */
function CodeBlock({ filename, lang, lineNumbers, ink, copy = true, lines, children, className = '' }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    const text = lines
      ? lines.map((line) => (typeof line === 'string' ? line : '')).join('\n')
      : (typeof children === 'string' ? children : '');
    try { await navigator.clipboard?.writeText(text); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const classNames = ['code', ink && 'code--ink', className].filter(Boolean).join(' ');
  const body = lines
    ? lines.map((line, index) => (
        <span key={index} className="code__line">
          {lineNumbers && <span className="code__number">{index + 1}</span>}
          {line}
        </span>
      ))
    : children;

  return (
    <div className={classNames}>
      {(filename || lang || copy) && (
        <div className="code__header">
          {filename && <span className="code__filename">{filename}</span>}
          {lang && <span className="code__lang">{lang}</span>}
          <span className="code__header-spacer"/>
          {copy && (
            <button className="code__copy" onClick={onCopy}>
              {copied
                ? <><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3.5 8 3 3 6-6.5"/></svg>Copied</>
                : <><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="5" width="8" height="9" rx="1.5"/><path d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H11"/></svg>Copy</>
              }
            </button>
          )}
        </div>
      )}
      <pre className="code__body"><code>{body}</code></pre>
    </div>
  );
}

/* Convenience token component */
function Token({ type, children }) {
  return <span className={`code__token--${type}`}>{children}</span>;
}

Object.assign(window, { CodeBlock, Token });
