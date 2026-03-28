/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
// Sproot 95 was fully vibe-coded by @ammaar and @olacombe.
// An homage to an OS that inspired so many of us!

// Define the dosInstances object to fix type errors
const dosInstances = {};

// --- DOM Element References ---
const desktop = document.getElementById('desktop');
const windows = document.querySelectorAll('.window');
const icons = document.querySelectorAll('.icon');
const startMenu = document.getElementById('start-menu');
const startButton = document.getElementById('start-button');
const taskbarAppsContainer = document.getElementById('taskbar-apps');

// --- State Variables ---
let activeWindow = null;
let highestZIndex = 20; // Start z-index for active windows
const openApps = new Map(); // Store open apps and their elements
let paintCritiqueIntervalId = null; // Timer for paint critiques

// Load saved settings
loadSettings();

// Store ResizeObservers to disconnect them later
const paintResizeObserverMap = new Map();

// --- Minesweeper Game State Variables ---
let minesweeperTimerInterval = null;
let minesweeperTimeElapsed = 0;
let minesweeperFlagsPlaced = 0;
let minesweeperGameOver = false;
let minesweeperMineCount = 10; // Default for 9x9
let minesweeperGridSize = { rows: 9, cols: 9 }; // Default 9x9
let minesweeperFirstClick = true; // To ensure first click is never a mine

// --- YouTube Player State ---
const youtubePlayers = {};
let ytApiLoaded = false;
let ytApiLoadingPromise = null;

const DEFAULT_YOUTUBE_VIDEO_ID = 'WXuK6gekU1Y'; // Default video for SprootPlayer ("Never Gonna Give You Up")

// --- Core Functions ---

/** Brings a window to the front and sets it as active */
function bringToFront(windowElement) {
    if (activeWindow === windowElement) return; // Already active

    if (activeWindow) {
        activeWindow.classList.remove('active');
        const appName = activeWindow.id;
        if (openApps.has(appName)) {
            openApps.get(appName)?.taskbarButton.classList.remove('active');
        }
    }

    highestZIndex++;
    windowElement.style.zIndex = highestZIndex.toString();
    windowElement.classList.add('active');
    activeWindow = windowElement;

    const appNameRef = windowElement.id;
    if (openApps.has(appNameRef)) {
        openApps.get(appNameRef)?.taskbarButton.classList.add('active');
    }
     if ((appNameRef === 'doom' || appNameRef === 'wolf3d') && dosInstances[appNameRef]) {
        const container = document.getElementById(`${appNameRef}-container`);
        const canvas = container?.querySelector('canvas');
        canvas?.focus();
     }
}

/** Opens an application window */
async function openApp(appName) {
    const windowElement = document.getElementById(appName);
    if (!windowElement) {
        console.error(`Window element not found for app: ${appName}`);
        return;
    }

    if (openApps.has(appName)) {
        bringToFront(windowElement);
        windowElement.style.display = 'flex';
        windowElement.classList.add('active');
        return;
    }

    windowElement.style.display = 'flex';
    windowElement.classList.add('active');
    bringToFront(windowElement);

    const taskbarButton = document.createElement('div');
    taskbarButton.classList.add('taskbar-app');
    taskbarButton.dataset.appName = appName;

    let iconSrc = '';
    let title = appName;
    const iconElement = findIconElement(appName);
    if (iconElement) {
        const img = iconElement.querySelector('img');
        const span = iconElement.querySelector('span');
        if(img) iconSrc = img.src;
        if(span) title = span.textContent || appName;
    } else { // Fallback for apps opened via start menu but maybe no desktop icon
         switch(appName) {
            case 'myComputer': iconSrc = 'https://storage.googleapis.com/gemini-95-icons/mycomputer.png'; title = 'My SprootTop'; break;
            case 'chrome': iconSrc = 'https://storage.googleapis.com/gemini-95-icons/chrome-icon-2.png'; title = 'Chrome'; break;
            case 'notepad': iconSrc = 'https://storage.googleapis.com/gemini-95-icons/GemNotes.png'; title = 'SprootNotes'; break;
            case 'paint': iconSrc = 'https://storage.googleapis.com/gemini-95-icons/gempaint.png'; title = 'SprootPaint'; break;
            case 'doom': iconSrc = 'https://64.media.tumblr.com/1d89dfa76381e5c14210a2149c83790d/7a15f84c681c1cf9-c1/s540x810/86985984be99d5591e0cbc0dea6f05ffa3136dac.png'; title = 'Doom II'; break;
            case 'minesweeper': iconSrc = 'https://storage.googleapis.com/gemini-95-icons/gemsweeper.png'; title = 'SprootSweeper'; break;
            case 'imageViewer': iconSrc = 'https://win98icons.alexmeub.com/icons/png/display_properties-4.png'; title = 'Image Viewer'; break;
            case 'mediaPlayer': iconSrc = 'https://storage.googleapis.com/gemini-95-icons/ytmediaplayer.png'; title = 'SprootPlayer'; break;
            case 'calculator': iconSrc = 'https://win98icons.alexmeub.com/icons/png/calculator-0.png'; title = 'SprootCalc'; break;
            case 'settings': iconSrc = 'https://win98icons.alexmeub.com/icons/png/settings_gear-0.png'; title = 'SprootSettings'; break;
            case 'clock': iconSrc = 'https://win98icons.alexmeub.com/icons/png/clock-0.png'; title = 'SprootClock'; break;
            case 'recycle': iconSrc = 'https://win98icons.alexmeub.com/icons/png/recycle_bin_empty-0.png'; title = 'SprootRecycle'; break;
            case 'chat': iconSrc = 'https://win98icons.alexmeub.com/icons/png/msn_messenger-0.png'; title = 'SprootChat'; break;
            case 'taskManager': iconSrc = 'https://win98icons.alexmeub.com/icons/png/task_manager-0.png'; title = 'SprootTask'; break;
            case 'extensionManager': iconSrc = 'https://win98icons.alexmeub.com/icons/png/settings_gear-0.png'; title = 'Extension Manager'; break;
            case 'casino': iconSrc = 'https://win98icons.alexmeub.com/icons/png/cards-0.png'; title = 'SprootCasino'; break;
            case 'pinball': iconSrc = 'https://win98icons.alexmeub.com/icons/png/pinball-0.png'; title = 'SprootPinball'; break;
            case 'sprootCode': iconSrc = 'https://win98icons.alexmeub.com/icons/png/script_file-0.png'; title = 'SprootCode'; break;
         }
    }

    if (iconSrc) {
        const img = document.createElement('img');
        img.src = iconSrc;
        img.alt = title;
        taskbarButton.appendChild(img);
    }
    taskbarButton.appendChild(document.createTextNode(title));

    taskbarButton.addEventListener('click', () => {
        if (windowElement === activeWindow && windowElement.style.display !== 'none') {
             minimizeApp(appName);
        } else {
            windowElement.style.display = 'flex';
            bringToFront(windowElement);
        }
    });

    taskbarAppsContainer.appendChild(taskbarButton);
    openApps.set(appName, { windowEl: windowElement, taskbarButton: taskbarButton, cleanup: null });
    taskbarButton.classList.add('active');

    // Initialize specific applications
    let cleanup = null;
    if (appName === 'paint') {
        initSimplePaintApp(windowElement);
    }
    else if (appName === 'doom' && !dosInstances['doom']) {
        const doomContainer = document.getElementById('doom-content');
        if (doomContainer) {
            doomContainer.innerHTML = '<iframe src="https://js-dos.com/games/doom.exe.html" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen></iframe>';
            dosInstances['doom'] = { initialized: true };
        }
    }
    else if (appName === 'minesweeper') {
        initMinesweeperGame(windowElement);
    }
    else if (appName === 'myComputer') {
        initMyComputer(windowElement);
    }
    else if (appName === 'mediaPlayer') {
        await initMediaPlayer(windowElement);
    }
    else if (appName === 'chrome') {
        initChromeBrowser(windowElement);
    }
    else if (appName === 'calculator') {
        initCalculator(windowElement);
    }
    else if (appName === 'settings') {
        initSettings(windowElement);
    }
    else if (appName === 'clock') {
        initClock(windowElement);
    }
    else if (appName === 'chat') {
        // Chat is now an iframe, no initialization needed
    }
    else if (appName === 'notepad') {
        initNotepad(windowElement);
    }
    else if (appName === 'taskManager') {
        initTaskManager(windowElement);
    }
    else if (appName === 'casino') {
        initCasino(windowElement);
    }
    else if (appName === 'pinball') {
        cleanup = initPinball(windowElement);
    }
    else if (appName === 'extensionManager') {
        initExtensionManager(windowElement);
    }
    else if (appName === 'sprootCode') {
        initSprootCode(windowElement);
    }

    if (cleanup) {
        openApps.get(appName).cleanup = cleanup;
    }
}

