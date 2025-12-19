// Конфигурация
const CONFIG = {
	STORAGE_KEY: 'apps_navigation_history',
	MAX_HISTORY: 20,
	VERSIONS_FILE: 'versions.json'
};

// Глобальные переменные
let appsData = [];
let historyData = [];
let currentFilter = 'all';
let currentSort = 'name';
let searchQuery = '';

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
	await loadHistory();
	await loadApps();
	updateUI();
	setupEventListeners();
});

// Загрузка истории из localStorage
async function loadHistory() {
	try {
		 const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
		 historyData = saved ? JSON.parse(saved) : [];
		 updateHistoryList();
	} catch (error) {
		 console.error('Ошибка загрузки истории:', error);
		 historyData = [];
	}
}

// Сохранение истории в localStorage
function saveHistory() {
	try {
		 localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(historyData));
	} catch (error) {
		 console.error('Ошибка сохранения истории:', error);
	}
}

// Добавление приложения в историю
function addToHistory(app) {
	// Удаляем существующую запись (если есть)
	historyData = historyData.filter(item => item.id !== app.id);
	
	// Добавляем новую запись в начало
	historyData.unshift({
		 id: app.id,
		 title: app.title,
		 version: app.version,
		 timestamp: Date.now(),
		 date: new Date().toLocaleDateString('ru-RU')
	});
	
	// Ограничиваем количество записей
	if (historyData.length > CONFIG.MAX_HISTORY) {
		 historyData = historyData.slice(0, CONFIG.MAX_HISTORY);
	}
	
	saveHistory();
	updateHistoryList();
	displayApps(); // Обновляем отображение
}

// Обновление списка истории в UI
function updateHistoryList() {
	const historyList = document.getElementById('history-list');
	if (!historyList) return;
	
	if (historyData.length === 0) {
		 historyList.innerHTML = `
			  <div class="history-empty">
					<i class="fas fa-clock"></i>
					<p>История пуста</p>
			  </div>
		 `;
		 return;
	}
	
	historyList.innerHTML = historyData.slice(0, 10).map(item => `
		 <div class="history-item" onclick="openAppById('${item.id}')" title="Открыть ${item.title}">
			  <i class="fas fa-clock"></i>
			  <div class="history-item-content">
					<div class="history-item-title">${item.title}</div>
					<div class="history-item-time">${formatTimeAgo(item.timestamp)} • v${item.version}</div>
			  </div>
		 </div>
	`).join('');
}

// Загрузка данных приложений
async function loadApps() {
	try {
		 // Показываем состояние загрузки
		 document.getElementById('apps-grid').innerHTML = `
			  <div class="loading-state">
					<div class="spinner">
						 <i class="fas fa-spinner fa-spin"></i>
					</div>
					<p>Загрузка приложений...</p>
			  </div>
		 `;
		 
		 // Загружаем versions.json
		 const response = await fetch(`${CONFIG.VERSIONS_FILE}?t=${Date.now()}`);
		 if (!response.ok) {
			  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		 }
		 
		 const data = await response.json();
		 appsData = data.applications || [];
		 
		 // Обновляем статистику
		 document.getElementById('total-apps').textContent = appsData.length;
		 document.getElementById('stats-total').textContent = appsData.length;
		 document.getElementById('stats-history').textContent = historyData.length;
		 
		 if (data.last_updated) {
			  document.getElementById('last-updated').textContent = 
					formatDate(data.last_updated);
		 }
		 
	} catch (error) {
		 console.error('Ошибка загрузки приложений:', error);
		 document.getElementById('apps-grid').innerHTML = `
			  <div class="no-results">
					<i class="fas fa-exclamation-triangle"></i>
					<h3>Ошибка загрузки</h3>
					<p>Не удалось загрузить список приложений</p>
					<p style="font-size: 0.9rem; margin-top: 10px;">${error.message}</p>
			  </div>
		 `;
		 appsData = [];
	}
}

