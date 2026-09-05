/* global React */
const { useState } = React;

/* ============ Accordion ============
   <Accordion variant="bordered|separated|plain" type="single|multiple" defaultOpen={[0]}>
     <AccordionItem title="…" meta="…" icon={…}>body</AccordionItem>
   </Accordion>

   - type="single"   : only one open at a time (default)
   - type="multiple" : independent toggling
   - defaultOpen     : array of indexes to start open
============================================ */
function Accordion({ variant = 'plain', type = 'single', defaultOpen = [], children, className = '' }) {
  const [open, setOpen] = useState(() => new Set(defaultOpen));
  const toggle = (i) => {
    setOpen((previous) => {
      const next = new Set(previous);
      if (next.has(i)) next.delete(i);
      else {
        if (type === 'single') next.clear();
        next.add(i);
      }
      return next;
    });
  };
  const classNames = ['accordion', variant !== 'plain' && `accordion--${variant}`, className].filter(Boolean).join(' ');
  return (
    <div className={classNames}>
      {React.Children.map(children, (child, i) =>
        React.isValidElement(child)
          ? React.cloneElement(child, { _isOpen: open.has(i), _onToggle: () => toggle(i) })
          : child
      )}
    </div>
  );
}

function AccordionItem({ title, meta, icon, _isOpen, _onToggle, children }) {
  // One top-level, unconditional useId per item → stable, collision-free trigger/panel ids that
  // pair the header with its region across renders, nested Accordions and multiple instances.
  const autoId = React.useId();
  const triggerId = `${autoId}-trigger`;
  const panelId = `${autoId}-panel`;
  return (
    <div className={`accordion__item ${_isOpen ? 'is-open' : ''}`}>
      <h3 className="accordion__heading">
        <button type="button" id={triggerId} className="accordion__header" onClick={_onToggle} aria-expanded={_isOpen} aria-controls={panelId}>
          {icon && <span className="accordion__icon">{icon}</span>}
          <span className="accordion__title">{title}</span>
          {meta && <span className="accordion__meta">{meta}</span>}
          <svg className="accordion__chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <path d="m4 6 4 4 4-4"/>
          </svg>
        </button>
      </h3>
      <div className="accordion__body" id={panelId} role="region" aria-labelledby={triggerId} hidden={!_isOpen}>{children}</div>
    </div>
  );
}

Object.assign(window, { Accordion, AccordionItem });