/** Closes an application window */
function closeApp(appName) {
    const appData = openApps.get(appName);
    if (!appData) return;

    const { windowEl, taskbarButton, cleanup } = appData;

    if (cleanup && typeof cleanup === 'function') {
        cleanup();
    }

    windowEl.style.display = 'none';
    windowEl.classList.remove('active');
    taskbarButton.remove();
    openApps.delete(appName);

    if (dosInstances[appName]) {
        console.log(`Cleaning up ${appName} instance (iframe approach)`);
        const container = document.getElementById(`${appName}-content`);
        if (container) container.innerHTML = '';
        delete dosInstances[appName];
    }

    if (appName === 'paint') {
         const paintContent = appData.windowEl.querySelector('.window-content');
         if (paintContent && paintResizeObserverMap.has(paintContent)) {
             paintResizeObserverMap.get(paintContent)?.disconnect();
             paintResizeObserverMap.delete(paintContent);
         }
    }

    if (appName === 'minesweeper') {
        if (minesweeperTimerInterval) {
            clearInterval(minesweeperTimerInterval);
            minesweeperTimerInterval = null;
        }
    }

    if (appName === 'mediaPlayer') {
        const player = youtubePlayers[appName];
        if (player) {
            try {
                if (typeof player.stopVideo === 'function') player.stopVideo();
                if (typeof player.destroy === 'function') player.destroy();
            } catch (e) {
                console.warn("Error stopping/destroying media player:", e);
            }
            delete youtubePlayers[appName];
            console.log("Destroyed YouTube player for mediaPlayer.");
        }
        // Reset the player area with a message
        const playerDivId = `youtube-player-${appName}`;
        const playerDiv = document.getElementById(playerDivId);
        if (playerDiv) {
            playerDiv.innerHTML = `<p class="media-player-status-message">Player closed. Enter a YouTube URL to load.</p>`;
        }
        // Reset control buttons state
        const mediaPlayerWindow = document.getElementById('mediaPlayer');
        if (mediaPlayerWindow) {
            const playBtn = mediaPlayerWindow.querySelector('#media-player-play');
            const pauseBtn = mediaPlayerWindow.querySelector('#media-player-pause');
            const stopBtn = mediaPlayerWindow.querySelector('#media-player-stop');
            if (playBtn) playBtn.disabled = true;
            if (pauseBtn) pauseBtn.disabled = true;
            if (stopBtn) stopBtn.disabled = true;
        }
    }


    if (activeWindow === windowEl) {
        activeWindow = null;
        let nextAppToActivate = null;
        let maxZ = -1;
        openApps.forEach((data) => {
             const z = parseInt(data.windowEl.style.zIndex || '0', 10);
             if (z > maxZ) {
                 maxZ = z;
                 nextAppToActivate = data.windowEl;
             }
        });
        if (nextAppToActivate) {
            bringToFront(nextAppToActivate);
        }
    }
}

/** Minimizes an application window */
function minimizeApp(appName) {
    const appData = openApps.get(appName);
    if (!appData) return;

    const { windowEl, taskbarButton } = appData;

    windowEl.style.display = 'none';
    windowEl.classList.remove('active');
    taskbarButton.classList.remove('active');

    if (activeWindow === windowEl) {
        activeWindow = null;
         let nextAppToActivate = null;
         let maxZ = 0;
         openApps.forEach((data, name) => {
             if (data.windowEl.style.display !== 'none') {
                 const z = parseInt(data.windowEl.style.zIndex || '0', 10);
                 if (z > maxZ) {
                     maxZ = z;
                     nextAppToActivate = name;
                 }
             }
         });
         if (nextAppToActivate) {
             bringToFront(openApps.get(nextAppToActivate).windowEl);
         }
    }
}



// --- Event Listeners Setup ---

icons.forEach(icon => {
    icon.addEventListener('click', () => {
        const appName = icon.getAttribute('data-app');
        if (appName) {
            openApp(appName);
            startMenu.classList.remove('active');
        }
    });
});

document.querySelectorAll('.start-menu-item').forEach(item => {
    item.addEventListener('click', () => {
        const appName = item.getAttribute('data-app');
        if (appName) openApp(appName);
        startMenu.classList.remove('active');
    });
});

startButton.addEventListener('click', (e) => {
    e.stopPropagation();
    startMenu.classList.toggle('active');
    if (startMenu.classList.contains('active')) {
        highestZIndex++;
        startMenu.style.zIndex = highestZIndex.toString();
    }
});

windows.forEach(windowElement => {
    const titleBar = windowElement.querySelector('.window-titlebar');
    const closeButton = windowElement.querySelector('.window-close');
    const minimizeButton = windowElement.querySelector('.window-minimize');

    windowElement.addEventListener('mousedown', () => bringToFront(windowElement), true);

    if (closeButton) {
        closeButton.addEventListener('click', (e) => { e.stopPropagation(); closeApp(windowElement.id); });
    }
    if (minimizeButton) {
        minimizeButton.addEventListener('click', (e) => { e.stopPropagation(); minimizeApp(windowElement.id); });
    }

    if (titleBar) {
        let isDragging = false;
        let dragOffsetX, dragOffsetY;
        const startDragging = (e) => {
             if (!(e.target === titleBar || titleBar.contains(e.target)) || e.target.closest('.window-control-button')) {
                 isDragging = false; return;
            }
            isDragging = true; bringToFront(windowElement);
            const rect = windowElement.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left; dragOffsetY = e.clientY - rect.top;
            titleBar.style.cursor = 'grabbing';
            document.addEventListener('mousemove', dragWindow);
            document.addEventListener('mouseup', stopDragging, { once: true });
        };
        const dragWindow = (e) => {
            if (!isDragging) return;
            let x = e.clientX - dragOffsetX; let y = e.clientY - dragOffsetY;
            const taskbarHeight = taskbarAppsContainer.parentElement?.offsetHeight ?? 36;
            const maxX = window.innerWidth - windowElement.offsetWidth;
            const maxY = window.innerHeight - windowElement.offsetHeight - taskbarHeight;
            const minX = -(windowElement.offsetWidth - 40);
            const maxXAdjusted = window.innerWidth - 40;
            x = Math.max(minX, Math.min(x, maxXAdjusted));
            y = Math.max(0, Math.min(y, maxY));
            windowElement.style.left = `${x}px`; windowElement.style.top = `${y}px`;
        };
        const stopDragging = () => {
            if (!isDragging) return;
            isDragging = false; titleBar.style.cursor = 'grab';
            document.removeEventListener('mousemove', dragWindow);
        };
        titleBar.addEventListener('mousedown', startDragging);
    }

    if (!openApps.has(windowElement.id)) {
        const randomTop = Math.random() * (window.innerHeight / 4) + 20;
        const randomLeft = Math.random() * (window.innerWidth / 3) + 20;
        windowElement.style.top = `${randomTop}px`;
        windowElement.style.left = `${randomLeft}px`;
    }
});

document.addEventListener('click', (e) => {
    if (startMenu.classList.contains('active') && !startMenu.contains(e.target) && !startButton.contains(e.target)) {
        startMenu.classList.remove('active');
    }
});

function findIconElement(appName) {
    return Array.from(icons).find(icon => icon.dataset.app === appName);
}

