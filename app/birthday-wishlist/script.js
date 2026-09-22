const API_URL = 'https://script.google.com/macros/s/AKfycbz72ym42rOoHv8ThPvmtYnGG6T8vltcYuu0r1ZIkmN5t7hdPNMVMTJJtlSRnzTPI9Je/exec';

// ================================================================
//  КОНФИГУРАЦИЯ АДМИНОВ
// ================================================================
const ADMIN_CONFIG = {
  '00000': {
    slug: 'serezha',
    label: 'Серёжа',
    wishes: [
      { title: 'Что по кайфу 🎁',                 description: 'Открытая категория — на ваш вкус' },
      { title: 'Хентай-фигурка',                  description: 'Обязательно по телосложению как жена (не милфа, не высокая)' },
      { title: 'Плакаты Berserk / Lovecraft',     description: 'Тематика: Берсерк или Лавкрафт' },
      { title: 'Ночник',                          description: 'Уютный ночник в комнату' },
      { title: 'Алкоголь до 23° + магнитик',      description: 'Выпить вместе со мной на ДР. Крепость не больше 23° + магнитик на память' },
      { title: 'Фотокружка с пожеланиями',        description: 'Кайфовое прикольное фото со мной или фотокружка с вашими пожеланиями' },
      { title: 'Что-то прикольное или памятное',  description: 'Сюрприз — на вашу фантазию' },
      { title: 'Держатель для наушников или очков', description: 'Настенный' },
      { title: 'Кофемашина',                      description: 'Чтобы делать латте ☕' },
      { title: 'Гиря',                      description: 'Чтобы пизды давать' },
    ],
  },
  // '1111': {
  //   slug: 'test',
  //   label: 'Тестовый админ',
  //   wishes: [
  //     { title: 'Тестовый подарок №1', description: 'Проверка работы приложения' },
  //     { title: 'Тестовый подарок №2', description: 'Проверка работы приложения' },
  //     { title: 'Тестовый подарок №3', description: 'Проверка работы приложения' },
  //     { title: 'Тестовый подарок №4', description: 'Проверка работы приложения' },
  //     { title: 'Тестовый подарок №5', description: 'Проверка работы приложения' },
  //   ],
  // },
};

const OWNERS = Object.values(ADMIN_CONFIG).map(a => ({ slug: a.slug, label: a.label }));

const LS_USER  = 'wishlist_user';
const LS_OWNER = 'wishlist_owner';

let currentUser  = null;
let adminConfig  = null;
let currentOwner = null;

const $ = (s) => document.querySelector(s);

// ---------- API ----------
async function parseResponse_(res) {
  const text = await res.text();
  if (!text) {
    console.error('Пустой ответ. URL:', API_URL, 'Status:', res.status, 'Redirected:', res.redirected, 'URL:', res.url);
    throw new Error(
      'Сервер вернул пустой ответ. Проверь:\n' +
      '1) URL в script.js заканчивается на /exec;\n' +
      '2) в Управлении развертываниями активна новая версия, доступ «Все»;\n' +
      '3) прямая ссылка ' + API_URL + '?action=list открывается в браузере и возвращает JSON.'
    );
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('Ответ не JSON:', text.slice(0, 300));
    throw new Error('Сервер вернул не-JSON. Первые 200 символов: ' + text.slice(0, 200));
  }
}