// Отображение приложений с учетом фильтров и сортировки
function displayApps() {
	const appsGrid = document.getElementById('apps-grid');
	if (!appsGrid) return;
	
	let filteredApps = [...appsData];
	
	// Применяем поиск
	if (searchQuery) {
		 const query = searchQuery.toLowerCase();
		 filteredApps = filteredApps.filter(app =>
			  app.title.toLowerCase().includes(query) ||
			  app.description.toLowerCase().includes(query) ||
			  app.version.toLowerCase().includes(query) ||
			  app.id.toLowerCase().includes(query)
		 );
	}
	
	// Применяем фильтр
	switch (currentFilter) {
		 case 'recent':
			  const recentIds = historyData.map(item => item.id);
			  filteredApps = filteredApps.filter(app => recentIds.includes(app.id));
			  break;
		 case 'alpha':
			  filteredApps = filteredApps.filter(app => 
					app.version.toLowerCase().includes('alpha') || 
					app.version.toLowerCase().includes('beta')
			  );
			  break;
		 // 'all' - без фильтрации
	}
	
	// Применяем сортировку
	switch (currentSort) {
		 case 'name':
			  filteredApps.sort((a, b) => a.title.localeCompare(b.title));
			  break;
		 case 'recent':
			  filteredApps.sort((a, b) => {
					const dateA = new Date(a.last_modified || 0);
					const dateB = new Date(b.last_modified || 0);
					return dateB - dateA;
			  });
			  break;
		 case 'history':
			  filteredApps.sort((a, b) => {
					const indexA = historyData.findIndex(item => item.id === a.id);
					const indexB = historyData.findIndex(item => item.id === b.id);
					
					// Элементы в истории показываем первыми
					if (indexA !== -1 && indexB !== -1) return indexA - indexB;
					if (indexA !== -1) return -1;
					if (indexB !== -1) return 1;
					
					// Остальные - по алфавиту
					return a.title.localeCompare(b.title);
			  });
			  break;
	}
	
	// Если нет результатов
	if (filteredApps.length === 0) {
		 appsGrid.innerHTML = `
			  <div class="no-results">
					<i class="fas fa-search"></i>
					<h3>Ничего не найдено</h3>
					<p>Попробуйте изменить поисковый запрос или фильтр</p>
			  </div>
		 `;
		 return;
	}
	
	// Генерируем карточки приложений
	appsGrid.innerHTML = filteredApps.map(app => {
		 const isRecent = historyData.some(item => item.id === app.id);
		 const isAlpha = app.version.toLowerCase().includes('alpha') || 
							 app.version.toLowerCase().includes('beta');
		 
		 let badgeClass = '';
		 if (isRecent) badgeClass = 'recent';
		 if (isAlpha) badgeClass = 'alpha';
		 
		 return `
			  <div class="app-card ${badgeClass}" onclick="openApp('${app.id}')">
					<div class="app-icon">
						 ${getAppIcon(app.title)}
					</div>
					
					<div class="app-content">
						 <div class="app-title">
							  <span>${app.title}</span>
							  <span class="app-version">v${app.version}</span>
						 </div>
						 
						 ${app.description ? `
							  <p class="app-description">${app.description}</p>
						 ` : ''}
						 
						 <div class="app-meta">
							  <span class="app-date">
									<i class="far fa-calendar"></i>
									${formatDate(app.last_modified)}
							  </span>
							  
							  ${isRecent ? `
									<span class="app-badge">
										 <i class="fas fa-history"></i> В истории
									</span>
							  ` : ''}
						 </div>
					</div>
			  </div>
		 `;
	}).join('');
}

// Получение иконки для приложения (первая буква названия)
function getAppIcon(title) {
	return title.charAt(0).toUpperCase();
}

// Открытие приложения
function openApp(appId) {
	const app = appsData.find(a => a.id === appId);
	if (!app) return;
	
	// Добавляем в историю
	addToHistory(app);
	
	// Открываем в новой вкладке
	window.open(app.url, '_blank');
}

// Открытие приложения по ID (для истории)
function openAppById(appId) {
	openApp(appId);
}

// Поиск приложений
function searchApps() {
	searchQuery = document.getElementById('search').value.trim();
	displayApps();
}

// Очистка поиска
function clearSearch() {
	document.getElementById('search').value = '';
	searchQuery = '';
	displayApps();
}

// Фильтрация приложений
function filterApps(filter) {
	currentFilter = filter;
	
	// Обновляем активные кнопки фильтров
	document.querySelectorAll('.filter-btn').forEach(btn => {
		 btn.classList.remove('active');
		 if (btn.onclick?.toString().includes(`'${filter}'`)) {
			  btn.classList.add('active');
		 }
	});
	
	displayApps();
}

// Сортировка приложений
function sortApps() {
	currentSort = document.getElementById('sort').value;
	displayApps();
}

// Обновление UI
function updateUI() {
	displayApps();
	
	// Обновляем статистику
	document.getElementById('total-apps').textContent = appsData.length;
	document.getElementById('stats-total').textContent = appsData.length;
	document.getElementById('stats-history').textContent = historyData.length;
}

// Настройка обработчиков событий
function setupEventListeners() {
	// Обработка клавиши Enter в поиске
	document.getElementById('search')?.addEventListener('keypress', (e) => {
		 if (e.key === 'Enter') {
			  searchApps();
		 }
	});
	
	// Обновление при клике на кнопку обновления
	document.querySelector('.refresh-btn')?.addEventListener('click', () => {
		 loadApps();
	});
}

// Форматирование даты
function formatDate(dateString) {
	if (!dateString) return 'Неизвестно';
	try {
		 const date = new Date(dateString);
		 return date.toLocaleDateString('ru-RU', {
			  day: '2-digit',
			  month: '2-digit',
			  year: 'numeric'
		 });
	} catch (error) {
		 return 'Неизвестно';
	}
}

// Форматирование времени (сколько времени прошло)
function formatTimeAgo(timestamp) {
	const now = Date.now();
	const diff = now - timestamp;
	
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);
	const days = Math.floor(diff / 86400000);
	
	if (minutes < 1) return 'только что';
	if (minutes < 60) return `${minutes} мин назад`;
	if (hours < 24) return `${hours} ч назад`;
	if (days === 1) return 'вчера';
	if (days < 7) return `${days} дн назад`;
	
	return formatDate(new Date(timestamp));
}

// Экспортируем функции для глобального использования
window.openApp = openApp;
window.openAppById = openAppById;
window.searchApps = searchApps;
window.clearSearch = clearSearch;
window.filterApps = filterApps;
window.sortApps = sortApps;
window.loadApps = loadApps;