function initSimplePaintApp(windowElement) {
    const canvas = windowElement.querySelector('#paint-canvas');
    const toolbar = windowElement.querySelector('.paint-toolbar');
    const contentArea = windowElement.querySelector('.window-content');
    const colorSwatches = windowElement.querySelectorAll('.paint-color-swatch');
    const sizeButtons = windowElement.querySelectorAll('.paint-size-button');
    const clearButton = windowElement.querySelector('.paint-clear-button');

    if (!canvas || !toolbar || !contentArea || !clearButton) { return; }
    const ctx = canvas.getContext('2d');
    if (!ctx) { return; }

    let isDrawing = false; let lastX = 0; let lastY = 0;
    ctx.strokeStyle = 'black'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    let currentStrokeStyle = ctx.strokeStyle; let currentLineWidth = ctx.lineWidth;

    function resizeCanvas() {
        const rect = contentArea.getBoundingClientRect();
        const toolbarHeight = toolbar.offsetHeight;
        const newWidth = Math.floor(rect.width);
        const newHeight = Math.floor(rect.height - toolbarHeight);

        if (canvas.width === newWidth && canvas.height === newHeight && newWidth > 0 && newHeight > 0) return;

        canvas.width = newWidth > 0 ? newWidth : 1;
        canvas.height = newHeight > 0 ? newHeight : 1;

        ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = currentStrokeStyle; ctx.lineWidth = currentLineWidth;
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    }

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(contentArea);
    paintResizeObserverMap.set(contentArea, resizeObserver);
    resizeCanvas();

    function getMousePos(canvasDom, event) {
        const rect = canvasDom.getBoundingClientRect();
        let clientX, clientY;
        if (event instanceof MouseEvent) { clientX = event.clientX; clientY = event.clientY; }
        else { clientX = event.touches[0].clientX; clientY = event.touches[0].clientY; }
        return { x: clientX - rect.left, y: clientY - rect.top };
    }
    function startDrawing(e) {
        isDrawing = true; const pos = getMousePos(canvas, e);
        [lastX, lastY] = [pos.x, pos.y]; ctx.beginPath(); ctx.moveTo(lastX, lastY);
    }
    function draw(e) {
        if (!isDrawing) return; e.preventDefault();
        const pos = getMousePos(canvas, e);
        ctx.lineTo(pos.x, pos.y); ctx.stroke();
        [lastX, lastY] = [pos.x, pos.y];
    }
    function stopDrawing() { if (isDrawing) isDrawing = false; }

    canvas.addEventListener('mousedown', startDrawing); canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing); canvas.addEventListener('mouseleave', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing); canvas.addEventListener('touchcancel', stopDrawing);

    colorSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            ctx.strokeStyle = swatch.dataset.color || 'black'; currentStrokeStyle = ctx.strokeStyle;
            colorSwatches.forEach(s => s.classList.remove('active')); swatch.classList.add('active');
            if (swatch.dataset.color === 'white') {
                const largeSizeButton = Array.from(sizeButtons).find(b => b.dataset.size === '10');
                if (largeSizeButton) {
                    ctx.lineWidth = parseInt(largeSizeButton.dataset.size || '10', 10); currentLineWidth = ctx.lineWidth;
                    sizeButtons.forEach(s => s.classList.remove('active')); largeSizeButton.classList.add('active');
                }
            } else {
                const activeSizeButton = Array.from(sizeButtons).find(b => b.classList.contains('active'));
                if (activeSizeButton) { ctx.lineWidth = parseInt(activeSizeButton.dataset.size || '2', 10); currentLineWidth = ctx.lineWidth; }
            }
        });
    });
    sizeButtons.forEach(button => {
        button.addEventListener('click', () => {
            ctx.lineWidth = parseInt(button.dataset.size || '2', 10); currentLineWidth = ctx.lineWidth;
            sizeButtons.forEach(s => s.classList.remove('active')); button.classList.add('active');
            const eraser = Array.from(colorSwatches).find(s => s.dataset.color === 'white');
            if (!eraser?.classList.contains('active')) {
                 if (!Array.from(colorSwatches).some(s => s.classList.contains('active'))) {
                    const blackSwatch = Array.from(colorSwatches).find(s => s.dataset.color === 'black');
                    blackSwatch?.classList.add('active'); ctx.strokeStyle = 'black'; currentStrokeStyle = ctx.strokeStyle;
                 }
            }
        });
    });
    clearButton.addEventListener('click', () => {
        ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    });
    (windowElement.querySelector('.paint-color-swatch[data-color="black"]'))?.classList.add('active');
    (windowElement.querySelector('.paint-size-button[data-size="2"]'))?.classList.add('active');
}

