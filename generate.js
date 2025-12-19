// generate.js - положи в корень репозитория
const fs = require('fs');
const path = require('path');

console.log('Создаю навигацию...');

// Ищем HTML файлы
const files = fs.readdirSync('App')
  .filter(f => f.endsWith('.html'))
  .sort();

// Простой HTML
const html = `<!DOCTYPE html>
<html>
<head>
    <title>Мои приложения</title>
    <style>
        body { font-family: Arial; padding: 20px; }
        .apps { display: grid; gap: 20px; margin-top: 20px; }
        .app { background: #f0f0f0; padding: 20px; border-radius: 10px; }
        .app a { display: inline-block; margin-top: 10px; color: blue; }
    </style>
</head>
<body>
    <h1>Мои приложения (${files.length})</h1>
    <div class="apps">
        ${files.map(f => `
            <div class="app">
                <h3>${f.replace('.html', '')}</h3>
                <a href="App/${f}">Открыть приложение →</a>
            </div>
        `).join('')}
    </div>
</body>
</html>`;

fs.writeFileSync('index.html', html);
console.log('Готово! Создано ' + files.length + ' ссылок');