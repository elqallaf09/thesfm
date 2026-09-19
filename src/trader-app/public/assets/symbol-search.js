(function (global) {
  'use strict';
  function canonicalSymbol(item) {
    const value = String(item?.symbol || '').trim().toUpperCase();
    return /^[A-Z0-9^][A-Z0-9.^=:/-]{0,39}$/.test(value) ? value : null;
  }
  function selection(payload) {
    const resolved = payload?.resolved;
    return canonicalSymbol(resolved) ? resolved : null;
  }
  function mount({ form, input, get, open, text: t }) {
    if (!form || !input) return null;
    const button = form.querySelector('button[type="submit"]');
    const results = document.createElement('div');
    results.id = 'symbol-search-results'; results.className = 'symbol-search-results panel';
    results.setAttribute('role', 'status'); results.setAttribute('aria-live', 'polite');
    results.hidden = true; form.insertAdjacentElement('afterend', results);
    input.dir = 'auto'; input.setAttribute('aria-controls', results.id);
    let sequence = 0;
    const busy = value => { form.setAttribute('aria-busy', String(value)); if (button) button.disabled = value; };
    const message = value => { results.replaceChildren(); results.textContent = value; results.hidden = false; };
    const choose = item => {
      const symbol = canonicalSymbol(item); if (!symbol) return;
      sequence += 1; busy(false); results.hidden = true; input.value = symbol; open(symbol);
    };
    async function search(value) {
      const query = String(value || '').trim(); const ticket = ++sequence;
      if (!query) { busy(false); message(t('اكتب اسم الأصل أو رمزه أولاً.', 'Enter an asset name or symbol.', 'Saisissez le nom ou le symbole d’un actif.')); input.focus(); return; }
      busy(true); message(t('جارٍ البحث عن الأصل…', 'Finding the asset…', 'Recherche de l’actif…'));
      try {
        const payload = await get(`/market/search?q=${encodeURIComponent(query)}&resolve=1`);
        if (ticket !== sequence) return;
        if (payload?.ok === false) throw new Error('Search unavailable');
        const item = selection(payload);
        if (item) { choose(item); return; }
        const choices = (Array.isArray(payload?.results) ? payload.results : []).filter(canonicalSymbol).slice(0, 8);
        message(choices.length ? t('اختر الأصل المقصود:', 'Choose the intended asset:', 'Choisissez l’actif recherché :')
          : t('لم نجد اسماً مطابقاً. جرّب الاسم الكامل أو رمز التداول.', 'No matching name. Try the full name or trading symbol.', 'Aucun nom correspondant. Essayez le nom complet ou le symbole.'));
        for (const choice of choices) {
          const option = document.createElement('button'); option.type = 'button'; option.className = 'ghost-btn';
          option.textContent = [choice.symbol, choice.name, choice.exchange].filter(Boolean).join(' · ');
          option.addEventListener('click', () => choose(choice)); results.append(option);
        }
      } catch {
        if (ticket === sequence) message(t('تعذر البحث الآن. أعد المحاولة.', 'Search is unavailable. Please retry.', 'Recherche indisponible. Réessayez.'));
      } finally { if (ticket === sequence) busy(false); }
    }
    form.addEventListener('submit', event => { event.preventDefault(); search(input.value); });
    input.addEventListener('input', () => { sequence += 1; busy(false); results.hidden = true; });
    input.addEventListener('keydown', event => { if (event.key === 'Escape') { sequence += 1; busy(false); results.hidden = true; } });
    return { search };
  }
  global.SFMSymbolSearch = { mount, selection, canonicalSymbol };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.SFMSymbolSearch;
})(typeof window !== 'undefined' ? window : globalThis);