function initMinesweeperGame(windowElement) {
    const boardElement = windowElement.querySelector('#minesweeper-board');
    const flagCountElement = windowElement.querySelector('.minesweeper-flag-count');
    const timerElement = windowElement.querySelector('.minesweeper-timer');
    const resetButton = windowElement.querySelector('.minesweeper-reset-button');
    if (!boardElement || !flagCountElement || !timerElement || !resetButton) return;
    let grid = [];
    function resetGame() {
        if (minesweeperTimerInterval) clearInterval(minesweeperTimerInterval);
        minesweeperTimerInterval = null; minesweeperTimeElapsed = 0; minesweeperFlagsPlaced = 0;
        minesweeperGameOver = false; minesweeperFirstClick = true; minesweeperMineCount = 10;
        minesweeperGridSize = { rows: 9, cols: 9 };
        timerElement.textContent = `⏱️ 0`; flagCountElement.textContent = `🚩 ${minesweeperMineCount}`;
        resetButton.textContent = '🙂';
        createGrid();
    }
    function createGrid() {
        boardElement.innerHTML = ''; grid = [];
        boardElement.style.gridTemplateColumns = `repeat(${minesweeperGridSize.cols}, 20px)`;
        boardElement.style.gridTemplateRows = `repeat(${minesweeperGridSize.rows}, 20px)`;
        for (let r = 0; r < minesweeperGridSize.rows; r++) {
            const row = [];
            for (let c = 0; c < minesweeperGridSize.cols; c++) {
                const cellElement = document.createElement('div'); cellElement.classList.add('minesweeper-cell');
                const cellData = { isMine: false, isRevealed: false, isFlagged: false, adjacentMines: 0, element: cellElement, row: r, col: c };
                cellElement.addEventListener('click', () => handleCellClick(cellData));
                cellElement.addEventListener('contextmenu', (e) => { e.preventDefault(); handleCellRightClick(cellData); });
                row.push(cellData); boardElement.appendChild(cellElement);
            }
            grid.push(row);
        }
    }
    function placeMines(firstClickRow, firstClickCol) {
        let minesPlaced = 0;
        while (minesPlaced < minesweeperMineCount) {
            const r = Math.floor(Math.random() * minesweeperGridSize.rows);
            const c = Math.floor(Math.random() * minesweeperGridSize.cols);
            if ((r === firstClickRow && c === firstClickCol) || grid[r][c].isMine) continue;
            grid[r][c].isMine = true; minesPlaced++;
        }
        for (let r = 0; r < minesweeperGridSize.rows; r++) {
            for (let c = 0; c < minesweeperGridSize.cols; c++) {
                if (!grid[r][c].isMine) grid[r][c].adjacentMines = countAdjacentMines(r, c);
            }
        }
    }
    function countAdjacentMines(row, col) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = row + dr; const nc = col + dc;
                if (nr >= 0 && nr < minesweeperGridSize.rows && nc >= 0 && nc < minesweeperGridSize.cols && grid[nr][nc].isMine) count++;
            }
        }
        return count;
    }
    function handleCellClick(cell) {
        if (minesweeperGameOver || cell.isRevealed || cell.isFlagged) return;
        if (minesweeperFirstClick && !minesweeperTimerInterval) {
             placeMines(cell.row, cell.col); minesweeperFirstClick = false; startTimer();
        }
        if (cell.isMine) gameOver(cell);
        else { revealCell(cell); checkWinCondition(); }
    }
    function handleCellRightClick(cell) {
        if (minesweeperGameOver || cell.isRevealed || (minesweeperFirstClick && !minesweeperTimerInterval)) return;
        cell.isFlagged = !cell.isFlagged; cell.element.textContent = cell.isFlagged ? '🚩' : '';
        minesweeperFlagsPlaced += cell.isFlagged ? 1 : -1;
        updateFlagCount(); checkWinCondition();
    }
    function revealCell(cell) {
        if (cell.isRevealed || cell.isFlagged || cell.isMine) return;
        cell.isRevealed = true; cell.element.classList.add('revealed'); cell.element.textContent = '';
        if (cell.adjacentMines > 0) {
            cell.element.textContent = cell.adjacentMines.toString();
            cell.element.dataset.number = cell.adjacentMines.toString();
        } else {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = cell.row + dr; const nc = cell.col + dc;
                    if (nr >= 0 && nr < minesweeperGridSize.rows && nc >= 0 && nc < minesweeperGridSize.cols) {
                        const neighbor = grid[nr][nc];
                        if (!neighbor.isRevealed && !neighbor.isFlagged) revealCell(neighbor);
                    }
                }
            }
        }
    }
    function startTimer() {
        if (minesweeperTimerInterval) return;
        minesweeperTimeElapsed = 0; timerElement.textContent = `⏱️ 0`;
        minesweeperTimerInterval = window.setInterval(() => {
            minesweeperTimeElapsed++; timerElement.textContent = `⏱️ ${minesweeperTimeElapsed}`;
        }, 1000);
    }
    function updateFlagCount() {
        flagCountElement.textContent = `🚩 ${minesweeperMineCount - minesweeperFlagsPlaced}`;
    }
    function gameOver(clickedMine) {
        minesweeperGameOver = true;
        if (minesweeperTimerInterval) clearInterval(minesweeperTimerInterval);
        minesweeperTimerInterval = null; resetButton.textContent = '😵';
        grid.forEach(row => row.forEach(cell => {
            if (cell.isMine) {
                cell.element.classList.add('mine', 'revealed'); cell.element.textContent = '💣';
            }
            if (!cell.isMine && cell.isFlagged) cell.element.textContent = '❌';
        }));
        clickedMine.element.classList.add('exploded'); clickedMine.element.textContent = '💥';
    }
    function checkWinCondition() {
        if (minesweeperGameOver) return;
        let revealedCount = 0; let correctlyFlaggedMines = 0;
        grid.forEach(row => row.forEach(cell => {
            if (cell.isRevealed && !cell.isMine) revealedCount++;
            if (cell.isFlagged && cell.isMine) correctlyFlaggedMines++;
        }));
        const totalNonMineCells = (minesweeperGridSize.rows * minesweeperGridSize.cols) - minesweeperMineCount;
        if (revealedCount === totalNonMineCells || (correctlyFlaggedMines === minesweeperMineCount && minesweeperFlagsPlaced === minesweeperMineCount)) {
            minesweeperGameOver = true;
            if (minesweeperTimerInterval) clearInterval(minesweeperTimerInterval);
            minesweeperTimerInterval = null; resetButton.textContent = '😎';
            if (revealedCount === totalNonMineCells) {
                 grid.forEach(row => row.forEach(cell => {
                     if (cell.isMine && !cell.isFlagged) { cell.isFlagged = true; cell.element.textContent = '🚩'; minesweeperFlagsPlaced++; }
                 })); updateFlagCount();
            }
        }
    }
    function getBoardStateAsText() {
        let boardString = `Flags: ${minesweeperMineCount - minesweeperFlagsPlaced}, Time: ${minesweeperTimeElapsed}s\nGrid (H=Hidden,F=Flag,Num=Mines):\n`;
        grid.forEach(row => {
            row.forEach(cell => {
                if (cell.isFlagged) boardString += " F ";
                else if (!cell.isRevealed) boardString += " H ";
                else if (cell.adjacentMines > 0) boardString += ` ${cell.adjacentMines} `;
                else boardString += " _ ";
            });
            boardString += "\n";
        });
        return boardString;
    }
    resetButton.addEventListener('click', resetGame);
    resetGame();
}

function initMyComputer(windowElement) {
    const cDriveIcon = windowElement.querySelector('#c-drive-icon');
    const cDriveContent = windowElement.querySelector('#c-drive-content');
    const secretImageIcon = windowElement.querySelector('#secret-image-icon');
    if (!cDriveIcon || !cDriveContent || !secretImageIcon) return;
    cDriveIcon.addEventListener('click', () => {
        cDriveIcon.style.display = 'none'; cDriveContent.style.display = 'block';
    });
    secretImageIcon.addEventListener('click', () => {
        const imageViewerWindow = document.getElementById('imageViewer');
        const imageViewerImg = document.getElementById('image-viewer-img');
        const imageViewerTitle = document.getElementById('image-viewer-title');
        if (!imageViewerWindow || !imageViewerImg || !imageViewerTitle) { alert("Image Viewer corrupted!"); return; }
        imageViewerImg.src = 'https://storage.googleapis.com/gemini-95-icons/%40ammaar%2B%40olacombe.png';
        imageViewerImg.alt = 'dontshowthistoanyone.jpg';
        imageViewerTitle.textContent = 'dontshowthistoanyone.jpg - Image Viewer';
        openApp('imageViewer');
    });
    cDriveIcon.style.display = 'inline-flex'; cDriveContent.style.display = 'none';
}

function initChromeBrowser(windowElement) {
    const addressBar = windowElement.querySelector('.browser-address-bar');
    const goButton = windowElement.querySelector('.browser-go-button');
    const extensionsButton = windowElement.querySelector('.browser-extensions-button');
    const framesContainer = windowElement.querySelector('.browser-frames-container');
    const tabsContainer = windowElement.querySelector('.tabs-container');
    const newTabBtn = windowElement.querySelector('.new-tab-button');
    const loading = windowElement.querySelector('.browser-loading');

    if (!addressBar || !goButton || !framesContainer || !tabsContainer || !newTabBtn || !loading) return;

    let tabs = [];
    let activeTabId = null;

    function createTab(url = 'https://web.archive.org/web/19990428171538/http://google.com/') {
        const id = Date.now() + Math.random().toString(36).substr(2, 9);
        const tab = {
            id,
            url,
            title: 'Loading...'
        };
        tabs.push(tab);

        const tabEl = document.createElement('div');
        tabEl.className = 'browser-tab';
        tabEl.dataset.id = id;
        tabEl.innerHTML = `
            <span class="tab-title">New Tab</span>
            <span class="browser-tab-close">✕</span>
        `;
        tabsContainer.appendChild(tabEl);

        const iframe = document.createElement('iframe');
        iframe.className = 'browser-frame';
        iframe.dataset.id = id;
        iframe.src = url;
        iframe.onload = () => {
            loading.style.display = 'none';
            try {
                // Try to get title if same-origin (rare)
                if (iframe.contentDocument && iframe.contentDocument.title) {
                    tabEl.querySelector('.tab-title').textContent = iframe.contentDocument.title;
                } else {
                    const urlObj = new URL(iframe.src);
                    tabEl.querySelector('.tab-title').textContent = urlObj.hostname;
                }

                // Simulate Extension Content Scripts
                installedExtensions.forEach(ext => {
                    if (ext.enabled && ext.manifest.content_scripts) {
                        ext.manifest.content_scripts.forEach(cs => {
                            // Check matches (simplified)
                            const matches = cs.matches.some(m => {
                                if (m === '<all_urls>') return true;
                                const regex = new RegExp(m.replace(/\*/g, '.*'));
                                return regex.test(iframe.src);
                            });

                            if (matches && cs.js) {
                                cs.js.forEach(jsFile => {
                                    const scriptContent = ext.scripts[jsFile];
                                    if (scriptContent) {
                                        try {
                                            const script = iframe.contentDocument.createElement('script');
                                            script.textContent = scriptContent;
                                            iframe.contentDocument.head.appendChild(script);
                                            console.log(`Injected ${jsFile} from ${ext.name}`);
                                        } catch (e) {
                                            console.warn(`Could not inject ${jsFile} into ${iframe.src}: Cross-origin restriction.`);
                                        }
                                    }
                                });
                            }
                        });
                    }
                });
            } catch (e) {
                // Fallback for cross-origin
                const urlObj = new URL(iframe.src);
                tabEl.querySelector('.tab-title').textContent = urlObj.hostname;
                console.warn(`Cross-origin restriction for ${iframe.src}. Extensions cannot inject scripts.`);
            }
        };
        framesContainer.appendChild(iframe);

        tabEl.addEventListener('click', (e) => {
            if (e.target.classList.contains('browser-tab-close')) {
                closeTab(id);
            } else {
                switchTab(id);
            }
        });

        switchTab(id);
    }

    function switchTab(id) {
        // Save current address bar to the OLD active tab before switching
        if (activeTabId) {
            const oldTab = tabs.find(t => t.id === activeTabId);
            if (oldTab) {
                oldTab.url = addressBar.value;
            }
        }

        activeTabId = id;
        const activeTab = tabs.find(t => t.id === id);
        if (!activeTab) return;

        addressBar.value = activeTab.url;

        windowElement.querySelectorAll('.browser-tab').forEach(el => {
            el.classList.toggle('active', el.dataset.id === id);
        });

        windowElement.querySelectorAll('.browser-frame').forEach(el => {
            el.classList.toggle('active', el.dataset.id === id);
        });
    }

    function closeTab(id) {
        const index = tabs.findIndex(t => t.id === id);
        if (index === -1) return;

        tabs.splice(index, 1);
        windowElement.querySelector(`.browser-tab[data-id="${id}"]`).remove();
        windowElement.querySelector(`.browser-frame[data-id="${id}"]`).remove();

        if (activeTabId === id) {
            if (tabs.length > 0) {
                switchTab(tabs[tabs.length - 1].id);
            } else {
                createTab();
            }
        }
    }

    function loadUrl() {
        let url = addressBar.value.trim();
        if (!url) return;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        
        const activeIframe = windowElement.querySelector(`.browser-frame[data-id="${activeTabId}"]`);
        if (activeIframe) {
            loading.style.display = 'flex';
            activeIframe.src = url;
            const tab = tabs.find(t => t.id === activeTabId);
            if (tab) tab.url = url;
        }
    }

    goButton.addEventListener('click', loadUrl);
    addressBar.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadUrl();
    });

    newTabBtn.addEventListener('click', () => createTab());

    if (extensionsButton) {
        extensionsButton.addEventListener('click', () => {
            openApp('extensionManager');
        });
    }

    // Initial tab
    createTab();
}

