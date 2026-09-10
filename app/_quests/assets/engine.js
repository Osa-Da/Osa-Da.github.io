/* =========================================================================
   ПЛАТФОРМА: вся логика для ЛЮБОЙ игры. Стиль и механики закреплены здесь —
   отдельные игры (games/<имя>/data.js) только описывают персонажей и коды.

   Подключение в игре (games/<имя>/index.html):
     <script src="https://cdn.tailwindcss.com"></script>
     <link rel="stylesheet" href="../../assets/engine.css">
     <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
     <script src="../../assets/engine.js"></script>
     <script src="./data.js"></script>
     <script>Engine.mount(GAME, { debug: true });</script>   // debug=false в проде
   ========================================================================= */
const Engine = (function(){

  let GAME = null;
  let PREFIX = '';
  let current = null;
  let DEBUG = false;

  function key(k){ return PREFIX + k; }
  function loadArr(k){ try { return JSON.parse(localStorage.getItem(key(k))) || []; } catch(e){ return []; } }
  function saveArr(k, arr){ localStorage.setItem(key(k), JSON.stringify(arr)); }
  function refreshIcons(){ if (window.lucide) lucide.createIcons(); }
  function esc(s){ return (s||'').replace(/"/g,'&quot;'); }

  /* ----------------------------- каркас страницы ----------------------------- */

  function shell(){
    return `
      <div class="min-h-screen p-4 sm:p-6 flex flex-col items-center">
        <div class="w-full max-w-4xl mb-3">
          <a href="../../../quests.html" class="text-gray-400 hover:text-gray-200 text-sm">← в журнал</a>
        </div>

        <div id="gate" class="card rounded-xl p-6 sm:p-8 w-full max-w-2xl">
          <h1 class="text-3xl sm:text-4xl font-bold text-center mb-6 glow-text font-serif">${GAME.title}</h1>
          <div class="text-center mb-6">
            <i data-lucide="user-round" class="w-16 h-16 text-gray-300 mx-auto"></i>
            <p class="text-lg text-gray-300 mt-3">Личное дело</p>
          </div>
          <div class="mb-4">
            <input type="text" id="codeInput" placeholder="Введите код персонажа..."
              class="w-full bg-black/20 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onclick="Engine.enterCode()"
              class="mt-3 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition w-full">Активация</button>
          </div>
          <div id="gateMsg"></div>
        </div>

        <div id="card" class="card rounded-xl p-5 sm:p-8 w-full max-w-4xl" style="display:none"></div>
      </div>

      <button onclick="Engine.toggleGlossary()" title="Справочник"
        class="fixed top-4 right-4 z-40 p-3 bg-gray-700/80 hover:bg-gray-600 rounded-full shadow-lg">
        ${'<i data-lucide="book-open" class="w-5 h-5 text-white"></i>'}
      </button>
      ${DEBUG ? `
      <button onclick="Engine.toggleSheet()" title="Режим разработчика"
        class="fixed top-20 right-4 z-40 p-3 bg-purple-700/80 hover:bg-purple-600 rounded-full shadow-lg">
        <i data-lucide="terminal" class="w-5 h-5 text-white"></i>
      </button>` : ''}

      <div id="sheetBackdrop" onclick="Engine.toggleSheet()" class="fixed inset-0 bg-black/70 z-50" style="display:none"></div>
      <div id="sheet" class="fixed left-0 right-0 bottom-0 z-50 card rounded-t-2xl p-5 max-h-[80vh] overflow-y-auto" style="display:none">
        <div class="w-9 h-1 bg-gray-600 rounded mx-auto mb-4"></div>
        <h3 class="text-xl font-semibold mb-3 font-serif">Режим разработчика</h3>
        <div id="sheetBody"></div>
      </div>

      <div id="glossaryBackdrop" onclick="Engine.toggleGlossary()" class="fixed inset-0 bg-black/70 z-50" style="display:none"></div>
      <div id="glossaryModal" class="fixed inset-0 z-50 overflow-y-auto p-4" style="display:none">
        <div class="card rounded-xl p-5 sm:p-8 max-w-2xl mx-auto my-6">
          <div class="flex justify-between items-center mb-5">
            <h2 class="text-2xl font-bold font-serif">Справочник</h2>
            <button onclick="Engine.toggleGlossary()" class="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">Закрыть</button>
          </div>
          <div id="glossaryList" class="space-y-3"></div>
          <div class="divider my-6"></div>
          <p class="text-gray-400 mb-3">Текущий профиль: <span id="accountName" class="text-white font-medium">—</span></p>
          <button onclick="Engine.resetGame()" class="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition w-full">Выйти из профиля</button>
        </div>
      </div>
    `;
  }

  function cardTemplate(ch){
    return `
      <div class="flex items-center mb-6">
        <i data-lucide="user" class="w-14 h-14 sm:w-16 sm:h-16 text-gray-300 mr-4 sm:mr-6 flex-shrink-0"></i>
        <div>
          <h1 class="text-2xl sm:text-4xl font-bold glow-text font-serif">${ch.name}</h1>
          <p class="text-lg sm:text-2xl text-gray-300">${ch.title}</p>
          <p class="text-base sm:text-xl text-gray-400 mt-1">${ch.faction}</p>
        </div>
      </div>
      <div class="divider my-6 sm:my-8"></div>

      <h2 class="text-xl sm:text-2xl font-semibold mb-3 flex items-center justify-end"><i data-lucide="users" class="mr-3"></i>Команда</h2>
      <p class="text-gray-300 leading-relaxed text-base sm:text-lg mb-4">${ch.teamInfo || '—'}</p>

      <h2 class="text-xl sm:text-2xl font-semibold mb-3 mt-4 flex items-center justify-end"><i data-lucide="user" class="mr-3"></i>Легенда</h2>
      <p class="text-gray-300 leading-relaxed text-base sm:text-lg">${ch.legend || '—'}</p>

      ${ch.trueNature ? `
      <h2 class="text-xl sm:text-2xl font-semibold mb-3 mt-6 flex items-center justify-end"><i data-lucide="eye-off" class="mr-3"></i>Правда о вас</h2>
      <p class="text-gray-300 leading-relaxed text-base sm:text-lg">${ch.trueNature}</p>` : ''}

      ${ch.fact ? `
      <h2 class="text-xl sm:text-2xl font-semibold mb-3 mt-6 flex items-center justify-end"><i data-lucide="sparkle" class="mr-3"></i>Вам известно</h2>
      <p class="text-gray-300 leading-relaxed text-base sm:text-lg italic">${ch.fact}</p>` : ''}

      <div class="divider my-6 sm:my-8"></div>
      <div id="featuresWrap">
        <h2 class="text-xl sm:text-2xl font-semibold mb-4 flex items-center justify-end text-amber-400"><i data-lucide="star" class="mr-3 text-amber-400"></i>Особенности</h2>
        <div id="featuresList" class="space-y-4"></div>
      </div>

      <div class="divider my-6 sm:my-8"></div>
      <div id="abilitiesWrap">
        <h2 class="text-xl sm:text-2xl font-semibold mb-4 flex items-center justify-end text-blue-400"><i data-lucide="zap" class="mr-3 text-blue-400"></i>Способности</h2>
        <div id="abilitiesList" class="space-y-4"></div>
      </div>

      <div class="divider my-6 sm:my-8"></div>
      <h2 class="text-xl sm:text-2xl font-semibold mb-4 flex items-center justify-end text-emerald-400"><i data-lucide="target" class="mr-3 text-emerald-400"></i>Задания</h2>
      <div id="questsList" class="space-y-4"></div>

      <div class="divider my-6 sm:my-8"></div>
      <h2 class="text-xl sm:text-2xl font-semibold mb-4 flex items-center justify-end"><i data-lucide="briefcase" class="mr-3"></i>При себе</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2" id="inventoryList"></div>

      <div class="divider my-6 sm:my-8"></div>
      <h2 class="text-xl sm:text-2xl font-semibold mb-4 flex items-center justify-end"><i data-lucide="key-round" class="mr-3"></i>Код</h2>
      <input type="text" id="secretInput" placeholder="Введите код..."
        class="w-full bg-black/20 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <button onclick="Engine.enterSecret()" class="mt-3 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition w-full sm:w-auto">Активировать</button>
      <div id="secretMsg"></div>
    `;
  }

  /* ----------------------------- инициализация ----------------------------- */

  function mount(game, options){
    GAME = game;
    DEBUG = !!(options && options.debug);
    PREFIX = 'game_' + GAME.id + '_';
    document.title = GAME.title;
    document.getElementById('app').innerHTML = shell();
    refreshIcons();

    document.getElementById('codeInput').addEventListener('keypress', e=>{ if(e.key==='Enter') enterCode(); });

    const savedCode = localStorage.getItem(key('selectedCharacter'));
    if (savedCode && GAME.characters[savedCode]) selectCharacter(savedCode, true);
  }

  function showMsg(elId, text, type){
    const el = document.getElementById(elId);
    if(!el) return;
    el.innerHTML = `<div class="message ${type}">${text}</div>`;
    setTimeout(()=>{ if(el) el.innerHTML=''; }, 7000);
  }

  function enterCode(){
    const raw = document.getElementById('codeInput').value.trim().toUpperCase();
    if (!GAME.characters[raw]){ showMsg('gateMsg','Неверный код персонажа!','error'); return; }
    selectCharacter(raw);
  }

  function selectCharacter(code, silent){
    current = GAME.characters[code];
    localStorage.setItem(key('selectedCharacter'), code);
    const quests = loadArr('unlockedQuests');
    current.quests.forEach(q=>{ if(!quests.includes(q.title)) quests.push(q.title); });
    saveArr('unlockedQuests', quests);

    document.getElementById('gate').style.display='none';
    document.getElementById('card').style.display='block';
    document.title = current.name + ' — ' + GAME.title;
    renderCard();
    if(!silent) showMsg('gateMsg','Персонаж выбран!','success');
  }

  function renderCard(){
    document.getElementById('card').innerHTML = cardTemplate(current);
    renderFeatures(); renderAbilities(); renderQuests(); renderInventory();
    document.getElementById('secretInput').addEventListener('keypress', e=>{ if(e.key==='Enter') enterSecret(); });
    refreshIcons();
  }

  function renderFeatures(){
    const wrap = document.getElementById('featuresWrap');
    const list = document.getElementById('featuresList');
    const base = (current.features || []).map(f => ({...f, isNew:false}));
    const unlockedNames = loadArr('unlockedFeatures');
    const extra = unlockedNames
      .map(name => Object.values(current.codeSystem||{}).find(c=>c.type==='features' && c.name===name))
      .filter(Boolean).filter(f => !base.some(b=>b.name===f.name))
      .map(f => ({...f, isNew:true}));
    const all = base.concat(extra);
    wrap.style.display = all.length ? 'block' : 'none';
    list.innerHTML = all.map(f=>`
      <div class="p-4 rounded-lg border ${f.isNew?'border-amber-strong tint-amber-strong':'border-amber-dim tint-amber-dim'}" data-feature="${esc(f.name)}">
        <div class="flex items-center mb-2 justify-between">
          <div class="flex items-center">
            <div class="feature-icon bg-amber-500/15"><i data-lucide="${f.icon||'star'}" class="text-amber-400"></i></div>
            <span class="text-white font-medium text-lg">${f.name}</span>
            ${f.isNew?`<span class="badge badge-amber">Новое</span>`:''}
          </div>
          ${f.remark?`<span class="text-gray-500 text-sm">${f.remark}</span>`:''}
        </div>
        <p class="text-gray-300">${f.description}</p>
        ${f.details?`<div class="divider my-2"></div><p class="text-gray-500 italic">${f.details}</p>`:''}
      </div>`).join('');
  }

  function renderAbilities(){
    const wrap = document.getElementById('abilitiesWrap');
    const list = document.getElementById('abilitiesList');
    const base = (current.abilities || []).map(a => ({...a, isNew:false}));
    const unlockedNames = loadArr('unlockedAbilities');
    const extra = unlockedNames
      .map(name => Object.values(current.codeSystem||{}).find(c=>c.type==='ability' && c.name===name))
      .filter(Boolean).filter(a => !base.some(b=>b.name===a.name))
      .map(a => ({...a, isNew:true}));
    const all = base.concat(extra);
    wrap.style.display = all.length ? 'block' : 'none';
    list.innerHTML = all.map(a=>`
      <div class="p-4 rounded-lg border ${a.isNew?'border-blue-strong tint-blue-strong':'border-blue-dim tint-blue-dim'}" data-ability="${esc(a.name)}">
        <div class="flex items-center mb-2 justify-between">
          <div class="flex items-center">
            <div class="feature-icon bg-blue-500/15"><i data-lucide="${a.icon||'zap'}" class="text-blue-400"></i></div>
            <span class="text-white font-medium text-lg">${a.name}</span>
            ${a.isNew?`<span class="badge badge-blue">Новое</span>`:''}
          </div>
          ${a.remark?`<span class="text-gray-500 text-sm">${a.remark}</span>`:''}
        </div>
        <p class="text-gray-300">${a.description}</p>
        ${a.details?`<div class="divider my-2"></div><p class="text-gray-500 italic">${a.details}</p>`:''}
      </div>`).join('');
  }

  function questState(unlockedQuests, title){
    if (unlockedQuests.includes(title+' (Завершено)')) return 'done';
    if (unlockedQuests.includes(title+' (Провалено)')) return 'failed';
    if (unlockedQuests.includes(title+' (Новое)')) return 'new';
    return 'active';
  }

  function collectQuestItems(){
    const unlocked = loadArr('unlockedQuests');
    const items = current.quests.map(q=>({title:q.title, description:q.description, details:q.details, rewards:q.rewards, rewardsDescription:q.rewardsDescription}));
    Object.values(current.codeSystem||{}).forEach(c=>{
      if (c.type==='quest' && unlocked.includes(c.name)){
        items.push({title:c.name, description:c.content?.description, details:c.content?.details, rewards:c.rewards, rewardsDescription:c.rewardsDescription});
      }
    });
    return items;
  }

  function renderQuests(){
    const list = document.getElementById('questsList');
    const unlocked = loadArr('unlockedQuests');
    const items = collectQuestItems();
    list.innerHTML = items.map(q=>{
      const st = questState(unlocked, q.title);
      // 'new' и 'active' — один и тот же тематический (зелёный) блок:
      // статус влияет только на подпись, а не на цвет категории.
      const styleMap = {
        new:    { cls:'border-emerald-strong tint-emerald-strong', badge:'<span class="badge badge-emerald">Новое</span>' },
        active: { cls:'border-emerald-dim tint-emerald-dim',       badge:'' },
        done:   { cls:'border-ultra-dim tint-ultra-dim',           badge:'<span class="badge badge-emerald">Завершено</span>' },
        failed: { cls:'border-ultra-dim tint-ultra-dim',           badge:'<span class="badge badge-red">Провалено</span>' },
      }[st];
      const reward = st==='done' && (q.rewards?.COMPLETED || q.rewardsDescription?.COMPLETED)
        ? `<div class="mt-3 p-2 bg-gray-700/30 rounded-lg text-sm text-yellow-400">${q.rewardsDescription?.COMPLETED ? q.rewardsDescription.COMPLETED+'<br>' : ''}${q.rewards?.COMPLETED||''}</div>` : '';
      // Бейдж всегда рисуется поверх, полностью непрозрачным — блок
      // тускнеет (done-fade) только внутри, сам бейдж в затемнение не попадает.
      return `<div class="relative" data-quest="${esc(q.title)}">
        <div class="p-5 rounded-lg border ${styleMap.cls} ${st==='done'?'done-fade':''}">
          <div class="mb-2">
            <h3 class="font-medium text-lg sm:text-xl ${st==='failed'?'text-red-400':'text-white'}">${q.title}</h3>
          </div>
          <p class="italic text-gray-400 mb-3">${q.description||''}</p>
          ${q.details?`<div class="divider my-2"></div><p class="text-gray-300">${q.details}</p>`:''}
          ${reward}
        </div>
        ${styleMap.badge?`<span class="absolute top-4 right-5">${styleMap.badge}</span>`:''}
      </div>`;
    }).join('');
  }

  function renderInventory(){
    const list = document.getElementById('inventoryList');
    list.innerHTML = (current.inventory||[]).map(it=>`
      <div class="p-4 rounded-lg bg-black/20 border border-gray-700">
        <div class="flex items-center mb-2">
          <i data-lucide="${it.icon}" class="mr-3 text-gray-300 flex-shrink-0"></i>
          <span class="text-gray-300 font-medium">${it.name}</span>
        </div>
        <p class="text-gray-400 text-sm">${it.description||''}</p>
      </div>`).join('');
  }

  /* ----------------------------- секретные коды ----------------------------- */

  function completeQuest(title, affected){
    const arr = loadArr('unlockedQuests');
    ['(Новое)','(Провалено)'].forEach(suf=>{ const i=arr.indexOf(title+' '+suf); if(i!==-1) arr.splice(i,1); });
    if(!arr.includes(title+' (Завершено)')) arr.push(title+' (Завершено)');
    saveArr('unlockedQuests', arr);
    affected.push({type:'quest', name:title});
  }
  function failQuest(title, affected){
    const arr = loadArr('unlockedQuests');
    ['(Новое)','(Завершено)'].forEach(suf=>{ const i=arr.indexOf(title+' '+suf); if(i!==-1) arr.splice(i,1); });
    if(!arr.includes(title+' (Провалено)')) arr.push(title+' (Провалено)');
    saveArr('unlockedQuests', arr);
    affected.push({type:'quest', name:title});
  }
  function unlockAbility(name, affected){ const a=loadArr('unlockedAbilities'); if(!a.includes(name)){a.push(name); saveArr('unlockedAbilities',a);} affected.push({type:'ability', name}); }
  function unlockFeature(name, affected){ const a=loadArr('unlockedFeatures'); if(!a.includes(name)){a.push(name); saveArr('unlockedFeatures',a);} affected.push({type:'feature', name}); }
  function unlockQuest(name, affected){ const a=loadArr('unlockedQuests'); if(!a.includes(name)){a.push(name); a.push(name+' (Новое)'); saveArr('unlockedQuests',a);} affected.push({type:'quest', name}); }

  function applyCode(codeData, messages, affected){
    const types = Array.isArray(codeData.type) ? codeData.type : [codeData.type];
    types.forEach(t=>{
      if (t==='ability'){ unlockAbility(codeData.name, affected); messages.push(`Способность «${codeData.name}» разблокирована.`); }
      else if (t==='features'){ unlockFeature(codeData.name, affected); messages.push(`Особенность «${codeData.name}» разблокирована.`); }
      else if (t==='quest'){ unlockQuest(codeData.name, affected); messages.push(`Задание «${codeData.name}» разблокировано.`); }
    });
  }

  // общая логика применения кода — используется ручным вводом и dev-панелью.
  // возвращает список "affected" целей, чтобы платформа могла проскроллить
  // к ним и проиграть анимацию появления.
  function processCode(raw){
    const codeSystem = current.codeSystem || {};
    const messages = [];
    const affected = [];
    let matched = false;

    current.quests.forEach(q=>{
      if (q.successfulCodes?.includes(raw)){ completeQuest(q.title, affected); messages.push(`Задание «${q.title}» завершено.`); matched=true; }
      if (q.failedCodes?.includes(raw)){ failQuest(q.title, affected); messages.push(`Задание «${q.title}» провалено.`); matched=true; }
    });
    Object.values(codeSystem).forEach(c=>{
      if (c.type==='quest'){
        if (c.successfulCodes?.includes(raw)){ completeQuest(c.name, affected); messages.push(`Задание «${c.name}» завершено.`); matched=true; }
        if (c.failedCodes?.includes(raw)){ failQuest(c.name, affected); messages.push(`Задание «${c.name}» провалено.`); matched=true; }
      }
    });

    const codeData = codeSystem[raw];
    if (codeData){
      matched = true;
      if (codeData.targets && Array.isArray(codeData.targets)){
        codeData.targets.forEach(t=>{ if(codeSystem[t]) applyCode(codeSystem[t], messages, affected); });
      } else if (codeData.type){
        applyCode(codeData, messages, affected);
      } else if (codeData.reveal){
        messages.push(codeData.reveal);
      }
    }

    renderFeatures(); renderAbilities(); renderQuests(); refreshIcons();
    highlightAffected(affected);
    return { matched, messages };
  }

  // платформенная фича: скроллим по очереди к каждому новому блоку и
  // проигрываем анимацию появления — один блок за раз, а не все разом.
  function highlightAffected(affected){
    if (!affected.length) return;
    requestAnimationFrame(()=>{
      const els = [];
      affected.forEach(a=>{
        const attr = 'data-' + a.type;
        const nodes = document.querySelectorAll(`[${attr}]`);
        let el = null;
        nodes.forEach(n=>{ if (n.getAttribute(attr) === a.name) el = n; });
        if (el && !els.includes(el)) els.push(el);
      });
      playSequential(els, 0);
    });
  }

  const POP_COLORS = {
    feature: 'rgba(217,119,6,.55)',   // amber
    ability: 'rgba(37,99,235,.55)',   // blue
    quest:   'rgba(16,185,129,.55)',  // emerald
  };

  function playSequential(els, i){
    if (i >= els.length) return;
    const el = els[i];
    const category = el.hasAttribute('data-feature') ? 'feature' : el.hasAttribute('data-ability') ? 'ability' : 'quest';
    el.style.setProperty('--pop-bg', POP_COLORS[category]);
    el.scrollIntoView({behavior:'smooth', block:'center'});
    el.classList.remove('engine-pop');
    void el.offsetWidth; // рестарт анимации, если этот же блок уже подсвечивался
    el.classList.add('engine-pop');
    setTimeout(()=>{
      el.classList.remove('engine-pop');
      el.style.removeProperty('--pop-bg');
      playSequential(els, i+1);
    }, 1300);
  }

  function enterSecret(){
    const input = document.getElementById('secretInput');
    const raw = input.value.trim().toUpperCase();
    const { matched, messages } = processCode(raw);
    if (messages.length) showMsg('secretMsg', messages.join('<br>'), 'success');
    else if (!matched) showMsg('secretMsg', 'Неверный код! Система зафиксировала попытку несанкционированного доступа.', 'error');
    input.value = '';
  }

  /* ----------------------------- dev-режим ----------------------------- */

  function toggleSheet(){
    if (!DEBUG) return;
    const sheet = document.getElementById('sheet');
    const bg = document.getElementById('sheetBackdrop');
    const open = sheet.style.display === 'none';
    if (open) renderDevSheet();
    sheet.style.display = open ? 'block' : 'none';
    bg.style.display = open ? 'block' : 'none';
  }

  function devItem(label, mono, onclick, activeClass){
    return `<div onclick="${onclick}" class="p-3 mb-2 rounded-lg cursor-pointer flex items-center justify-between bg-black/20 border ${activeClass||'border-gray-700'} hover:bg-gray-800">
      <span>${label}</span><span class="text-gray-500 text-xs">${mono}</span>
    </div>`;
  }

  function renderDevSheet(){
    const body = document.getElementById('sheetBody');
    let html = '';
    if (!current){
      html += `<div class="text-purple-400 text-xs uppercase tracking-wide mb-2">Коды персонажей</div>`;
      html += Object.keys(GAME.characters).map(code=>devItem(GAME.characters[code].name, code, `Engine.devPickCharacter('${code}')`)).join('');
    } else {
      // порядок специально такой: сначала коды этого персонажа, потом коды
      // заданий, и только в конце — переключение на другого персонажа.
      html += `<div class="text-purple-400 text-xs uppercase tracking-wide mb-2">Коды этого персонажа</div>`;
      const entries = Object.entries(current.codeSystem||{});
      html += entries.length ? entries.map(([codeKey,data])=>devItem(data.name||codeKey, codeKey, `Engine.devApplyCode('${codeKey}')`)).join('')
        : `<p class="text-gray-500 text-sm">Кодов не задано.</p>`;

      const questCodes = [];
      current.quests.forEach(q=>{
        (q.successfulCodes||[]).forEach(c=>questCodes.push({code:c,label:q.title+' — успех'}));
        (q.failedCodes||[]).forEach(c=>questCodes.push({code:c,label:q.title+' — провал'}));
      });
      if (questCodes.length){
        html += `<div class="text-purple-400 text-xs uppercase tracking-wide mb-2 mt-4">Коды заданий</div>`;
        html += questCodes.map(q=>devItem(q.label, q.code, `Engine.devApplyCode('${q.code}')`)).join('');
      }

      html += `<div class="text-purple-400 text-xs uppercase tracking-wide mb-2 mt-4">Сменить персонажа</div>`;
      html += Object.keys(GAME.characters).map(code=>{
        const active = current === GAME.characters[code];
        return devItem(GAME.characters[code].name, code, `Engine.devPickCharacter('${code}')`, active?'border-blue-500 text-blue-300':null);
      }).join('');
    }
    html += `<div class="divider my-4"></div>
      <button onclick="Engine.devClearStorage()" class="px-4 py-3 bg-red-700 hover:bg-red-600 rounded-lg text-white transition w-full">Очистить локальное хранилище</button>`;
    body.innerHTML = html;
  }

  function devClearStorage(){
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k));
    location.reload();
  }

  function devPickCharacter(code){ selectCharacter(code); toggleSheet(); }
  function devApplyCode(codeKey){
    toggleSheet();
    setTimeout(()=>{
      const { messages } = processCode(codeKey);
      if (messages.length) showMsg('secretMsg', messages.join('<br>'), 'success');
    }, 150);
  }

  /* ----------------------------- справочник ----------------------------- */

  function toggleGlossary(){
    const modal = document.getElementById('glossaryModal');
    const bg = document.getElementById('glossaryBackdrop');
    const open = modal.style.display === 'none' || !modal.style.display;
    if (open){
      const list = document.getElementById('glossaryList');
      const items = GAME.glossary || [];
      list.innerHTML = items.length ? items.map(g=>`
        <div class="p-4 rounded-lg bg-black/20 border border-gray-700">
          <div class="flex items-center mb-2"><i data-lucide="${g.icon||'info'}" class="mr-3 text-gray-300"></i><span class="font-medium">${g.title}</span></div>
          <p class="text-gray-300 text-sm">${g.description}</p>
          ${g.mechanic?`<div class="mt-2 p-2 bg-blue-900/20 rounded text-sm text-blue-300">${g.mechanic}</div>`:''}
        </div>`).join('') : `<p class="text-gray-500 text-sm">Для этой игры справочник механик не задан.</p>`;
      document.getElementById('accountName').textContent = current ? current.name : 'не выбран';
      refreshIcons();
    }
    modal.style.display = open ? 'block' : 'none';
    bg.style.display = open ? 'block' : 'none';
  }

  function resetGame(){
    ['selectedCharacter','unlockedAbilities','unlockedFeatures','unlockedQuests'].forEach(k=>localStorage.removeItem(key(k)));
    location.reload();
  }

  return { mount, enterCode, enterSecret, toggleSheet, toggleGlossary, resetGame, devPickCharacter, devApplyCode, devClearStorage };
})();