async function apiGet(action, extra = {}, retries = 2) {
  const params = new URLSearchParams({ action, ...extra });
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${API_URL}?${params}`);
      return await parseResponse_(res);
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw lastErr;
}

async function apiPost(payload, retries = 2) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow',
      });
      return await parseResponse_(res);
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw lastErr;
}

// ---------- UI helpers ----------
function showToast(msg, duration = 4000) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), duration);
}

function showLoader() { $('#loader').classList.remove('hidden'); }
function hideLoader() { $('#loader').classList.add('hidden'); }

function setLoginLoading(on) {
  const btn = $('#register-btn');
  btn.disabled = on;
  btn.textContent = on ? 'Вход…' : 'Войти';
}

function normalizeName(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// ---------- Auth ----------
async function login() {
  const raw = $('#username-input').value.trim();
  if (!raw) return;

  if (Object.prototype.hasOwnProperty.call(ADMIN_CONFIG, raw)) {
    adminConfig = ADMIN_CONFIG[raw];
    currentUser = raw;
    currentOwner = adminConfig.slug;
    localStorage.setItem(LS_OWNER, currentOwner);
    enterApp();
    return;
  }

  const name = normalizeName(raw);
  $('#auth-message').textContent = '';
  setLoginLoading(true);
  try {
    const data = await apiPost({ action: 'register', name });
    if (data.error) throw new Error(data.error);
    currentUser = data.name;
    localStorage.setItem(LS_USER, currentUser);
    if (!currentOwner) currentOwner = OWNERS[0].slug;
    enterApp();
  } catch (err) {
    $('#auth-message').textContent = err.message;
  } finally {
    setLoginLoading(false);
  }
}

function logout() {
  localStorage.removeItem(LS_USER);
  localStorage.removeItem(LS_OWNER);
  location.reload();
}

// ---------- Owner picker ----------
function buildOwnerPicker() {
  const sel = $('#owner-select');
  sel.innerHTML = '';
  OWNERS.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.slug;
    opt.textContent = o.label;
    sel.appendChild(opt);
  });
  if (!currentOwner || !OWNERS.some(o => o.slug === currentOwner)) {
    currentOwner = OWNERS[0].slug;
  }
  sel.value = currentOwner;
  sel.onchange = () => {
    currentOwner = sel.value;
    localStorage.setItem(LS_OWNER, currentOwner);
    loadWishes();
  };
}

// ---------- Wishlist ----------
async function loadWishes() {
  showLoader();
  $('#wishlist-container').innerHTML = '';
  try {
    const data = await apiGet('list', { owner: currentOwner });
    if (data.error) throw new Error(data.error);
    renderWishes(data.wishes);
  } catch (err) {
    showToast('Ошибка загрузки: ' + err.message, 6000);
    $('#wishlist-container').innerHTML = '<p class="empty">Не удалось загрузить</p>';
  } finally {
    hideLoader();
  }
}

function renderWishes(wishes) {
  const container = $('#wishlist-container');
  container.innerHTML = '';

  if (!wishes.length) {
    container.innerHTML = '<p class="empty">Пока подарков нет. Заполните их в админ-панели.</p>';
    return;
  }

  wishes.forEach(w => {
    const contributors = w.contributors || [];
    const isMine    = !adminConfig && contributors.some(c => c.name === currentUser);
    const hasPeople = contributors.length > 0;

    const card = document.createElement('div');
    card.className = 'wish-card';
    if (isMine)    card.classList.add('mine');
    if (hasPeople) card.classList.add('group');

    let badge = '';
    if (isMine) {
      badge = '<span class="badge badge-mine">🎯 Вы участвуете</span>';
    } else if (hasPeople) {
      badge = `<span class="badge badge-group">👥 Участвуют: ${contributors.length}</span>`;
    }

    let contributorsHtml = '';
    if (hasPeople) {
      const items = contributors.map(c => {
        const meClass = c.name === currentUser ? ' me' : '';
        const x = adminConfig
          ? `<button class="chip-x" title="Убрать бронь" data-wish="${escapeHtml(w.id)}" data-name="${escapeHtml(c.name)}">×</button>`
          : '';
        return `<span class="contrib-chip${meClass}">${escapeHtml(c.name)}${x}</span>`;
      }).join('');
      contributorsHtml = `<div class="contributors">${items}</div>`;
    }

    const info = document.createElement('div');
    info.className = 'wish-info';
    info.innerHTML = `
      ${badge}
      <h3>${escapeHtml(w.title)}</h3>
      ${w.description ? `<p>${escapeHtml(w.description)}</p>` : ''}
      ${w.url ? `<p><a href="${escapeHtml(w.url)}" target="_blank" rel="noopener">Ссылка →</a></p>` : ''}
      ${contributorsHtml}
    `;
    card.appendChild(info);

    if (!adminConfig) {
      const btn = document.createElement('button');
      if (isMine) {
        btn.textContent = 'Отменить';
        btn.className = 'btn-cancel';
        btn.onclick = () => joinLeave(w.id, 'leave');
      } else {
        btn.textContent = hasPeople ? 'Присоединиться' : 'Беру на себя';
        btn.onclick = () => joinLeave(w.id, 'join');
      }
      card.appendChild(btn);
    }

    container.appendChild(card);
  });

  container.querySelectorAll('.chip-x').forEach(btn => {
    btn.onclick = async (ev) => {
      ev.stopPropagation();
      const wishId = btn.dataset.wish;
      const name = btn.dataset.name;
      if (!confirm(`Убрать бронь «${name}»?`)) return;
      showLoader();
      try {
        const data = await apiPost({ action: 'adminRemoveContrib', wishId, name });
        if (data.error) throw new Error(data.error);
        showToast('Бронь снята');
        await loadWishes();
      } catch (err) {
        showToast(err.message, 6000);
        hideLoader();
      }
    };
  });
}

async function joinLeave(wishId, action) {
  showLoader();
  try {
    const data = await apiPost({ action, wishId, name: currentUser });
    if (data.error) throw new Error(data.error);
    showToast(action === 'join' ? 'Добавлено!' : 'Участие отменено');
  } catch (err) {
    showToast(err.message, 6000);
    hideLoader();
    return;
  }
  await loadWishes();
}

// ---------- Admin ----------
async function adminSeed() {
  if (!adminConfig) return;
  if (!confirm(`Заполнить список «${adminConfig.label}» заново? Текущие пожелания этого списка будут перезаписаны.`)) return;
  showLoader();
  try {
    const data = await apiPost({ action: 'adminSeed', owner: adminConfig.slug, wishes: adminConfig.wishes });
    if (data.error) throw new Error(data.error);
    showToast(`Заполнено: ${data.count} подарков`);
    currentOwner = adminConfig.slug;
    $('#owner-select').value = currentOwner;
    localStorage.setItem(LS_OWNER, currentOwner);
    await loadWishes();
  } catch (err) {
    showToast(err.message, 6000);
    hideLoader();
  }
}

async function adminClear() {
  if (!adminConfig) return;
  const listLabel = (OWNERS.find(o => o.slug === currentOwner) || {}).label || currentOwner;
  if (!confirm(`Снять ВСЕ брони с подарков списка «${listLabel}»?`)) return;
  showLoader();
  try {
    const data = await apiPost({ action: 'adminClear', owner: currentOwner });
    if (data.error) throw new Error(data.error);
    const matched = data.matchedWishes != null ? ` (подарков: ${data.matchedWishes})` : '';
    showToast(`Очищено броней: ${data.cleared}${matched}`);
    await loadWishes();
  } catch (err) {
    showToast(err.message, 6000);
    hideLoader();
  }
}

async function adminClearAll() {
  if (!adminConfig) return;
  if (!confirm('Снять ВСЕ брони во ВСЕХ списках?')) return;
  showLoader();
  try {
    const data = await apiPost({ action: 'adminClearAll' });
    if (data.error) throw new Error(data.error);
    showToast(`Удалено броней: ${data.cleared}`);
    await loadWishes();
  } catch (err) {
    showToast(err.message, 6000);
    hideLoader();
  }
}

async function adminWipe() {
  if (!confirm('ПОЛНЫЙ СБРОС: удалить всех гостей и все брони во всех списках? Необратимо.')) return;
  showLoader();
  try {
    const data = await apiPost({ action: 'adminWipe' });
    if (data.error) throw new Error(data.error);
    showToast('Всё сброшено');
    await loadWishes();
  } catch (err) {
    showToast(err.message, 6000);
    hideLoader();
  }
}

// ---------- UI ----------
function enterApp() {
  $('#auth-section').classList.add('hidden');
  $('#wishlist-section').classList.remove('hidden');

  const userBar = $('#current-user');
  if (adminConfig) {
    $('#admin-panel').classList.remove('hidden');
    $('#admin-title').textContent = `🛠️ Админ-панель — ${adminConfig.label}`;
    userBar.textContent = `👑 Админ: ${adminConfig.label}`;
  } else {
    $('#admin-panel').classList.add('hidden');
    userBar.textContent = `👤 ${currentUser}`;
  }

  buildOwnerPicker();
  loadWishes();
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]
  );
}

document.addEventListener('DOMContentLoaded', () => {
  $('#register-btn').onclick = login;
  $('#username-input').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  $('#refresh-btn').onclick = loadWishes;
  $('#logout-btn').onclick  = logout;

  $('#seed-btn').onclick       = adminSeed;
  $('#clear-btn').onclick      = adminClear;
  $('#clear-all-btn').onclick  = adminClearAll;
  $('#wipe-btn').onclick       = adminWipe;

  const savedUser  = localStorage.getItem(LS_USER);
  const savedOwner = localStorage.getItem(LS_OWNER);

  if (savedUser) {
    currentUser = savedUser;
    currentOwner = savedOwner || (OWNERS[0] && OWNERS[0].slug);
    enterApp();
  } else if (savedOwner) {
    localStorage.removeItem(LS_OWNER);
  }
});