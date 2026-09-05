/* Shared shell behaviour — sidebar app shell collapse toggle.
   A button carrying [data-app-side-toggle] flips .app--collapsed on the
   .app grid, narrowing the sidebar to an icon-only rail. State persists
   in localStorage so it survives navigation between demo pages. */
(function () {
  var KEY = 'ep-sidebar-collapsed';

  function apply(collapsed) {
    var apps = document.querySelectorAll('.app');
    for (var i = 0; i < apps.length; i++) {
      apps[i].classList.toggle('app--collapsed', collapsed);
    }
    var buttons = document.querySelectorAll('[data-app-side-toggle]');
    for (var j = 0; j < buttons.length; j++) {
      buttons[j].setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
      buttons[j].setAttribute('aria-pressed', collapsed ? 'true' : 'false');
    }
  }

  var collapsed = false;
  try { collapsed = localStorage.getItem(KEY) === '1'; } catch (error) {}

  function labelOf(link) {
    var text = '';
    var nodes = link.childNodes;
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].nodeType === 3) text += nodes[i].textContent;
    }
    return text.replace(/\s+/g, ' ').trim();
  }

  function init() {
    // Cache each nav link's label as a tooltip shown only when collapsed.
    var links = document.querySelectorAll('.app-side__link');
    for (var k = 0; k < links.length; k++) {
      var label = labelOf(links[k]);
      if (label) links[k].setAttribute('data-tip', label);
    }
    apply(collapsed);
    var buttons = document.querySelectorAll('[data-app-side-toggle]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () {
        collapsed = !collapsed;
        try { localStorage.setItem(KEY, collapsed ? '1' : '0'); } catch (error) {}
        apply(collapsed);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
