/* global React */

/* ============ Avatar ============
   Props:
     - name:   string — initials are derived if no src/children
     - src:    string — image URL
     - alt:    string
     - size:   'xs'|'sm'|'md'(default)|'lg'|'xl'|'2xl'
     - shape:  'circle' (default) | 'square'
     - tone:   'blue' (default) | 'ink' | 'yolk' | 'slate' | 'violet' | 'teal'  — or 'auto' to hash from name
     - status: 'online' | 'away' | 'busy' | 'offline'  — folded into the root aria-label (not colour-only)
     - decorative: boolean — when true the avatar is aria-hidden (use when an adjacent name already identifies it)
   Accessible name: role="img" + aria-label={name (+ status)} on the root; the
   visible initials and the status dot are aria-hidden (name is not title-only).
============================================ */
const AVATAR_TONES = ['blue', 'ink', 'yolk', 'slate', 'violet', 'teal'];
const AVATAR_STATUS_LABELS = { online: 'Online', away: 'Away', busy: 'Busy', offline: 'Offline' };
function hashTone(name) {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}
function initialsOf(name = '') {
  const parts = name.trim().split(/\s+/);
  if (!parts[0]) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Avatar({
  name = '', src, alt,
  size = 'md', shape = 'circle',
  tone = 'auto', status,
  decorative = false,
  children, className = '', ...rest
}) {
  const resolvedTone = tone === 'auto' ? hashTone(name || 'EP') : tone;
  const classNames = [
    'avatar',
    `avatar--${size}`,
    shape === 'square' && 'avatar--square',
    `avatar--${resolvedTone}`,
    className,
  ].filter(Boolean).join(' ');
  // The programmatic name lives on the root (role="img" + aria-label), never on
  // the visible initials or on title alone. Presence status is folded into that
  // name so it is never carried by colour alone. `decorative` hides the whole
  // avatar from assistive tech; an avatar with nothing to announce stays a plain
  // (silent) span rather than a nameless role="img".
  const baseName = src ? (alt ?? name) : name;
  const statusLabel = status ? AVATAR_STATUS_LABELS[status] : '';
  const accessibleName = [baseName, statusLabel].filter(Boolean).join(', ');
  const a11y = decorative
    ? { 'aria-hidden': 'true' }
    : accessibleName
      ? { role: 'img', 'aria-label': accessibleName }
      : {};
  return (
    <span className={classNames} title={name || undefined} {...a11y} {...rest}>
      {src
        ? <img className="avatar__image" src={src} alt=""/>
        : <span className="avatar__initials" aria-hidden="true">{children ?? initialsOf(name)}</span>}
      {status && <span className={`avatar__status avatar__status--${status}`} aria-hidden="true"/>}
    </span>
  );
}

/* ============ AvatarGroup — overlap N avatars; show +rest ============ */
function AvatarGroup({ children, max = 4, size = 'md', className = '' }) {
  const childArray = React.Children.toArray(children);
  const visible = childArray.slice(0, max);
  const overflowCount = childArray.length - visible.length;
  const classNames = ['avatar-group', `avatar-group--${size}`, className].filter(Boolean).join(' ');
  return (
    <span className={classNames}>
      {visible.map((child, index) => React.cloneElement(child, { key: index, size }))}
      {overflowCount > 0 && <span className={`avatar-group__more avatar--${size}`} style={{ width: undefined, height: undefined }}>+{overflowCount}</span>}
    </span>
  );
}

Object.assign(window, { Avatar, AvatarGroup });
