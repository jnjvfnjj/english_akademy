const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const DEV_PORT = 3000;
const CLOUD_RUN_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const PUBLIC_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// Automatic background build if index.html or JS bundle is missing
let isBuilding = false;
let buildError = null;
let buildLog = [];

function hasValidBuild() {
  const indexHtmlPath = path.join(PUBLIC_DIR, 'index.html');
  const jsDir = path.join(PUBLIC_DIR, '_expo', 'static', 'js', 'web');
  if (!fs.existsSync(indexHtmlPath) || !fs.existsSync(jsDir)) {
    return false;
  }
  try {
    const files = fs.readdirSync(jsDir);
    return files.some(f => f.startsWith('index-') && f.endsWith('.js'));
  } catch (e) {
    return false;
  }
}

function checkAndAutoBuild() {
  if (!hasValidBuild()) {
    console.log('[Static Server] Complete web bundle not found in dist/. Triggering auto-compilation of React Native Web...');
    isBuilding = true;
    buildLog.push('Starting automatic frontend build process using Expo...');
    
    const buildProc = exec('npm run build', (error, stdout, stderr) => {
      isBuilding = false;
      if (error) {
        console.error('[Static Server] Auto-build failed:', error);
        buildError = error.message || String(error);
        buildLog.push(`Compilation error: ${buildError}`);
      } else {
        console.log('[Static Server] Auto-compilation finished successfully! Application is now live!');
        buildLog.push('Build compiled successfully! The application is fully active.');
      }
    });

    if (buildProc.stdout) {
      buildProc.stdout.on('data', (data) => {
        buildLog.push(data.toString().trim());
        if (buildLog.length > 50) buildLog.shift(); // keep last 50 lines
      });
    }
    if (buildProc.stderr) {
      buildProc.stderr.on('data', (data) => {
        buildLog.push(`[stderr] ${data.toString().trim()}`);
        if (buildLog.length > 50) buildLog.shift();
      });
    }
  }
}

// Perform instant check
checkAndAutoBuild();

const handleRequest = (req, res) => {
  console.log(`[Static Server] ${req.method} ${req.url}`);

  // Handle live build-status API endpoint for the diagnostics client-side polling
  if (req.url === '/api/build-status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      isBuilding,
      hasBuild: hasValidBuild(),
      buildError,
      logs: buildLog
    }));
    return;
  }

  // Handle direct health check probes for Cloud Run, Kubernetes, and local dev
  const normalizedUrl = req.url.split('?')[0];
  if (
    normalizedUrl === '/health' ||
    normalizedUrl === '/api/health' ||
    normalizedUrl === '/_health' ||
    normalizedUrl === '/healthz' ||
    normalizedUrl === '/livez' ||
    normalizedUrl === '/readyz'
  ) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', uptime: process.uptime() }));
    return;
  }

  // Normalize URL and resolve path
  let safeUrl = req.url.split('?')[0];
  if (safeUrl === '/') {
    safeUrl = '/index.html';
  }

  let filePath = path.join(PUBLIC_DIR, safeUrl);

  // Prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  const isStaticAsset = safeUrl.startsWith('/_expo/') ||
                        safeUrl.startsWith('/assets/') ||
                        /\.(js|css|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|map)$/i.test(safeUrl);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      if (isStaticAsset) {
        // Return 404 for missing static assets to prevent syntax errors like "<" in scripts
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Asset Not Found');
        return;
      }

      // Fallback to index.html for React Navigation / SPA routing supporting direct URLs
      filePath = path.join(PUBLIC_DIR, 'index.html');
      fs.stat(filePath, (err2, stats2) => {
        if (err2 || !stats2.isFile()) {
          // Serve helpful diagnostic state-machine layout
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(getDiagnosticHtml());
          return;
        }
        serveFile(filePath, res);
      });
    } else {
      serveFile(filePath, res);
    }
  });
};


function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });

  const stream = fs.createReadStream(filePath);
  stream.on('error', (err) => {
    console.error(err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });
  stream.pipe(res);
}

