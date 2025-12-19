const fs = require('fs');
const path = require('path');

console.log('🚀 Начинаю создавать навигацию...');

// Папка с приложениями
const APPS_FOLDER = 'App'; // Если у тебя 'app' - поменяй здесь

// Проверяем есть ли папка
if (!fs.existsSync(APPS_FOLDER)) {
    console.error('❌ Папка App не найдена!');
    process.exit(1);
}

// Получаем все html файлы
const appFiles = fs.readdirSync(APPS_FOLDER)
    .filter(file => file.endsWith('.html'))
    .sort(); // Сортируем по алфавиту

console.log(`📁 Нашёл ${appFiles.length} приложений:`);

// Создаем карточки для каждого приложения
let appCardsHTML = '';
appFiles.forEach((file, index) => {
    const appPath = `${APPS_FOLDER}/${file}`;
    const appName = file.replace('.html', '')
        .replace(/-/g, ' ')
        .replace(/_/g, ' ');
    
    // Делаем первую букву заглавной
    const displayName = appName.charAt(0).toUpperCase() + appName.slice(1);
    
    console.log(`   ${index + 1}. ${displayName} (${file})`);
    
    // Создаем HTML для карточки
    appCardsHTML += `
    <div class="app-card" onclick="window.location.href='${appPath}'">
        <div class="app-number">${index + 1}</div>
        <div class="app-icon">📱</div>
        <h3 class="app-title">${displayName}</h3>
        <p class="app-filename">${file}</p>
        <button class="app-button">Открыть →</button>
    </div>`;
});

// Создаем полную HTML страницу
const html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📱 Мои приложения</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Arial, sans-serif;
        }
        
        body {
            background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            text-align: center;
            color: white;
            margin-bottom: 40px;
            padding: 30px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            backdrop-filter: blur(10px);
        }
        
        h1 {
            font-size: 2.8rem;
            margin-bottom: 10px;
        }
        
        .subtitle {
            font-size: 1.2rem;
            opacity: 0.9;
        }
        
        .stats {
            display: inline-flex;
            gap: 30px;
            margin-top: 20px;
            padding: 15px 30px;
            background: rgba(255, 255, 255, 0.15);
            border-radius: 50px;
        }
        
        .stat {
            text-align: center;
        }
        
        .stat-value {
            font-size: 2rem;
            font-weight: bold;
        }
        
        .apps-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 25px;
            margin-top: 30px;
        }
        
        .app-card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
            transition: all 0.3s ease;
            cursor: pointer;
            position: relative;
        }
        
        .app-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }
        
        .app-number {
            position: absolute;
            top: 15px;
            left: 15px;
            background: #6a11cb;
            color: white;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        }
        
        .app-icon {
            font-size: 3rem;
            margin: 20px 0;
        }
        
        .app-title {
            color: #333;
            margin-bottom: 10px;
            font-size: 1.5rem;
        }
        
        .app-filename {
            color: #666;
            font-family: monospace;
            background: #f5f5f5;
            padding: 5px 10px;
            border-radius: 5px;
            margin-bottom: 20px;
            font-size: 0.9rem;
        }
        
        .app-button {
            background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 50px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.3s ease;
            width: 100%;
        }
        
        .app-button:hover {
            transform: scale(1.05);
        }
        
        footer {
            text-align: center;
            color: white;
            margin-top: 50px;
            padding: 20px;
            opacity: 0.8;
        }
        
        @media (max-width: 768px) {
            .apps-grid {
                grid-template-columns: 1fr;
            }
            
            h1 {
                font-size: 2rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1><i class="fas fa-th-large"></i> Мои приложения</h1>
            <p class="subtitle">Все мои веб-приложения в одном месте</p>
            <div class="stats">
                <div class="stat">
                    <div class="stat-value">${appFiles.length}</div>
                    <div>приложений</div>
                </div>
                <div class="stat">
                    <div class="stat-value"><i class="fas fa-sync-alt"></i></div>
                    <div>авто-обновление</div>
                </div>
            </div>
        </header>
        
        <div class="apps-grid">
            ${appCardsHTML}
        </div>
        
        <footer>
            <p>🚀 Навигация создана автоматически • ${new Date().toLocaleDateString('ru-RU')}</p>
        </footer>
    </div>
    
    <script>
        // Простой поиск (можно добавить позже)
        console.log('Добро пожаловать! Доступно ${appFiles.length} приложений');
        
        // Добавляем анимацию появления
        document.addEventListener('DOMContentLoaded', function() {
            const cards = document.querySelectorAll('.app-card');
            cards.forEach((card, index) => {
                card.style.animationDelay = (index * 0.1) + 's';
                card.style.animation = 'fadeIn 0.5s ease forwards';
            });
        });
        
        // Добавляем стили для анимации
        const style = document.createElement('style');
        style.textContent = \`
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .app-card { opacity: 0; }
        \`;
        document.head.appendChild(style);
    </script>
</body>
</html>`;

// Сохраняем файл
fs.writeFileSync('index.html', html, 'utf-8');

console.log('✅ Готово! Файл index.html создан.');
console.log('📊 Всего приложений: ' + appFiles.length);