function initCalculator(windowElement) {
    const display = windowElement.querySelector('#calc-display');
    const buttons = windowElement.querySelectorAll('.calc-btn');
    if (!display || !buttons) return;

    let currentInput = '0';
    let previousInput = '';
    let operator = null;

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.textContent;
            if (!isNaN(val)) {
                if (currentInput === '0') currentInput = val;
                else currentInput += val;
            } else if (val === 'C') {
                currentInput = '0';
                previousInput = '';
                operator = null;
            } else if (val === '=') {
                if (operator && previousInput) {
                    currentInput = eval(`${previousInput}${operator}${currentInput}`).toString();
                    operator = null;
                    previousInput = '';
                }
            } else {
                operator = val;
                previousInput = currentInput;
                currentInput = '0';
            }
            display.value = currentInput;
        });
    });
}

function initSettings(windowElement) {
    const bgInput = windowElement.querySelector('#bg-url-input');
    const applyBgBtn = windowElement.querySelector('#apply-bg-btn');
    const themeColorInput = windowElement.querySelector('#theme-color-input');
    const appIconSelect = windowElement.querySelector('#app-icon-select');
    const iconUploadInput = windowElement.querySelector('#icon-upload-input');
    const applyIconBtn = windowElement.querySelector('#apply-icon-btn');
    const resetIconsBtn = windowElement.querySelector('#reset-icons-btn');

    // Set initial values in inputs if they exist in localStorage
    if (bgInput) {
        bgInput.value = localStorage.getItem('sproot95_bg_url') || '';
    }
    if (themeColorInput) {
        themeColorInput.value = localStorage.getItem('sproot95_theme_color') || '#008080';
    }

    if (applyBgBtn && bgInput) {
        applyBgBtn.addEventListener('click', () => {
            const url = bgInput.value.trim();
            if (url) {
                document.body.style.backgroundImage = `url('${url}')`;
                document.body.style.backgroundColor = 'transparent';
                localStorage.setItem('sproot95_bg_url', url);
            } else {
                document.body.style.backgroundImage = 'none';
                document.body.style.backgroundColor = '#008080';
                localStorage.removeItem('sproot95_bg_url');
            }
        });
    }

    if (themeColorInput) {
        themeColorInput.addEventListener('input', (e) => {
            const color = e.target.value;
            applyThemeColor(color);
            localStorage.setItem('sproot95_theme_color', color);
        });
    }

    if (applyIconBtn && appIconSelect && iconUploadInput) {
        applyIconBtn.addEventListener('click', () => {
            const appName = appIconSelect.value;
            const file = iconUploadInput.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const base64 = e.target.result;
                    applyAppIcon(appName, base64);
                    saveAppIcon(appName, base64);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (resetIconsBtn) {
        resetIconsBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all icons to default?')) {
                resetAllIcons();
            }
        });
    }
}

function applyAppIcon(appName, iconSrc) {
    const iconElement = findIconElement(appName);
    if (iconElement) {
        const img = iconElement.querySelector('img');
        if (img) img.src = iconSrc;
    }
}

function saveAppIcon(appName, iconSrc) {
    const customIcons = JSON.parse(localStorage.getItem('sproot95_custom_icons') || '{}');
    customIcons[appName] = iconSrc;
    localStorage.setItem('sproot95_custom_icons', JSON.stringify(customIcons));
}

function resetAllIcons() {
    localStorage.removeItem('sproot95_custom_icons');
    location.reload(); // Simplest way to restore defaults
}

function applyThemeColor(color) {
    document.documentElement.style.setProperty('--theme-color', color);
    // Update taskbar and start menu colors
    const taskbar = document.getElementById('taskbar');
    const startMenu = document.getElementById('start-menu');
    const startButton = document.getElementById('start-button');
    if (taskbar) taskbar.style.backgroundColor = color;
    if (startMenu) startMenu.style.backgroundColor = color;
    if (startButton) {
        startButton.style.backgroundColor = '#FFF200'; // Keep yellow start button
        startButton.style.color = color;
    }
}

function loadSettings() {
    const savedBgUrl = localStorage.getItem('sproot95_bg_url');
    const savedThemeColor = localStorage.getItem('sproot95_theme_color');
    const customIcons = JSON.parse(localStorage.getItem('sproot95_custom_icons') || '{}');

    if (savedBgUrl) {
        document.body.style.backgroundImage = `url('${savedBgUrl}')`;
        document.body.style.backgroundColor = 'transparent';
    }

    if (savedThemeColor) {
        applyThemeColor(savedThemeColor);
    }

    // Apply custom icons
    for (const appName in customIcons) {
        applyAppIcon(appName, customIcons[appName]);
    }
}

// --- YouTube Player (SprootPlayer) Logic ---
function loadYouTubeApi() {
    if (ytApiLoaded) return Promise.resolve();
    if (ytApiLoadingPromise) return ytApiLoadingPromise;

    ytApiLoadingPromise = new Promise((resolve, reject) => {
        if (window.YT && window.YT.Player) {
            ytApiLoaded = true; resolve(); return;
        }
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        tag.onerror = (err) => {
            console.error("Failed to load YouTube API script:", err);
            ytApiLoadingPromise = null;
            reject(new Error("YouTube API script load failed"));
        };
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = () => {
            ytApiLoaded = true; ytApiLoadingPromise = null; resolve();
        };
        setTimeout(() => {
            if (!ytApiLoaded) {
                if (window.onYouTubeIframeAPIReady) window.onYouTubeIframeAPIReady = null;
                ytApiLoadingPromise = null;
                reject(new Error("YouTube API load timeout"));
            }
        }, 10000);
    });
    return ytApiLoadingPromise;
}