function getDiagnosticHtml() {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>English School CRM — Консоль Инициализации</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;450;600;800&family=JetBrains+Mono:wght@400;700&display=swap');
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .mono {
      font-family: 'JetBrains Mono', monospace;
    }
  </style>
</head>
<body class="bg-slate-50 text-slate-850 min-h-screen flex items-center justify-center p-6 selection:bg-indigo-100">

  <div class="max-w-3xl w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
    <!-- Header banner -->
    <div class="bg-slate-900 p-8 border-b border-slate-800 text-white flex items-center justify-between flex-wrap gap-4">
      <div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-amber-500 animate-pulse"></span>
          <span class="text-xs tracking-widest font-bold uppercase text-amber-400 font-mono">STATUS: ИНИЦИАЛИЗАЦИЯ</span>
        </div>
        <h1 class="text-2xl font-extrabold mt-2 tracking-tight">English School CRM — Авто-Сборщик</h1>
        <p class="text-xs text-slate-400 mt-1 max-w-lg">
          Веб-сервер запущен, но клиентский SPA бандл в папке <code class="mono text-indigo-300">dist/</code> компилируется или отсутствует.
        </p>
      </div>
      <div class="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 text-right">
        <span class="text-[10px] text-slate-400 font-mono block">SERVER PORT</span>
        <span class="text-lg font-bold text-white font-mono">3000</span>
      </div>
    </div>

    <!-- Main diagnostics panel -->
    <div class="p-8 space-y-8">
      
      <!-- Current Status Tracker -->
      <div class="bg-indigo-50/50 border border-indigo-100 p-5 rounded-2xl flex items-start gap-4">
        <div class="p-3 bg-indigo-600/10 rounded-xl" id="status-icon-box">
          <!-- Spinner -->
          <svg class="animate-spin h-6 w-6 text-indigo-600" id="spinner-svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <div class="flex-1">
          <h2 class="font-bold text-slate-900 text-sm" id="status-headline">Происходит автоматическая сборка фронтенда...</h2>
          <p class="text-xs text-slate-600 mt-1" id="status-desc">
            Пожалуйста, подождите 10-20 секунд, пока Expo экспортирует React Native Web интерфейс в статический бандл. Страница перезагрузится автоматически.
          </p>
        </div>
      </div>

      <!-- Instructions Section -->
      <div>
        <h3 class="font-bold text-slate-900 text-sm mb-4">🚀 Как запустить проект вручную у вас на ПК:</h3>
        <p class="text-xs text-slate-600 mb-4">
          Языковая школа полностью переведена на современный, быстрый стек React Native Web (Expo) с встроенным СУБД администрированием. Java больше не требуется для запуска и показа! Чтобы запустить всё локально:
        </p>

        <!-- Command steps -->
        <div class="space-y-3.5">
          <div class="bg-slate-950 rounded-xl p-4 border border-slate-800 relative group">
            <span class="absolute right-4 top-4 text-[10px] text-slate-500 font-mono">Шаг 1 • Зависимости</span>
            <code class="mono text-xs text-emerald-400 block select-all">npm install --legacy-peer-deps</code>
            <p class="text-[10px] text-slate-400 mt-1.5">Установка библиотек интерфейса и роутинга.</p>
          </div>

          <div class="bg-slate-950 rounded-xl p-4 border border-slate-800 relative group">
            <span class="absolute right-4 top-4 text-[10px] text-slate-500 font-mono">Шаг 2 • Компиляция</span>
            <code class="mono text-xs text-emerald-400 block select-all">npm run build</code>
            <p class="text-[10px] text-slate-400 mt-1.5">Сборка веб-версии приложения в высокопроизводительный бандл.</p>
          </div>

          <div class="bg-slate-950 rounded-xl p-4 border border-slate-800 relative group">
            <span class="absolute right-4 top-4 text-[10px] text-slate-500 font-mono">Шаг 3 • Старт</span>
            <code class="mono text-xs text-emerald-400 block select-all">npm start</code>
            <p class="text-[10px] text-slate-400 mt-1.5">Запуск сервера на порту 3000 и автоматическое открытие в браузере.</p>
          </div>
        </div>
      </div>

      <!-- Real-time logs console -->
      <div class="bg-slate-950 rounded-2xl border border-slate-900 p-5">
        <div class="flex items-center justify-between border-b border-slate-850 pb-3 mb-3">
          <span class="text-xs font-bold text-slate-400 font-mono">logs_console_feed.log</span>
          <span class="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono uppercase" id="process-badge">Building</span>
        </div>
        <!-- Log lines element -->
        <pre class="text-[10px] text-slate-300 font-mono overflow-y-auto max-h-[160px] leading-relaxed whitespace-pre" id="logs-box">Запуск мониторинга...</pre>
      </div>

    </div>

    <!-- Footer of diagnostic page -->
    <div class="bg-slate-50 px-8 py-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-500">
      <span>© Capstone English School CRM. Все права защищены.</span>
      <span class="font-mono">Engine: ZeroNode Static SPA server v1.0.2</span>
    </div>
  </div>

  <script>
    function updateLogs() {
      fetch('/api/build-status')
        .then(res => res.json())
        .then(data => {
          // Update log box
          const logBox = document.getElementById('logs-box');
          if (data.logs && data.logs.length > 0) {
            logBox.textContent = data.logs.join('\\n');
            logBox.scrollTop = logBox.scrollHeight;
          }

          // Update general status
          if (data.hasBuild) {
            document.getElementById('status-headline').innerHTML = '<span class="text-emerald-600 font-bold">Сборка успешно завершена!</span>';
            document.getElementById('status-desc').textContent = 'Фронтенд собран. Страница перезагружается для входа в кабинет...';
            document.getElementById('status-icon-box').className = 'p-3 bg-emerald-100 rounded-xl';
            document.getElementById('status-icon-box').innerHTML = '<svg class="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>';
            document.getElementById('process-badge').textContent = 'COMPLETED';
            document.getElementById('process-badge').style.backgroundColor = '#10b981';
            
            // Reload page in 2 seconds
            setTimeout(() => {
              window.location.reload();
            }, 2000);
            return;
          }

          if (data.buildError) {
            document.getElementById('status-headline').innerHTML = '<span class="text-rose-600 font-bold">Ошибка автоматической сборки</span>';
            document.getElementById('status-desc').textContent = 'Пожалуйста, выполните команды сборки вручную в вашем терминале (указано ниже).';
            document.getElementById('status-icon-box').className = 'p-3 bg-rose-100 rounded-xl';
            document.getElementById('status-icon-box').innerHTML = '<svg class="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>';
            document.getElementById('process-badge').textContent = 'FAILED';
            document.getElementById('process-badge').style.backgroundColor = '#f43f5e';
            return;
          }

          // Continue polling
          setTimeout(updateLogs, 1500);
        })
        .catch(err => {
          console.error(err);
          setTimeout(updateLogs, 3000);
        });
    }

    // Start polling immediately
    setTimeout(updateLogs, 1000);
  </script>
</body>
</html>`;
}

// Primary dev server on Port 3000
const server = http.createServer(handleRequest);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[Static Server] Port ${DEV_PORT} is in use by an existing instance.`);
  } else {
    console.error('[Static Server] Server error on port ' + DEV_PORT + ':', err);
  }
});

server.listen(DEV_PORT, '0.0.0.0', () => {
  console.log(`[Static Server] Running on http://0.0.0.0:${DEV_PORT}`);
});

// Cloud Run ingress server on CLOUD_RUN_PORT (e.g. 8080) when running in Cloud Run production
if (CLOUD_RUN_PORT && CLOUD_RUN_PORT !== DEV_PORT) {
  const cloudRunServer = http.createServer(handleRequest);

  cloudRunServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[Static Server] Port ${CLOUD_RUN_PORT} already bound (e.g. dev container reverse proxy). Listening on port ${DEV_PORT}.`);
    } else {
      console.error('[Static Server] Server error on port ' + CLOUD_RUN_PORT + ':', err);
    }
  });

  cloudRunServer.listen(CLOUD_RUN_PORT, '0.0.0.0', () => {
    console.log(`[Static Server] Cloud Run live listener active on http://0.0.0.0:${CLOUD_RUN_PORT}`);
  });
}

process.on('SIGTERM', () => {
  console.log('[Static Server] SIGTERM signal received. Shutting down gracefully.');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Static Server] SIGINT signal received. Shutting down gracefully.');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error('[Static Server] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Static Server] Unhandled rejection:', reason);
});



