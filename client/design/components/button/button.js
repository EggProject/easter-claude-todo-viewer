/* EggProject — Button loading helper.
   setButtonLoading(button, loading) toggles a component-local busy state:
   adds .is-loading, sets aria-busy / aria-disabled (preserving any prior
   aria-disabled so it can be restored exactly), and — while loading —
   blocks click / Enter / Space re-activation and double form submit on
   that single button only. No native disabled (focus is kept), no
   pointer-events:none, no document-level state. */
(function () {
  'use strict';

  function setButtonLoading(button, loading) {
    if (!button) return;

    if (loading) {
      if (button.classList.contains('is-loading')) return;

      /* Remember the pre-loading aria-disabled so we restore it 1:1. */
      button.dataset.prevAriaDisabled = button.getAttribute('aria-disabled') || '';

      button.classList.add('is-loading');
      button.setAttribute('aria-busy', 'true');
      button.setAttribute('aria-disabled', 'true');

      /* Swallow re-activation on the button itself (capture phase, so it
         runs before — and cancels — any other handler on this button). */
      const block = function (e) {
        if (e.type === 'keydown' &&
            e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
        e.preventDefault();
        e.stopImmediatePropagation();
      };
      /* The submit guard only makes sense for a real submit button, so it is
         attached only when the DOM type is "submit" AND the button belongs to
         a form. A type="button" loader leaves form submits — including an
         argument-less requestSubmit() — completely untouched. Read the DOM
         property (reflects the effective type), not just attribute presence. */
      const form = (button.type === 'submit') ? button.form : null;

      /* Prevent a double submit, but only when THIS button is the submitter.
         Self-heals on every run: if the button has left the document or is no
         longer busy, it unbinds itself and drops the stored reference instead
         of wedging the form (or keeping a detached button alive) forever. */
      const blockSubmit = function (e) {
        if (!button.isConnected ||
            !button.classList.contains('is-loading') ||
            button.getAttribute('aria-busy') !== 'true') {
          if (form) form.removeEventListener('submit', blockSubmit, true);
          if (button._epLoading) delete button._epLoading;
          return;
        }
        if (e.submitter && e.submitter !== button) return;
        e.preventDefault();
      };

      button.addEventListener('click', block, {capture: true});
      button.addEventListener('keydown', block, {capture: true});
      if (form) form.addEventListener('submit', blockSubmit, {capture: true});

      button._epLoading = { block: block, blockSubmit: blockSubmit, form: form };

    } else {
      if (!button.classList.contains('is-loading')) return;

      button.classList.remove('is-loading');
      button.removeAttribute('aria-busy');

      const state = button._epLoading;
      if (state) {
        button.removeEventListener('click', state.block, true);
        button.removeEventListener('keydown', state.block, true);
        if (state.form) state.form.removeEventListener('submit', state.blockSubmit, true);
        delete button._epLoading;
      }

      /* Restore the original aria-disabled exactly (present or absent). */
      const prev = button.dataset.prevAriaDisabled;
      if (prev) button.setAttribute('aria-disabled', prev);
      else button.removeAttribute('aria-disabled');
      delete button.dataset.prevAriaDisabled;
    }
  }

  window.setButtonLoading = setButtonLoading;
})();