function getYouTubeVideoId(urlOrId) {
    if (!urlOrId) return null;
    if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) return urlOrId;
    const regExp = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]{11}).*/;
    const match = urlOrId.match(regExp);
    return (match && match[1]) ? match[1] : null;
}

async function initMediaPlayer(windowElement) {
    const appName = windowElement.id;
    const urlInput = windowElement.querySelector('.media-player-input');
    const loadButton = windowElement.querySelector('.media-player-load-button');
    const playerContainerDivId = `youtube-player-${appName}`;
    const playerDiv = windowElement.querySelector(`#${playerContainerDivId}`);
    const playButton = windowElement.querySelector('#media-player-play');
    const pauseButton = windowElement.querySelector('#media-player-pause');
    const stopButton = windowElement.querySelector('#media-player-stop');

    if (!urlInput || !loadButton || !playerDiv || !playButton || !pauseButton || !stopButton) {
        console.error("Media Player elements not found for", appName);
        if (playerDiv) playerDiv.innerHTML = `<p class="media-player-status-message" style="color:red;">Error: Player UI missing.</p>`;
        return;
    }

    const updateButtonStates = (playerState) => {
        const YTPlayerState = window.YT?.PlayerState;
        if (!YTPlayerState) {
             playButton.disabled = true; pauseButton.disabled = true; stopButton.disabled = true;
             return;
        }
        const state = playerState !== undefined ? playerState
            : (youtubePlayers[appName] && typeof youtubePlayers[appName].getPlayerState === 'function' ? youtubePlayers[appName].getPlayerState() : YTPlayerState.UNSTARTED);

        playButton.disabled = state === YTPlayerState.PLAYING || state === YTPlayerState.BUFFERING;
        pauseButton.disabled = state !== YTPlayerState.PLAYING && state !== YTPlayerState.BUFFERING;
        stopButton.disabled = state === YTPlayerState.ENDED || state === YTPlayerState.UNSTARTED || state === -1;
    };

    updateButtonStates(-1);

    const showPlayerMessage = (message, isError = false) => {
        const player = youtubePlayers[appName];
        if (player) {
            try { if (typeof player.destroy === 'function') player.destroy(); }
            catch(e) { console.warn("Minor error destroying player:", e); }
            delete youtubePlayers[appName];
        }
        playerDiv.innerHTML = `<p class="media-player-status-message" style="color:${isError ? 'red' : '#ccc'};">${message}</p>`;
        updateButtonStates(-1);
    };

    const initialStatusMessageEl = playerDiv.querySelector('.media-player-status-message');
    if (initialStatusMessageEl) initialStatusMessageEl.textContent = 'Connecting to YouTube...';

    try {
        await loadYouTubeApi();
        if (initialStatusMessageEl) initialStatusMessageEl.textContent = 'YouTube API Ready. Loading default video...';
    } catch (error) {
        showPlayerMessage(`Error: Could not load YouTube Player API. ${error.message}`, true);
        return;
    }

    const createPlayer = (videoId) => {
        const existingPlayer = youtubePlayers[appName];
        if (existingPlayer) {
            try { if (typeof existingPlayer.destroy === 'function') existingPlayer.destroy(); }
            catch(e) { console.warn("Minor error destroying previous player:", e); }
        }
        playerDiv.innerHTML = '';

        try {
            youtubePlayers[appName] = new YT.Player(playerContainerDivId, {
                height: '100%', width: '100%', videoId: videoId,
                playerVars: { 'playsinline': 1, 'autoplay': 1, 'controls': 0, 'modestbranding': 1, 'rel': 0, 'fs': 0, 'origin': window.location.origin },
                events: {
                    'onReady': (event) => { updateButtonStates(event.target.getPlayerState()); },
                    'onError': (event) => {
                        const errorMessages = { 2: "Invalid video ID.", 5: "HTML5 Player error.", 100: "Video not found/private.", 101: "Playback disallowed.", 150: "Playback disallowed."};
                        showPlayerMessage(errorMessages[event.data] || `Playback Error (Code: ${event.data})`, true);
                    },
                    'onStateChange': (event) => { updateButtonStates(event.data); }
                }
            });
        } catch (error) {
             showPlayerMessage(`Failed to create video player: ${error.message}`, true);
        }
    };

    loadButton.addEventListener('click', () => {
        const videoUrlOrId = urlInput.value.trim();
        const videoId = getYouTubeVideoId(videoUrlOrId);
        if (videoId) {
             showPlayerMessage("Loading video...");
             createPlayer(videoId);
        } else {
            showPlayerMessage("Invalid YouTube URL or Video ID.", true);
        }
    });

    playButton.addEventListener('click', () => {
        const player = youtubePlayers[appName];
        if (player && typeof player.playVideo === 'function') player.playVideo();
    });
    pauseButton.addEventListener('click', () => {
        const player = youtubePlayers[appName];
        if (player && typeof player.pauseVideo === 'function') player.pauseVideo();
    });
    stopButton.addEventListener('click', () => {
        const player = youtubePlayers[appName];
        if (player && typeof player.stopVideo === 'function') {
            player.stopVideo();
            updateButtonStates(window.YT?.PlayerState?.ENDED);
        }
    });

    if (DEFAULT_YOUTUBE_VIDEO_ID) {
        if (initialStatusMessageEl) initialStatusMessageEl.textContent = `Loading default video...`;
        createPlayer(DEFAULT_YOUTUBE_VIDEO_ID);
    }
}

function initClock(windowElement) {
    const display = windowElement.querySelector('#clock-display');
    const taskbarClock = document.getElementById('taskbar-clock');

    function updateClock() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        const timeStr = `${h}:${m}:${s}`;
        if (display) display.textContent = timeStr;
        if (taskbarClock) taskbarClock.textContent = timeStr;
    }

    setInterval(updateClock, 1000);
    updateClock();
}

// Initialize taskbar clock immediately
initClock(document.createElement('div'));

let installedExtensions = JSON.parse(localStorage.getItem('sproot95_extensions')) || [];

function saveExtensions() {
    localStorage.setItem('sproot95_extensions', JSON.stringify(installedExtensions));
}

function initExtensionManager(windowElement) {
    const uploadFolderBtn = windowElement.querySelector('#upload-extension-folder');
    const uploadJsonBtn = windowElement.querySelector('#upload-extension-json');
    const listContainer = windowElement.querySelector('#extension-list');

    function renderExtensions() {
        if (!listContainer) return;
        if (installedExtensions.length === 0) {
            listContainer.innerHTML = '<div style="color: #888; font-style: italic; text-align: center; margin-top: 50px;">No extensions loaded.</div>';
            return;
        }

        listContainer.innerHTML = '';
        installedExtensions.forEach((ext, index) => {
            const item = document.createElement('div');
            item.className = 'extension-item';
            item.style.padding = '10px';
            item.style.borderBottom = '1px solid #ccc';
            item.style.display = 'flex';
            item.style.flexDirection = 'column';
            item.style.gap = '5px';
            item.style.backgroundColor = ext.enabled ? '#fff' : '#f9f9f9';
            item.style.opacity = ext.enabled ? '1' : '0.6';

            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';

            const nameContainer = document.createElement('div');
            nameContainer.style.display = 'flex';
            nameContainer.style.alignItems = 'center';
            nameContainer.style.gap = '10px';

            const toggle = document.createElement('input');
            toggle.type = 'checkbox';
            toggle.checked = ext.enabled;
            toggle.onchange = () => {
                ext.enabled = toggle.checked;
                saveExtensions();
                renderExtensions();
            };

            const name = document.createElement('span');
            name.style.fontWeight = 'bold';
            name.textContent = `${ext.name} v${ext.version}`;

            nameContainer.appendChild(toggle);
            nameContainer.appendChild(name);

            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Remove';
            removeBtn.style.fontSize = '0.6rem';
            removeBtn.onclick = () => {
                installedExtensions.splice(index, 1);
                saveExtensions();
                renderExtensions();
            };

            header.appendChild(nameContainer);
            header.appendChild(removeBtn);

            const desc = document.createElement('span');
            desc.style.fontSize = '0.7rem';
            desc.style.color = '#444';
            desc.textContent = ext.description || 'No description provided.';

            item.appendChild(header);
            item.appendChild(desc);
            listContainer.appendChild(item);
        });
    }

    async function processFiles(files) {
        let manifestFile = null;
        let scripts = {};

        for (const file of files) {
            if (file.name === 'manifest.json') {
                manifestFile = file;
            } else if (file.name.endsWith('.js')) {
                const content = await file.text();
                scripts[file.name] = content;
            }
        }

        if (!manifestFile) {
            alert("Missing manifest.json in the folder.");
            return;
        }

        try {
            const manifestText = await manifestFile.text();
            const manifest = JSON.parse(manifestText);
            if (!manifest.name || !manifest.version) {
                alert("Invalid manifest.json: Missing name or version.");
                return;
            }

            installedExtensions.push({
                id: Date.now() + Math.random().toString(36).substr(2, 9),
                name: manifest.name,
                version: manifest.version,
                description: manifest.description,
                enabled: true,
                manifest: manifest,
                scripts: scripts
            });
            saveExtensions();
            renderExtensions();
        } catch (err) {
            alert("Error parsing manifest.json: " + err.message);
        }
    }

    uploadFolderBtn.onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.onchange = (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;
            processFiles(files);
        };
        input.click();
    };

    uploadJsonBtn.onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            processFiles([file]);
        };
        input.click();
    };

    renderExtensions();
}

