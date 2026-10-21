/* Shared, dependency-free UI feedback for every ResearchMate page. */
(function () {
  'use strict';
  if (window.ResearchMateUI) return;

  var region;
  function ensureRegion() {
    if (region && region.isConnected) return region;
    region = document.querySelector('.rm-toast-region');
    if (!region) {
      region = document.createElement('div');
      region.className = 'rm-toast-region';
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('aria-relevant', 'additions text');
      region.setAttribute('aria-atomic', 'false');
      document.body.appendChild(region);
    }
    return region;
  }

  function toast(message, type, title) {
    var kind = ['success', 'error', 'warning', 'info'].indexOf(type) >= 0 ? type : 'info';
    var defaults = { success: 'Success', error: 'Something went wrong', warning: 'Please check', info: 'Information' };
    var item = document.createElement('section');
    item.className = 'rm-toast';
    item.dataset.type = kind;
    item.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    var content = document.createElement('div'); content.className = 'rm-toast-content';
    var heading = document.createElement('p'); heading.className = 'rm-toast-title'; heading.textContent = title || defaults[kind];
    var body = document.createElement('p'); body.className = 'rm-toast-message'; body.textContent = String(message == null ? '' : message);
    var close = document.createElement('button'); close.type = 'button'; close.className = 'rm-toast-close'; close.setAttribute('aria-label', 'Dismiss notification'); close.textContent = '×';
    content.append(heading, body); item.append(content, close);
    var host = ensureRegion(); host.appendChild(item);
    var timeout = window.setTimeout(dismiss, 4200);
    function dismiss() {
      window.clearTimeout(timeout);
      if (!item.isConnected) return;
      item.classList.add('rm-toast-out');
      window.setTimeout(function () { item.remove(); }, 200);
    }
    close.addEventListener('click', dismiss);
    while (host.children.length > 4) host.firstElementChild.remove();
    return item;
  }

  function setLoading(button, loading, label) {
    if (!button) return;
    if (loading) {
      if (button.dataset.rmOriginalHtml === undefined) button.dataset.rmOriginalHtml = button.innerHTML;
      if (button.dataset.rmOriginalDisabled === undefined) button.dataset.rmOriginalDisabled = String(button.disabled);
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.classList.add('rm-is-loading');
      button.innerHTML = '<span class="rm-button-spinner" aria-hidden="true"></span>' + (label || 'Working…');
    } else if (button.dataset.rmOriginalHtml !== undefined) {
      button.innerHTML = button.dataset.rmOriginalHtml;
      button.disabled = button.dataset.rmOriginalDisabled === 'true';
      button.removeAttribute('aria-busy');
      button.classList.remove('rm-is-loading');
      delete button.dataset.rmOriginalHtml;
      delete button.dataset.rmOriginalDisabled;
    }
  }

  window.ResearchMateUI = { toast: toast, setLoading: setLoading };

  /* Keep existing validation/business logic intact, but replace blocking alerts with toast feedback. */
  window.alert = function (message) {
    var text = String(message == null ? '' : message);
    var type = /success|successfully|copied|saved|added|updated|generated/i.test(text) ? 'success' :
      /error|failed|invalid|unable|does not match|please enter|please select|please fill/i.test(text) ? 'error' : 'info';
    toast(text, type);
  };

  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    var button = event.submitter || form.querySelector('button[type="submit"], input[type="submit"]');
    if (!button || button.disabled) return;
    setLoading(button, true, button.dataset.loadingText || 'Processing…');
    /* Current frontend actions are local/demo operations; restore the control after their handlers run. */
    window.setTimeout(function () { setLoading(button, false); }, 1100);
  }, true);

  document.addEventListener('click', function (event) {
    var button = event.target.closest('button, .btn, .login-btn, .project-view-btn, .create-project-btn');
    if (!button || button.disabled || button.type === 'submit') return;
    button.classList.add('rm-pressed');
    window.setTimeout(function () { button.classList.remove('rm-pressed'); }, 180);
    if (['summarizeBtn', 'extractBtn'].indexOf(button.id) >= 0) {
      setLoading(button, true, button.id === 'summarizeBtn' ? 'Summarizing…' : 'Extracting…');
      window.setTimeout(function () { setLoading(button, false); }, 900);
    }
  });
})();
