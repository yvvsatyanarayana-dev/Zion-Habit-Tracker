const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const ICONS = {
  // Calendar / Timetable
  calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/></svg>`,
  
  // Matrix / Habits Grid
  matrix: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>`,
  
  // HUD / Floating Pip
  hud: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>`,
  
  // Focus Timer / Stopwatch
  timer: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></svg>`,

  // Play
  play: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3" fill="#4ade80" fill-opacity="0.2"/></svg>`,

  // Pause
  pause: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16" rx="1" fill="#fbbf24" fill-opacity="0.2"/><rect x="14" y="4" width="4" height="16" rx="1" fill="#fbbf24" fill-opacity="0.2"/></svg>`,

  // Check
  check: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,

  // Quit
  quit: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" x2="12" y1="2" y2="12"/></svg>`,

  // Studio / App
  studio: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
};

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      offscreen: true,
    },
  });

  const projectRoot = path.resolve(__dirname, '..');
  const outDirs = [
    path.join(projectRoot, 'assets/tray-icons'),
    path.join(projectRoot, 'src/assets/tray-icons'),
  ];
  for (const d of outDirs) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }

  // Load an HTML page with canvas to render SVGs
  const html = `<!DOCTYPE html>
  <html>
  <body>
    <canvas id="c" width="32" height="32"></canvas>
    <script>
      window.renderSvg = (svgStr) => {
        return new Promise((resolve) => {
          const img = new Image();
          const blob = new Blob([svgStr], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          img.onload = () => {
            const canvas = document.getElementById('c');
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, 32, 32);
            ctx.drawImage(img, 0, 0, 32, 32);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/png'));
          };
          img.src = url;
        });
      };
    </script>
  </body>
  </html>`;

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  for (const [name, svg] of Object.entries(ICONS)) {
    const dataUrl = await win.webContents.executeJavaScript(`window.renderSvg(${JSON.stringify(svg)})`);
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    for (const d of outDirs) {
      fs.writeFileSync(path.join(d, `${name}.png`), buffer);
    }
    console.log(`Generated icon: ${name}.png (${buffer.length} bytes)`);
  }

  console.log('All tray icons successfully generated!');
  app.quit();
});
