const fs = require('fs');
const path = require('path');

try {
  const distDir = path.join(__dirname, 'dist');
  const jsDir = path.join(distDir, '_expo', 'static', 'js', 'web');
  
  if (!fs.existsSync(jsDir)) {
    console.warn('[Post Build] JS web directory does not exist yet.');
    process.exit(0);
  }

  const files = fs.readdirSync(jsDir);
  const jsFile = files.find(f => f.startsWith('index-') && f.endsWith('.js'));

  const cssDir = path.join(distDir, '_expo', 'static', 'css');
  let cssFile = null;
  if (fs.existsSync(cssDir)) {
    const cssFiles = fs.readdirSync(cssDir);
    cssFile = cssFiles.find(f => f.startsWith('web-') && f.endsWith('.css'));
  }

  const htmlPath = path.join(distDir, 'index.html');
  if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, 'utf8');

    if (jsFile) {
      const jsRegex = /src=['"]\/_expo\/static\/js\/web\/index-.*?\.js['"]/;
      html = html.replace(jsRegex, `src="/_expo/static/js/web/${jsFile}"`);
      console.log(`[Post Build] Updated JS bundle to ${jsFile}`);
    }

    if (cssFile) {
      const cssRegex = /href=['"]\/_expo\/static\/css\/web-.*?\.css['"]/g;
      html = html.replace(cssRegex, `href="/_expo/static/css/${cssFile}"`);
      console.log(`[Post Build] Updated CSS bundle to ${cssFile}`);
    }

    // Allow scrolling on body and html on web (remove expo-reset overflow: hidden)
    html = html.replace(/overflow:\s*hidden;?/g, 'overflow-y: auto !important;');
    console.log('[Post Build] Replaced overflow: hidden with overflow-y: auto');

    fs.writeFileSync(htmlPath, html, 'utf8');
  } else {
    console.error('[Post Build] index.html not found in dist/.');
  }
} catch (e) {
  console.error('[Post Build] Failed to run post-build hook:', e);
}
