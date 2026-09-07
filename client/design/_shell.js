/* Shared shell behaviour — sidebar app shell collapse toggle.
   A button carrying [data-app-side-toggle] flips .app--collapsed on the
   .app grid, narrowing the sidebar to an icon-only rail. State persists
   in localStorage so it survives navigation between demo pages. */
{
  const KEY = 'ep-sidebar-collapsed';

  function apply(collapsed) {
    const apps = document.querySelectorAll('.app');
    for (const app of apps) {
      app.classList.toggle('app--collapsed', collapsed);
    }
    const buttons = document.querySelectorAll('[data-app-side-toggle]');
    for (const button of buttons) {
      button.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
      button.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
    }
  }

  let collapsed = false;
  try { collapsed = localStorage.getItem(KEY) === '1'; } catch {}

  function labelOf(link) {
    let text = '';
    const nodes = link.childNodes;
    for (const node of nodes) {
      if (node.nodeType === 3) text += node.textContent;
    }
    return text.replaceAll(/\s+/g, ' ').trim();
  }

  function init() {
    // Cache each nav link's label as a tooltip shown only when collapsed.
    const links = document.querySelectorAll('.app-side__link');
    for (const link of links) {
      const label = labelOf(link);
      if (label) link.dataset.tip = label;
    }
    apply(collapsed);
    const buttons = document.querySelectorAll('[data-app-side-toggle]');
    for (const button of buttons) {
      button.addEventListener('click', function () {
        collapsed = !collapsed;
        try { localStorage.setItem(KEY, collapsed ? '1' : '0'); } catch {}
        apply(collapsed);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
