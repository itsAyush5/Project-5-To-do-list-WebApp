(function () {
  'use strict';

  const STORAGE_KEY = 'todo-list.v1';
  const THEME_KEY = 'todo-theme.v1';

  let state = { todos: [], filter: 'all' };

  const els = {
    form: document.getElementById('todo-form'),
    input: document.getElementById('todo-input'),
    list: document.getElementById('todo-list'),
    itemsLeft: document.getElementById('items-left'),
    filters: Array.from(document.querySelectorAll('.filter')),
    clearCompleted: document.getElementById('clear-completed'),
    themeToggle: document.getElementById('theme-toggle'),
    progressBar: document.getElementById('progress-bar'),
    progressLabel: document.getElementById('progress-label'),
    empty: document.getElementById('empty-state'),
      themeSwitchCheckbox: document.querySelector('.theme-switch__checkbox'),
  };

  function getSystemTheme() {
    try {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch { return 'light'; }
  }

  function getEffectiveTheme() {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'light' || attr === 'dark') return attr;
    return getSystemTheme();
  }

  function updateThemeToggleUI() {
    if (!els.themeToggle) return;
    const eff = getEffectiveTheme();
    const next = eff === 'dark' ? 'light' : 'dark';
    els.themeToggle.setAttribute('aria-pressed', eff === 'dark' ? 'true' : 'false');
    els.themeToggle.textContent = eff === 'dark' ? 'Light mode' : 'Dark mode';
    els.themeToggle.title = `Switch to ${next} mode`;

      // Sync custom theme switch checkbox
      if (els.themeSwitchCheckbox) {
        els.themeSwitchCheckbox.checked = eff === 'dark';
        els.themeSwitchCheckbox.setAttribute('aria-checked', eff === 'dark' ? 'true' : 'false');
      }
  }

  function applyTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') return;
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
    updateThemeToggleUI();
  }

  function loadTheme() {
    let t;
    try {
      t = localStorage.getItem(THEME_KEY);
    } catch {}
    if (t === 'light' || t === 'dark') {
      document.documentElement.setAttribute('data-theme', t);
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
    updateThemeToggleUI();
  }


  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.todos)) {
        state.todos = parsed.todos.filter(v => v && typeof v.text === 'string').map(v => ({
          id: String(v.id ?? crypto.randomUUID?.() ?? Date.now() + Math.random()),
          text: String(v.text).slice(0, 200),
          completed: Boolean(v.completed),
        }));
      }
      if (parsed.filter === 'active' || parsed.filter === 'completed') {
        state.filter = parsed.filter;
      }
    } catch (e) {
      console.warn('Failed to load saved todos', e);
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save todos', e);
    }
  }

  function uid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  function addTodo(text) {
    const t = text.trim();
    if (!t) return;
    state.todos.unshift({ id: uid(), text: t, completed: false });
    save();
    render();
  }

  function toggleTodo(id) {
    const todo = state.todos.find(t => t.id === id);
    if (!todo) return;
    todo.completed = !todo.completed;
    save();
    render();
  }

  function deleteTodo(id) {
    state.todos = state.todos.filter(t => t.id !== id);
    save();
    render();
  }

  function editTodo(id, newText) {
    const t = state.todos.find(t => t.id === id);
    if (!t) return;
    const v = newText.trim();
    if (!v) {
      deleteTodo(id);
      return;
    }
    t.text = v;
    save();
    render();
  }

  function clearCompleted() {
    state.todos = state.todos.filter(t => !t.completed);
    save();
    render();
  }

  function setFilter(f) {
    state.filter = f;
    save();
    render();
  }

  let lastAllComplete = false;
  function confettiBurst() {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();

    const styles = getComputedStyle(document.documentElement);
    const colors = [
      styles.getPropertyValue('--accent').trim() || '#7c4dff',
      styles.getPropertyValue('--ok').trim() || '#22c55e',
      styles.getPropertyValue('--danger').trim() || '#ff4d6d',
      '#ffd166', '#06d6a0', '#118ab2', '#ef476f'
    ];

    const N = 120;
    const parts = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 100,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 10,
      vx: -2 + Math.random() * 4,
      vy: 2 + Math.random() * 2,
      g: 0.05 + Math.random() * 0.05,
      a: Math.random() * Math.PI,
      av: -0.2 + Math.random() * 0.4,
      color: colors[(Math.random() * colors.length) | 0],
    }));

    let frame = 0;
    let raf;
    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.g;
        p.a += p.av;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      frame++;
      if (frame < 120) raf = requestAnimationFrame(tick);
      else {
        cancelAnimationFrame(raf);
        canvas.remove();
      }
    }

    raf = requestAnimationFrame(tick);
    setTimeout(() => { cancelAnimationFrame(raf); canvas.remove(); }, 2000);
  }

  function render() {
    els.filters.forEach(btn => {
      const active = btn.dataset.filter === state.filter;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    const items = state.todos.filter(t => {
      if (state.filter === 'active') return !t.completed;
      if (state.filter === 'completed') return t.completed;
      return true;
    });

    els.list.innerHTML = '';
    const frag = document.createDocumentFragment();

    for (const t of items) {
      const li = document.createElement('li');
      li.className = 'todo-item' + (t.completed ? ' completed' : '');
      li.dataset.id = t.id;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'check';
      checkbox.checked = t.completed;
      checkbox.setAttribute('aria-label', 'Toggle complete');
      checkbox.addEventListener('change', () => toggleTodo(t.id));

      const text = document.createElement('span');
      text.className = 'text';
      text.textContent = t.text;
      text.title = 'Double‑click to edit';
      text.addEventListener('dblclick', () => beginEdit(li, t));

      const actions = document.createElement('div');
      actions.className = 'actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'icon-btn';
      editBtn.title = 'Edit';
      editBtn.textContent = '✎';
      editBtn.addEventListener('click', () => beginEdit(li, t));

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'icon-btn danger';
      delBtn.title = 'Delete';
      delBtn.textContent = '🗑';
      delBtn.addEventListener('click', () => deleteTodo(t.id));

      actions.append(editBtn, delBtn);

      li.draggable = true;
      checkbox.draggable = false;
      text.draggable = false;
      editBtn.draggable = false;
      delBtn.draggable = false;

      li.addEventListener('dragstart', (e) => onDragStart(e, li, t));
      li.addEventListener('dragover', (e) => onDragOver(e, li));
      li.addEventListener('drop', onDrop);
      li.addEventListener('dragend', onDragEnd);

      li.append(checkbox, text, actions);
      frag.appendChild(li);
    }

    els.list.appendChild(frag);

    const left = state.todos.filter(t => !t.completed).length;
    els.itemsLeft.textContent = `${left} item${left === 1 ? '' : 's'} left`;

    const total = state.todos.length;
    const done = total - left;
    const pct = total ? Math.round((done / total) * 100) : 0;
    if (els.progressBar) {
      els.progressBar.style.width = `${pct}%`;
      els.progressBar.setAttribute('aria-valuenow', String(pct));
    }
    if (els.progressLabel) {
      els.progressLabel.textContent = `${pct}% completed`;
    }

    if (els.empty) {
      if (total === 0) {
        els.empty.hidden = false;
      } else {
        els.empty.hidden = true;
      }
    }

    if (total > 0 && left === 0) {
      if (!lastAllComplete) {
        lastAllComplete = true;
        confettiBurst();
      }
    } else {
      lastAllComplete = false;
    }
  }

  function beginEdit(li, todo) {
    if (li.querySelector('.edit-input')) return;

    const current = li.querySelector('.text');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'edit-input';
    input.value = todo.text;
    input.maxLength = 200;

    li.replaceChild(input, current);
    input.focus();
    input.setSelectionRange(todo.text.length, todo.text.length);

    function commit() {
      editTodo(todo.id, input.value);
    }

    function cancel() {
      render();
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') commit();
      else if (e.key === 'Escape') cancel();
    });
    input.addEventListener('blur', commit);
  }

  const dnd = { draggingId: null, placeholder: null, ghost: null, dragHeight: 48 };

  function ensurePlaceholder(height) {
    if (dnd.placeholder && dnd.placeholder.isConnected) return dnd.placeholder;
    const ph = document.createElement('li');
    ph.className = 'todo-item placeholder';
    ph.style.height = `${Math.max(40, Math.floor(height || dnd.dragHeight))}px`;
    dnd.placeholder = ph;
    return ph;
  }

  function onDragStart(e, li, todo) {
    dnd.draggingId = todo.id;
    const rect = li.getBoundingClientRect();
    dnd.dragHeight = rect.height;
    li.classList.add('dragging');

    const ghost = li.cloneNode(true);
    ghost.style.position = 'absolute';
    ghost.style.top = '-10000px';
    ghost.style.left = '-10000px';
    ghost.style.width = rect.width + 'px';
    ghost.style.pointerEvents = 'none';
    ghost.style.opacity = '0.95';
    ghost.style.transform = 'scale(1.02)';
    ghost.style.boxShadow = '0 12px 30px rgba(0,0,0,0.25)';
    document.body.appendChild(ghost);
    dnd.ghost = ghost;
    if (e.dataTransfer) {
      try { e.dataTransfer.setData('text/plain', todo.id); } catch {}
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setDragImage(ghost, rect.width / 2, rect.height / 2); } catch {}
    }
    ensurePlaceholder(rect.height);
  }

  function onDragOver(e, li) {
    if (!dnd.draggingId) return;
    e.preventDefault();
    const ph = ensurePlaceholder(dnd.dragHeight);
    if (li === ph) return;
    const rect = li.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    if (before) {
      els.list.insertBefore(ph, li);
    } else {
      els.list.insertBefore(ph, li.nextSibling);
    }
  }

  function onListDragOver(e) {
    if (!dnd.draggingId) return;
    e.preventDefault();
    const ph = ensurePlaceholder(dnd.dragHeight);
    if (els.list.lastElementChild !== ph) {
      els.list.appendChild(ph);
    }
  }

  function applyVisibleOrder(newOrderIds) {
    const filter = state.filter;
    if (filter === 'all') {
      const byId = new Map(state.todos.map(t => [t.id, t]));
      state.todos = newOrderIds.map(id => byId.get(id)).filter(Boolean);
    } else {
      const isActive = (t) => !t.completed;
      const predicate = filter === 'active' ? isActive : (t) => !isActive(t);
      const group = state.todos.filter(predicate);
      const indexMap = new Map(newOrderIds.map((id, i) => [id, i]));
      const groupSorted = [...group].sort((a, b) => (indexMap.get(a.id) ?? 0) - (indexMap.get(b.id) ?? 0));
      let gi = 0;
      state.todos = state.todos.map(t => predicate(t) ? groupSorted[gi++] : t);
    }
    save();
    render();
  }

  function commitReorder() {
    if (!dnd.draggingId || !dnd.placeholder || !dnd.placeholder.isConnected) return cleanupDnd();
    const children = Array.from(els.list.children);
    const order = [];
    for (const el of children) {
      if (el === dnd.placeholder) {
        order.push(dnd.draggingId);
      } else if (el.dataset && el.dataset.id) {
        order.push(el.dataset.id);
      }
    }
    applyVisibleOrder(order);
    cleanupDnd();
  }

  function onDrop(e) {
    e.preventDefault();
    commitReorder();
  }

  function cleanupDnd() {
    const draggingEl = els.list.querySelector('.todo-item.dragging');
    if (draggingEl) draggingEl.classList.remove('dragging');
    if (dnd.placeholder && dnd.placeholder.isConnected) dnd.placeholder.remove();
    if (dnd.ghost && dnd.ghost.parentNode) dnd.ghost.remove();
    dnd.draggingId = null; dnd.placeholder = null; dnd.ghost = null; dnd.dragHeight = 48;
  }

  function onDragEnd() {
    cleanupDnd();
  }

  // ---------- Event wiring ----------
  els.form.addEventListener('submit', (e) => {
    e.preventDefault();
    addTodo(els.input.value);
    els.input.value = '';
    els.input.focus();
  });

  els.filters.forEach(btn => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter));
  });

  els.clearCompleted.addEventListener('click', clearCompleted);
  if (els.themeToggle) {
    els.themeToggle.addEventListener('click', () => {
      const next = getEffectiveTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });
  }

    // Custom theme switch checkbox event
    if (els.themeSwitchCheckbox) {
      els.themeSwitchCheckbox.addEventListener('change', (e) => {
        const next = els.themeSwitchCheckbox.checked ? 'dark' : 'light';
        applyTheme(next);
      });
      // Sync initial state
      updateThemeToggleUI();
    }

  els.list.addEventListener('dragover', onListDragOver);
  els.list.addEventListener('drop', onDrop);

  loadTheme();
  load();
  render();
})();