function initChat(windowElement) {
    const messages = windowElement.querySelector('#chat-messages');
    const input = windowElement.querySelector('#chat-input');
    const sendBtn = windowElement.querySelector('#chat-send');

    if (!messages || !input || !sendBtn) return;

    function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        const msgDiv = document.createElement('div');
        msgDiv.style.marginBottom = '5px';
        msgDiv.innerHTML = `<b>You:</b> ${text}`;
        messages.appendChild(msgDiv);
        messages.scrollTop = messages.scrollHeight;
        input.value = '';

        // Mock response
        setTimeout(() => {
            const replyDiv = document.createElement('div');
            replyDiv.style.marginBottom = '5px';
            replyDiv.style.color = '#008B47';
            replyDiv.innerHTML = `<b>SprootBot:</b> That's interesting! Tell me more about "${text}".`;
            messages.appendChild(replyDiv);
            messages.scrollTop = messages.scrollHeight;
        }, 1000);
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}

function initNotepad(windowElement) {
    const textarea = windowElement.querySelector('.notepad-textarea');
    const newBtn = document.getElementById('notepad-new');
    const openBtn = document.getElementById('notepad-open');
    const saveBtn = document.getElementById('notepad-save');
    const exitBtn = document.getElementById('notepad-exit');

    if (newBtn) {
        newBtn.onclick = () => {
            if (textarea.value && !confirm("Discard changes?")) return;
            textarea.value = '';
        };
    }
    if (openBtn) {
        openBtn.onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.txt';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                    textarea.value = event.target.result;
                };
                reader.readAsText(file);
            };
            input.click();
        };
    }
    if (saveBtn) {
        saveBtn.onclick = () => {
            const blob = new Blob([textarea.value], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'note.txt';
            a.click();
            URL.revokeObjectURL(url);
        };
    }
    if (exitBtn) {
        exitBtn.onclick = () => closeApp('notepad');
    }
}

function initTaskManager(windowElement) {
    const taskList = windowElement.querySelector('#task-list');
    
    function updateTaskList() {
        if (!taskList) return;
        taskList.innerHTML = '';
        openApps.forEach((data, appName) => {
            const item = document.createElement('div');
            item.style.padding = '5px';
            item.style.borderBottom = '1px solid #eee';
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.alignItems = 'center';
            item.style.fontSize = '0.8rem';
            
            const name = document.createElement('span');
            name.textContent = appName;
            
            const endBtn = document.createElement('button');
            endBtn.textContent = 'End Task';
            endBtn.style.fontSize = '0.7rem';
            endBtn.onclick = () => {
                closeApp(appName);
                updateTaskList();
            };
            
            item.appendChild(name);
            item.appendChild(endBtn);
            taskList.appendChild(item);
        });
    }
    
    updateTaskList();
    // Update every 2 seconds if open
    const interval = setInterval(() => {
        if (windowElement.style.display === 'none') {
            clearInterval(interval);
            return;
        }
        updateTaskList();
    }, 2000);
}

function initCasino(windowElement) {
    const spinBtn = windowElement.querySelector('#casino-spin');
    const balanceEl = windowElement.querySelector('#casino-balance');
    const resultEl = windowElement.querySelector('#casino-result');
    const slots = [
        windowElement.querySelector('#slot-1'),
        windowElement.querySelector('#slot-2'),
        windowElement.querySelector('#slot-3')
    ];
    
    const symbols = ['🍒', '🍋', '🔔', '💎', '7️⃣'];
    let balance = 100;

    spinBtn.onclick = () => {
        if (balance < 10) {
            resultEl.textContent = "Not enough money!";
            return;
        }

        balance -= 10;
        balanceEl.textContent = balance;
        resultEl.textContent = "Spinning...";
        spinBtn.disabled = true;

        let spins = 0;
        const spinInterval = setInterval(() => {
            slots.forEach(slot => {
                slot.textContent = symbols[Math.floor(Math.random() * symbols.length)];
            });
            spins++;
            if (spins > 10) {
                clearInterval(spinInterval);
                const final = slots.map(() => symbols[Math.floor(Math.random() * symbols.length)]);
                slots.forEach((slot, i) => slot.textContent = final[i]);
                
                if (final[0] === final[1] && final[1] === final[2]) {
                    let win = 50;
                    if (final[0] === '7️⃣') win = 200;
                    else if (final[0] === '💎') win = 100;
                    balance += win;
                    resultEl.textContent = `JACKPOT! You won $${win}!`;
                } else if (final[0] === final[1] || final[1] === final[2] || final[0] === final[2]) {
                    balance += 15;
                    resultEl.textContent = "Small win! You won $15!";
                } else {
                    resultEl.textContent = "Try again!";
                }
                balanceEl.textContent = balance;
                spinBtn.disabled = false;
            }
        }, 100);
    };
}

