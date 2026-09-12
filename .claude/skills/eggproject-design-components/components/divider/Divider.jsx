/* global React */

/* ============ Divider ============
   <Divider/>                              plain
   <Divider strong/>                       darker line
   <Divider vertical/>                     inline vertical rule
   <Divider label="Sprint 14"/>            text in the middle
   <Divider ornament="&"/>                 decorative display glyph
   <Divider onInk/>                        on-dark variant

   Props:
     - vertical: boolean
     - strong:   boolean
     - dotted:   boolean
     - label:    string
     - ornament: string|ReactNode  (overrides label)
     - onInk:    boolean
     - tall:     boolean — only for vertical
============================================ */
function Divider({ vertical, strong, dotted, label, ornament, onInk, tall, className = '', ...rest }) {
  if (ornament) {
    const classNames = ['divider', 'divider--ornament', onInk && 'divider--on-ink', className].filter(Boolean).join(' ');
    return (
      <div className={classNames} role="separator" {...rest}>
        <span className="divider__glyph">{ornament}</span>
      </div>
    );
  }
  if (label) {
    const classNames = ['divider', 'divider--label', onInk && 'divider--on-ink', className].filter(Boolean).join(' ');
    return <div className={classNames} role="separator" {...rest}>{label}</div>;
  }
  if (vertical) {
    const classNames = ['divider', 'divider--vertical', strong && 'divider--strong', tall && 'divider--tall', onInk && 'divider--on-ink', className].filter(Boolean).join(' ');
    return <span className={classNames} role="separator" {...rest}/>;
  }
  const classNames = ['divider', strong && 'divider--strong', dotted && 'divider--dotted', onInk && 'divider--on-ink', className].filter(Boolean).join(' ');
  return <hr className={classNames} {...rest}/>;
}

Object.assign(window, { Divider });
