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
            case 'casino': iconSrc = 'https://win98icons.alexmeub.com/icons/png/cards-0.png'; title = 'SprootCasino'; break;
            case 'pinball': iconSrc = 'https://win98icons.alexmeub.com/icons/png/pinball-0.png'; title = 'SprootPinball'; break;
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
    openApps.set(appName, { windowEl: windowElement, taskbarButton: taskbarButton });
    taskbarButton.classList.add('active');

    // Initialize specific applications
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
        initChat(windowElement);
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
        initPinball(windowElement);
    }
}

/** Closes an application window */
function closeApp(appName) {
    const appData = openApps.get(appName);
    if (!appData) return;

    const { windowEl, taskbarButton } = appData;

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
    const iframe = windowElement.querySelector('#browser-frame');
    const loading = windowElement.querySelector('.browser-loading');

    if (!addressBar || !goButton || !iframe || !loading) return;

    function loadUrl() {
        let url = addressBar.value.trim();
        if (!url) return;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        loading.style.display = 'flex';
        iframe.src = url;
        iframe.onload = () => {
            loading.style.display = 'none';
        };
    }

    goButton.addEventListener('click', loadUrl);
    addressBar.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadUrl();
    });
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

    if (applyBgBtn && bgInput) {
        applyBgBtn.addEventListener('click', () => {
            const url = bgInput.value.trim();
            if (url) {
                document.body.style.backgroundImage = `url('${url}')`;
                document.body.style.backgroundColor = 'transparent';
            }
        });
    }

    if (themeColorInput) {
        themeColorInput.addEventListener('input', (e) => {
            const color = e.target.value;
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
        });
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
    let highscore = 0;
    let gameRunning = false;
    let ball = { x: 200, y: 400, dx: 2, dy: -4, radius: 8 };
    let paddleWidth = 80;
    let leftPaddle = { x: 50, y: 450, width: paddleWidth, height: 10, active: false };
    let rightPaddle = { x: 250, y: 450, width: paddleWidth, height: 10, active: false };
    let bumpers = [
        { x: 100, y: 100, r: 20, color: 'red' },
        { x: 280, y: 100, r: 20, color: 'blue' },
        { x: 190, y: 200, r: 25, color: 'green' }
    ];

    function draw() {
        if (!gameRunning) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw ball
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();
        ctx.closePath();

        // Draw paddles
        ctx.fillStyle = leftPaddle.active ? "cyan" : "gray";
        ctx.fillRect(leftPaddle.x, leftPaddle.y, leftPaddle.width, leftPaddle.height);
        ctx.fillStyle = rightPaddle.active ? "cyan" : "gray";
        ctx.fillRect(rightPaddle.x, rightPaddle.y, rightPaddle.width, rightPaddle.height);

        // Draw bumpers
        bumpers.forEach(b => {
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fillStyle = b.color;
            ctx.fill();
            ctx.closePath();
        });

        // Physics
        ball.x += ball.dx;
        ball.y += ball.dy;

        // Walls
        if (ball.x + ball.dx > canvas.width - ball.radius || ball.x + ball.dx < ball.radius) {
            ball.dx = -ball.dx;
        }
        if (ball.y + ball.dy < ball.radius) {
            ball.dy = -ball.dy;
        } else if (ball.y + ball.dy > canvas.height - ball.radius) {
            // Game over
            gameRunning = false;
            if (score > highscore) {
                highscore = score;
                highscoreEl.textContent = highscore;
            }
            alert("Game Over! Score: " + score);
            return;
        }

        // Paddle collision
        if (ball.y + ball.dy > leftPaddle.y && ball.y + ball.dy < leftPaddle.y + leftPaddle.height) {
            if (ball.x > leftPaddle.x && ball.x < leftPaddle.x + leftPaddle.width) {
                ball.dy = -Math.abs(ball.dy);
                if (leftPaddle.active) ball.dy -= 1;
                score += 10;
                scoreEl.textContent = score;
            }
        }
        if (ball.y + ball.dy > rightPaddle.y && ball.y + ball.dy < rightPaddle.y + rightPaddle.height) {
            if (ball.x > rightPaddle.x && ball.x < rightPaddle.x + rightPaddle.width) {
                ball.dy = -Math.abs(ball.dy);
                if (rightPaddle.active) ball.dy -= 1;
                score += 10;
                scoreEl.textContent = score;
            }
        }

        // Bumper collision
        bumpers.forEach(b => {
            let dist = Math.sqrt((ball.x - b.x) ** 2 + (ball.y - b.y) ** 2);
            if (dist < ball.radius + b.r) {
                ball.dx = (ball.x - b.x) / 5;
                ball.dy = (ball.y - b.y) / 5;
                score += 50;
                scoreEl.textContent = score;
            }
        });

        requestAnimationFrame(draw);
    }

    startBtn.onclick = () => {
        ball = { x: 200, y: 100, dx: 2, dy: 4, radius: 8 };
        score = 0;
        scoreEl.textContent = score;
        gameRunning = true;
        draw();
    };

    window.addEventListener('keydown', (e) => {
        if (windowElement !== activeWindow) return;
        if (e.key === 'ArrowLeft') leftPaddle.active = true;
        if (e.key === 'ArrowRight') rightPaddle.active = true;
    });
    window.addEventListener('keyup', (e) => {
        if (windowElement !== activeWindow) return;
        if (e.key === 'ArrowLeft') leftPaddle.active = false;
        if (e.key === 'ArrowRight') rightPaddle.active = false;
    });
}