function initPinball(windowElement) {
    const canvas = windowElement.querySelector('#pinball-canvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = windowElement.querySelector('#pinball-score');
    const highscoreEl = windowElement.querySelector('#pinball-highscore');
    const startBtn = windowElement.querySelector('#pinball-start');

    let score = 0;
    let highscore = localStorage.getItem('sproot95_pinball_highscore') || 0;
    highscoreEl.textContent = highscore;

    let gameRunning = false;
    let gameOver = false;
    let ball = { x: 360, y: 480, dx: 0, dy: 0, radius: 8, gravity: 0.15, friction: 0.995 };
    
    const flipperWidth = 80;
    const flipperHeight = 14;
    const leftFlipper = { x: 90, y: 450, angle: 0.5, targetAngle: 0.5, pivotX: 90, pivotY: 450 };
    const rightFlipper = { x: 260, y: 450, angle: -0.5, targetAngle: -0.5, pivotX: 260, pivotY: 450 };

    const bumpers = [
        { x: 100, y: 100, r: 25, color: '#ff0055', score: 100, active: 0 },
        { x: 250, y: 100, r: 25, color: '#00ff55', score: 100, active: 0 },
        { x: 175, y: 180, r: 30, color: '#00aaff', score: 200, active: 0 },
        { x: 50, y: 250, r: 15, color: '#ffff00', score: 50, active: 0 },
        { x: 300, y: 250, r: 15, color: '#ffff00', score: 50, active: 0 }
    ];

    const walls = [
        { x1: 0, y1: 0, x2: 380, y2: 0 }, // Top
        { x1: 0, y1: 0, x2: 0, y2: 500 }, // Left
        { x1: 380, y1: 0, x2: 380, y2: 500 }, // Right
        { x1: 340, y1: 100, x2: 340, y2: 500 }, // Launcher lane wall
        { x1: 0, y1: 400, x2: 80, y2: 460 }, // Left drain slope
        { x1: 340, y1: 400, x2: 270, y2: 460 } // Right drain slope
    ];

    let lastTime = 0;

    function drawFlipper(f, isLeft) {
        ctx.save();
        ctx.translate(f.pivotX, f.pivotY);
        ctx.rotate(f.angle);
        
        // Flipper body
        ctx.beginPath();
        const x = isLeft ? 0 : -flipperWidth;
        ctx.roundRect(x, -flipperHeight/2, flipperWidth, flipperHeight, 7);
        ctx.fillStyle = "#c0c0c0";
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Pivot point
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fillStyle = "black";
        ctx.fill();
        
        ctx.restore();
    }

    function update(dt) {
        if (!gameRunning) return;

        // Gravity and friction adjusted for dt (dt is in ms, assuming 60fps target)
        const dtScale = dt / 16.67;
        
        ball.dy += ball.gravity * dtScale;
        ball.dx *= Math.pow(ball.friction, dtScale);
        ball.dy *= Math.pow(ball.friction, dtScale);

        ball.x += ball.dx * dtScale;
        ball.y += ball.dy * dtScale;

        // Wall collisions (simple circle-line)
        walls.forEach(w => {
            const dx = w.x2 - w.x1;
            const dy = w.y2 - w.y1;
            const lenSq = dx*dx + dy*dy;
            const t = Math.max(0, Math.min(1, ((ball.x - w.x1) * dx + (ball.y - w.y1) * dy) / lenSq));
            const projX = w.x1 + t * dx;
            const projY = w.y1 + t * dy;
            const dist = Math.sqrt((ball.x - projX)**2 + (ball.y - projY)**2);

            if (dist < ball.radius) {
                const normalX = (ball.x - projX) / dist;
                const normalY = (ball.y - projY) / dist;
                
                // Reflect velocity
                const dot = ball.dx * normalX + ball.dy * normalY;
                ball.dx = (ball.dx - 2 * dot * normalX) * 0.8;
                ball.dy = (ball.dy - 2 * dot * normalY) * 0.8;
                
                // Reposition ball
                ball.x = projX + normalX * ball.radius;
                ball.y = projY + normalY * ball.radius;
            }
        });

        // Flipper logic
        leftFlipper.angle += (leftFlipper.targetAngle - leftFlipper.angle) * 0.4 * dtScale;
        rightFlipper.angle += (rightFlipper.targetAngle - rightFlipper.angle) * 0.4 * dtScale;

        // Flipper collision
        function checkFlipperCollision(f, isLeft) {
            const dx = ball.x - f.pivotX;
            const dy = ball.y - f.pivotY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < flipperWidth + ball.radius) {
                const relX = dx * Math.cos(-f.angle) - dy * Math.sin(-f.angle);
                const relY = dx * Math.sin(-f.angle) + dy * Math.cos(-f.angle);
                
                const minX = isLeft ? 0 : -flipperWidth;
                const maxX = isLeft ? flipperWidth : 0;
                
                if (relX > minX - ball.radius && relX < maxX + ball.radius && 
                    relY > -flipperHeight/2 - ball.radius && relY < flipperHeight/2 + ball.radius) {
                    
                    const speed = Math.sqrt(ball.dx*ball.dx + ball.dy*ball.dy);
                    const bounceAngle = f.angle - Math.PI/2;
                    const boost = Math.abs(f.targetAngle - f.angle) > 0.05 ? 6 : 1;
                    
                    ball.dx = Math.cos(bounceAngle) * (speed + boost);
                    ball.dy = Math.sin(bounceAngle) * (speed + boost);
                    ball.y -= 5 * dtScale; // Prevent sticking
                    
                    score += 10;
                    scoreEl.textContent = score;
                }
            }
        }

        checkFlipperCollision(leftFlipper, true);
        checkFlipperCollision(rightFlipper, false);

        // Bumper collisions
        bumpers.forEach(b => {
            const dx = ball.x - b.x;
            const dy = ball.y - b.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < ball.radius + b.r) {
                const angle = Math.atan2(dy, dx);
                const speed = Math.sqrt(ball.dx*ball.dx + ball.dy*ball.dy) + 3;
                ball.dx = Math.cos(angle) * speed;
                ball.dy = Math.sin(angle) * speed;
                
                score += b.score;
                scoreEl.textContent = score;
                b.active = 10;
            }
        });

        // Out of bounds (Drain)
        if (ball.y > canvas.height + ball.radius) {
            gameRunning = false;
            gameOver = true;
            if (score > highscore) {
                highscore = score;
                highscoreEl.textContent = highscore;
                localStorage.setItem('sproot95_pinball_highscore', highscore);
            }
        }
    }

    function draw(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const dt = timestamp - lastTime;
        lastTime = timestamp;

        ctx.fillStyle = "#111";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw walls
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 4;
        walls.forEach(w => {
            ctx.beginPath();
            ctx.moveTo(w.x1, w.y1);
            ctx.lineTo(w.x2, w.y2);
            ctx.stroke();
        });

        // Draw bumpers
        bumpers.forEach(b => {
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r + (b.active > 0 ? 2 : 0), 0, Math.PI * 2);
            ctx.fillStyle = b.color;
            ctx.fill();
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2;
            ctx.stroke();
            if (b.active > 0) b.active--;
        });

        // Draw flippers
        drawFlipper(leftFlipper, true);
        drawFlipper(rightFlipper, false);

        // Draw ball
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#ddd";
        ctx.shadowBlur = 15;
        ctx.shadowColor = "white";
        ctx.fill();
        ctx.shadowBlur = 0;

        if (gameOver) {
            ctx.fillStyle = "rgba(0,0,0,0.8)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "white";
            ctx.font = "bold 32px 'Courier New'";
            ctx.textAlign = "center";
            ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2 - 20);
            ctx.font = "20px 'Courier New'";
            ctx.fillText("Score: " + score, canvas.width/2, canvas.height/2 + 30);
            ctx.font = "14px 'Courier New'";
            ctx.fillText("Press Start to play again", canvas.width/2, canvas.height/2 + 60);
        }

        update(dt);
        if (gameRunning || gameOver) {
            requestAnimationFrame(draw);
        }
    }

    startBtn.onclick = () => {
        // Launch ball from plunger lane with more force
        ball = { x: 360, y: 480, dx: 0, dy: -18, radius: 8, gravity: 0.15, friction: 0.995 };
        score = 0;
        scoreEl.textContent = score;
        gameRunning = true;
        gameOver = false;
        lastTime = 0;
        requestAnimationFrame(draw);
    };

    const handleKeyDown = (e) => {
        if (windowElement !== activeWindow) return;
        if (e.key === 'ArrowLeft') leftFlipper.targetAngle = -0.6;
        if (e.key === 'ArrowRight') rightFlipper.targetAngle = 0.6;
    };

    const handleKeyUp = (e) => {
        if (windowElement !== activeWindow) return;
        if (e.key === 'ArrowLeft') leftFlipper.targetAngle = 0.5;
        if (e.key === 'ArrowRight') rightFlipper.targetAngle = -0.5;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Initial draw
    draw();

    // Return cleanup function
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        gameRunning = false;
    };
}

function initSprootCode(windowElement) {
    const editor = windowElement.querySelector('#code-editor');
    const preview = windowElement.querySelector('#code-preview');

    if (!editor || !preview) return;

    function updatePreview() {
        const content = editor.value;
        const doc = preview.contentDocument || preview.contentWindow.document;
        doc.open();
        doc.write(content);
        doc.close();
    }

    editor.addEventListener('input', updatePreview);

    // Initial content
    editor.value = `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: sans-serif; text-align: center; padding-top: 50px; }
        h1 { color: #008080; }
    </style>
</head>
<body>
    <h1>Hello Sproot!</h1>
    <p>Type some HTML on the left to see it here.</p>
</body>
</html>`;
    updatePreview();
}


