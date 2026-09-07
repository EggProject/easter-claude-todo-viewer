/* global React */
const { useState, useCallback, useRef } = React;

/* ============ FileUpload / Dropzone ============
   Props:
     - onFiles:  (FileList | File[]) => void
     - accept:   string  (forwarded to <input type=file>)
     - multiple: boolean (default true)
     - size:     'md' (default) | 'sm'
     - title:    string|ReactNode  — override main copy
     - hint:     string             — override hint copy
     - files:    Array<{name, size, status?, progress?}>  — render rows
     - onRemove: (file) => void
============================================ */
function formatBytes(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

function FileUpload({
  onFiles, accept, multiple = true, size = 'md',
  title, hint,
  files = [], onRemove,
  className = '',
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    setDragging(false);
    onFiles?.(Array.from(event.dataTransfer.files));
  }, [onFiles]);

  return (
    <div className={className}>
      <label
        className={['dropzone', size === 'sm' && 'dropzone--small', dragging && 'is-dragging'].filter(Boolean).join(' ')}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          className="dropzone__input"
          accept={accept}
          multiple={multiple}
          onChange={(event) => onFiles?.(Array.from(event.target.files || []))}
        />
        <span className="dropzone__icon">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 14V4M6 8l4-4 4 4"/>
            <path d="M3 14v2.5A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V14"/>
          </svg>
        </span>
        <span className="dropzone__copy">{title ?? <>Drop files here or <em>browse</em></>}</span>
        <span className="dropzone__hint">{hint ?? `${accept ? accept.replaceAll('.', '').toUpperCase() + ' · ' : ''}up to 25 MB each`}</span>
      </label>

      {files.length > 0 && (
        <div className="dropzone-files">
          {files.map((file, i) => {
            const pct = Math.max(0, Math.min(100, Number(file.progress) || 0));
            return (
            <div key={i} className="dropzone-file">
              <span className="dropzone-file__icon">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 2.5h6L13 5.5v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z"/>
                  <path d="M10 2.5V5h3"/>
                </svg>
              </span>
              <div className="dropzone-file__body">
                <span className="dropzone-file__name">{file.name}</span>
                <span className="dropzone-file__meta">{formatBytes(file.size)}</span>
              </div>
              {typeof file.progress === 'number' && file.status !== 'done' && (
                <div
                  className="dropzone-file__bar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(pct)}
                  aria-label={`Upload progress for ${file.name}`}
                ><span style={{ width: `${pct}%` }}/></div>
              )}
              {(file.status === 'done' || file.status === 'error') && (
                <span
                  className={['dropzone-file__status', file.status === 'error' && 'dropzone-file__status--error'].filter(Boolean).join(' ')}
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <span aria-hidden="true">{file.status === 'done' ? '✓ uploaded' : 'failed'}</span>
                  <span className="dropzone-file__sr">{`${file.name} ${file.status === 'done' ? 'uploaded' : 'failed'}`}</span>
                </span>
              )}
              {onRemove && (
                <button className="dropzone-file__remove" onClick={() => onRemove(file)} aria-label={`Remove ${file.name}`}>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>
                </button>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { FileUpload });
