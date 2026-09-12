/* global React */
/* ============ Button ============
   Props:
     - variant: 'primary' (default) | 'secondary' | 'ghost' | 'ink' | 'danger'
     - size:    'sm' | 'md' (default) | 'lg'
   Pass any standard <button> props through.
============================================ */
function Button({ variant = 'primary', size = 'md', className = '', children, ...rest }) {
  const classNames = ['btn', `btn--${variant}`, size !== 'md' && `btn--${size}`, className]
    .filter(Boolean).join(' ');
  return <button className={classNames} {...rest}>{children}</button>;
}

Object.assign(window, { Button });
