// Diamond Slide - V12.39 - New header layout (O) - # format, centered buttons, forfeit=loss for forfeiter, fixed spectator issue
    // In-game message box utility
    const gameMessageBox = document.getElementById('game-message-box');
    function showGameMessage(msg, type = 'error', timeout = 3500) {
        if (!gameMessageBox) return;
        gameMessageBox.textContent = msg;
        gameMessageBox.className = 'game-message-box ' + (type || 'error');
        gameMessageBox.style.display = 'block';
        gameMessageBox.style.opacity = '1';
        if (timeout > 0) {
            setTimeout(() => {
                gameMessageBox.style.opacity = '0';
                setTimeout(() => { gameMessageBox.style.display = 'none'; }, 400);
            }, timeout);
        }
    }
document.addEventListener('DOMContentLoaded', () => {
    // Detect mode from URL
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode') || 'online';
    const apiKey = params.get('apiKey') || null;
    let isComputerGame = (mode === 'computer');
    let isLocalGame = (mode === 'local');
    const BOARD_SIZE = 6;
    const EMPTY = null;
    const PLAYER_COLORS = ['orange', 'blue'];
    let CONNECT_N = parseInt(params.get('connectN')) || 4;
    // Clamp CONNECT_N to 4, 5, or 6 for safety
    if (![4,5,6].includes(CONNECT_N)) CONNECT_N = 4;

    let board = [];
    let currentPlayer = 0;
    let activeSelectorIndex = 0;
    let gameOver = false;
    let pushedOffPieces = { pieces: [] }; // Array to track actual colors that fell off
    let moveInProgress = false;
    let myPlayerRole = null; // 'p1' or 'p2'
    // Turn timer (seconds)
    let turnTimerSeconds = 45;
    let turnTimerRemaining = 0;
    let turnTimerInterval = null;

    const boardArea = document.getElementById('board-area');
    const gameBoard = document.getElementById('game-board');
    const gameStatusDiv = document.getElementById('game-status');
    const turnIndicator = document.getElementById('turn-indicator');
    const turnIndicatorContainer = document.getElementById('turn-indicator-container');
    const turnText = document.getElementById('turn-text');
    const roomNameSpan = document.getElementById('room-name');
    const winConditionDiv = document.getElementById('win-condition');
    const watchersCount = document.getElementById('watchers-count');

    // Player Box Elements
    const p1_score = document.getElementById('p1-score');
    const p2_score = document.getElementById('p2-score');
    const p1_forfeitBtn = document.getElementById('p1-forfeit');
    const p2_forfeitBtn = document.getElementById('p2-forfeit');
    const forfeitBtnMain = document.getElementById('forfeit-btn');
    const lobbyBtnMain = document.getElementById('lobby-btn-main');
    const helpBtnGame = document.getElementById('helpBtnGame');
    const pauseBtn = document.getElementById('pause-game');

    const newGameBtn = document.getElementById('new-game');

    const youAreEl = document.getElementById('you-are');
    const youAreColorEl = document.getElementById('you-are-color');
    const youAreDot = document.getElementById('you-are-dot');
    const turnTimerEl = document.getElementById('turn-timer');

    // AI Move elements
    const getAiMoveBtn = document.getElementById('get-ai-move');
    const aiMoveSection = document.getElementById('ai-move-section');
    const aiResponseTextarea = document.getElementById('ai-response-textarea');
    const applyAiMoveBtn = document.getElementById('apply-ai-move');

// Sound elements
const soundChipDrop = document.getElementById('sound-chip-drop');
const soundChipPush = document.getElementById('sound-chip-push');
const soundChipFall = document.getElementById('sound-chip-fall');
const soundWin = document.getElementById('sound-win');

// Audio unlock for browser autoplay policy
let audioUnlocked = false;
function unlockAudio() {
    if (audioUnlocked) return;

    console.log("Attempting to unlock audio...");
    // Create a silent audio context to unlock audio
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const buffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();

    // Play each sound briefly to unlock them
    [soundChipDrop, soundChipPush, soundChipFall, soundWin].forEach(sound => {
        if (sound) {
            sound.volume = 0.01;
            sound.play().then(() => {
                sound.pause();
                sound.currentTime = 0;
                sound.volume = 1;
                console.log("Sound unlocked:", sound.src);
            }).catch((e) => {
                console.log("Failed to unlock sound:", sound.src, e);
            });
        }
    });

    audioUnlocked = true;
    console.log("Audio unlock process completed");
}

// Add user interaction listeners to unlock audio
document.addEventListener('click', unlockAudio, { once: true });
document.addEventListener('keydown', unlockAudio, { once: true });
document.addEventListener('touchstart', unlockAudio, { once: true });

function playSound(soundElement) {
    if (!audioUnlocked) {
        console.log("Audio not unlocked yet, unlocking...");
        unlockAudio();
    }

    if (soundElement) {
        console.log("Playing sound:", soundElement.src);
        soundElement.currentTime = 0;
        const playPromise = soundElement.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log("Sound played successfully:", soundElement.src);
            }).catch(e => {
                console.log("Sound play failed:", e);
                console.log("Sound element:", soundElement);
                console.log("Sound src:", soundElement.src);
                console.log("Sound readyState:", soundElement.readyState);
                console.log("Sound error:", soundElement.error);
            });
        }
    } else {
        console.log("Sound element is null");
    }
}    // Test sound function - call this after user interaction
    function testSounds() {
        console.log("Testing sounds...");
        console.log("soundChipDrop:", soundChipDrop);
        console.log("soundChipPush:", soundChipPush);
        console.log("soundChipFall:", soundChipFall);
        console.log("soundWin:", soundWin);

        if (soundChipDrop) {
            console.log("Chip drop src:", soundChipDrop.src);
            playSound(soundChipDrop);
        }
    }

    function updateWatchersDisplay(watchers) {
        if (watchersCount) {
            const count = watchers ? watchers.length : 0;
            watchersCount.textContent = `Watchers: ${count}`;
            if (count > 0) {
                const names = watchers.map(w => w.name).join(', ');
                watchersCount.title = `Watching: ${names}`;
            } else {
                watchersCount.title = '';
            }
        }
    }

    function createEmptyBoard() {
        board = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            board.push(Array(BOARD_SIZE).fill(EMPTY));
        }
        pushedOffPieces = { pieces: [] };
        moveInProgress = false;
    }

    function getSelectorInfo(globalIndex) {
        if (globalIndex < BOARD_SIZE) {
            return { side: 'top-left', index: globalIndex };
        } else {
            return { side: 'top-right', index: globalIndex - BOARD_SIZE };
        }
    }

    function render() {
        renderBoard();
        renderSelectors();
        renderPushedOffCounter();
        updateStatus();
    }

    function importTurnFileFromObject(game) {
        if (!game || !game.board) return false;
        board = game.board;
        currentPlayer = game.currentPlayer || 0;
    // Use server-provided connectN when available (fallback to legacy key)
    CONNECT_N = (typeof game.connectN !== 'undefined' ? game.connectN : game.CONNECT_N) || 4;
    if (![4,5,6].includes(CONNECT_N)) CONNECT_N = 4;
        pushedOffPieces = game.pushedOffPieces || { pieces: [] };
        gameOver = game.status === 'finished';
        moveInProgress = false;
        serverTurnNumber = game.turnNumber || 0;

        // V12.36 - Status display removed; scores only; watchers and player-role detection restored

        // Update watchers display
        updateWatchersDisplay(game.watchers || []);

        // Display room name if available
        if (roomNameSpan) roomNameSpan.textContent = game.name ? `Room: ${game.name}` : '';

        // Determine player role based on secret matching
        const playerSecret = localStorage.getItem(`game_${currentServerGameId}_secret`);
        if (playerSecret) {
            // Match stored secret against server's p1_secret and p2_secret
            if (game.p1_secret && playerSecret === game.p1_secret) {
                myPlayerRole = 'p1';
            } else if (game.p2_secret && playerSecret === game.p2_secret) {
                myPlayerRole = 'p2';
            }
        }

        // Update "You are" display based on detected role
        if (youAreColorEl) {
            if (myPlayerRole === 'p1') {
                youAreColorEl.textContent = 'Orange';
                youAreColorEl.style.color = '#ff9900'; // Orange
            } else if (myPlayerRole === 'p2') {
                youAreColorEl.textContent = 'Blue';
                youAreColorEl.style.color = '#66aaff'; // Blue
            } else {
                youAreColorEl.textContent = 'Spectator';
                youAreColorEl.style.color = '#cccccc'; // Gray
            }
        }

        // Update score display (minimal format)
        if (game.score) {
            p1_score.textContent = `${game.score.orange || 0}`;
            p2_score.textContent = `${game.score.blue || 0}`;
        }

        render();
        if (gameOver) {
            // If game is finished, show winner message from server
            const winner = game.winner;
            if (winner === 'p1' || winner === 'orange') {
                gameStatusDiv.innerHTML = `<span class="player-circle orange"></span> Orange Wins!`;
            } else if (winner === 'p2' || winner === 'blue') {
                gameStatusDiv.innerHTML = `<span class="player-circle blue"></span> Blue Wins!`;
            } else {
                gameStatusDiv.textContent = "Round Over! It's a draw!";
            }
            gameStatusDiv.style.color = '#33ff57';
        }
        return true;
    }

    // --- Server-backed lobby functions ---
    let serverPollInterval = null;
    let currentServerGameId = null;
    let serverUrl = null;
    let serverTurnNumber = 0;

    function startServerPolling() {
        if (!serverUrl || !currentServerGameId) return;
        if (serverPollInterval) clearInterval(serverPollInterval);
        serverPollInterval = setInterval(() => {
            fetch(`${serverUrl}?action=get&id=${encodeURIComponent(currentServerGameId)}`)
                .then(r=>r.json())
                .then(j => {
                    if (j.ok && j.game) {
                        importTurnFileFromObject(j.game);
                        render(); // Always redraw board after each poll
                    }
                }).catch(() => {});
    }, 1000);
    }

    function stopServerPolling() { if (serverPollInterval) clearInterval(serverPollInterval); serverPollInterval = null; }

    function postMoveToServer() {
        if (!currentServerGameId || !serverUrl) return;
        const playerSecret = localStorage.getItem(`game_${currentServerGameId}_secret`);
        if (!playerSecret) {
            console.error("Cannot make move: player secret not found.");
            return;
        }

        // Determine playerId from our role
        const playerId = myPlayerRole; // This should be 'p1' or 'p2'
        if (!playerId) {
            console.error("Cannot make move: player role not determined.");
            return;
        }

        const payload = {
            action: 'move',
            id: currentServerGameId,
            turnNumber: serverTurnNumber,
            board: board,
            pushedOffPieces: pushedOffPieces,
            playerId: playerId,
            currentPlayer: currentPlayer,
            playerSecret: playerSecret
        };
        fetch(serverUrl, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
            .then(r=>r.json()).then(j=>{
                if (!j.ok) {
                    if (j.error === 'stale_turn' && j.game) {
                        importTurnFileFromObject(j.game);
                        showGameMessage('The other player made a move while you were thinking! The board has been updated.', 'warning');
                    } else {
                        showGameMessage('Move rejected: ' + (j.error||'Unknown error'), 'error');
                    }
                } else {
                    serverTurnNumber = j.game.turnNumber;
                }
            }).catch(()=>{});
    }

    function reportWinToServer(winnerPlayer) {
        if (!currentServerGameId || !serverUrl) return;
        const playerSecret = localStorage.getItem(`game_${currentServerGameId}_secret`);
        const payload = {
            action: 'report_win',
            id: currentServerGameId,
            winner: winnerPlayer, // 'p1' or 'p2'
            playerSecret: playerSecret
        };
        fetch(serverUrl, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
        .then(r => r.json())
        .then(j => {
            if (j.ok && j.game) {
                importTurnFileFromObject(j.game); // Update with final state
            } else {
                showGameMessage('Error reporting win: ' + (j.error || 'Unknown error'), 'error');
            }
        });
    }

    function renderBoard() {
        gameBoard.innerHTML = '';
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const slotDiv = document.createElement('div');
                slotDiv.className = 'slot';
                slotDiv.setAttribute('data-row', r);
                slotDiv.setAttribute('data-col', c);
                if (board[r][c] !== EMPTY) {
                    slotDiv.classList.add(board[r][c]);
                }
                gameBoard.appendChild(slotDiv);
            }
        }
    }

    function addMarqueeEffect() {
        // Add marquee animation to a random row
        const randomRow = Math.floor(Math.random() * BOARD_SIZE);
        const rowSlots = gameBoard.querySelectorAll(`[data-row="${randomRow}"]`);

        rowSlots.forEach(slot => {
            slot.classList.add('board-row-marquee');
            // Remove the class after animation completes
            setTimeout(() => {
                slot.classList.remove('board-row-marquee');
            }, 8000);
        });
    }

    function addWinningPieceAnimations(winnerColor) {
        // Find all pieces of the winning color and add animation
        const winningPieces = gameBoard.querySelectorAll(`.${winnerColor}`);
        winningPieces.forEach(piece => {
            piece.classList.add('winning-piece');
        });

        // Remove animations after 5 seconds
        setTimeout(() => {
            winningPieces.forEach(piece => {
                piece.classList.remove('winning-piece');
            });
        }, 5000);
    }

    function addMarqueeCelebration() {
        // Add celebration animation to all top selectors (0-5)
        for (let i = 0; i < 6; i++) {
            const selector = document.querySelector(`.selector[data-selector="${i}"]`);
            if (selector) {
                selector.classList.add('celebration-marquee');
            }
        }

        // Remove celebration after 5 seconds
        setTimeout(() => {
            for (let i = 0; i < 6; i++) {
                const selector = document.querySelector(`.selector[data-selector="${i}"]`);
                if (selector) {
                    selector.classList.remove('celebration-marquee');
                }
            }
        }, 5000);
    }

    function renderPushedOffCounter() {
        const existingCounters = boardArea.querySelectorAll('.pushed-off-counter');
        existingCounters.forEach(counter => counter.remove());

        // Single alternating counter (bottom center)
        const counter = document.createElement('div');
        counter.className = 'pushed-off-counter';
        counter.style.position = 'absolute';
        counter.style.bottom = '5px';
        counter.style.left = '50%';
        counter.style.transform = 'translateX(-50%)';
        counter.style.display = 'flex';
        counter.style.gap = '2px';

        for (let i = 0; i < pushedOffPieces.pieces.length; i++) {
            const piece = document.createElement('div');
            // Use the actual color that fell off
            piece.className = `mini-piece ${pushedOffPieces.pieces[i]}`;
            counter.appendChild(piece);
        }
        boardArea.appendChild(counter);
    }

    // Version 12.8 - Drop zones positioned as 7th row/column in diamond grid
    function renderSelectors() {
        const existingSelectors = boardArea.querySelectorAll('.selector');
        existingSelectors.forEach(sel => sel.remove());

        if (gameOver) return;

        const total = BOARD_SIZE * 2;
        for (let i = 0; i < total; i++) {
            const selector = document.createElement('div');
            selector.className = 'selector';
            const { side, index } = getSelectorInfo(i);

            const angle = -45 * (Math.PI / 180);
            const slotSize = 49;
            const boardCenterOffset = (BOARD_SIZE - 1) * slotSize / 2;

            let unrotatedX, unrotatedY;
            if (side === 'top-left') {
                // Move 0-5 to where 6-11 was (top-right edge)
                unrotatedX = boardCenterOffset + (slotSize);
                unrotatedY = (index * slotSize) - boardCenterOffset - 15; // Added 15px padding
            } else {
                // Move 6-11 to where 0-5 was (top-left edge), but reversed
                const reversedIndex = BOARD_SIZE - 1 - index;
                unrotatedX = (reversedIndex * slotSize) - boardCenterOffset;
                unrotatedY = -boardCenterOffset - (slotSize) - 15; // Added 15px padding
            }

            const rotatedX = unrotatedX * Math.cos(angle) - unrotatedY * Math.sin(angle);
            const rotatedY = unrotatedX * Math.sin(angle) + unrotatedY * Math.cos(angle);

            const areaCenter = boardArea.offsetWidth / 2;
            selector.style.left = `calc(${areaCenter}px + ${rotatedX}px - 21px)`;
            selector.style.top = `calc(${areaCenter}px + ${rotatedY}px - 21px)`;

            let allowClick = false;
            if (isLocalGame) {
                // In local games, both players can always click
                allowClick = true;
            } else if (isComputerGame) {
                // In computer games, only allow human player (player 0) to click
                allowClick = (currentPlayer === 0);
            } else {
                // In online games, check if it's the player's turn
                allowClick = (myPlayerRole === (currentPlayer === 0 ? 'p1' : 'p2'));
            }
            if (allowClick) {
                selector.addEventListener('mouseenter', () => {
                    if (gameOver || moveInProgress) return;
                    selector.classList.add('hover', PLAYER_COLORS[currentPlayer]);
                });
                selector.addEventListener('mouseleave', () => {
                    selector.classList.remove('hover', 'orange', 'blue');
                });
                selector.addEventListener('click', () => {
                    if (gameOver || moveInProgress) return;
                    activeSelectorIndex = i;
                    playSound(soundChipDrop);
                    dropChipCustom(side === 'top-right' ? 'right' : 'top', index);
                });
            }

            if (i === activeSelectorIndex) {
                selector.classList.add('active', PLAYER_COLORS[currentPlayer]);
            }

            boardArea.appendChild(selector);
        }
    }

    // Version 12.9 - Custom drop logic for remapped drop zones
    function dropChipCustom(dropSide, dropIndex) {
        if (gameOver || moveInProgress) return;
    // Stop turn timer while move is in progress
    stopTurnTimer();
    moveInProgress = true;
        const player = PLAYER_COLORS[currentPlayer];
        if (dropSide === 'top') {
            slideColumnDown(dropIndex, player);
        } else if (dropSide === 'right') {
            slideRowRight(dropIndex, player);
        } else if (dropSide === 'left') {
            // Drop into the left edge: push into row dropIndex, from the left
            slideRowLeft(dropIndex, player);
        } else if (dropSide === 'bottom') {

            moveInProgress = false;
        }
    }

    // Add slideRowLeft for left-edge drops
    function slideRowLeft(row, newPlayer) {
        // Play push sound if pieces will be moved
        const existingPieces = board[row].filter(cell => cell !== EMPTY).length;
        if (existingPieces > 0) {
            playSound(soundChipPush);
        }

        const pieces = [];
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[row][c] !== EMPTY) pieces.push(board[row][c]);
        }
        pieces.push(newPlayer); // Add to the end (rightmost)
        for (let c = 0; c < BOARD_SIZE; c++) board[row][c] = EMPTY;
        if (pieces.length > BOARD_SIZE) {
            const explodingPiece = pieces[0];
            createOffTheEndAnimation(row, 0, explodingPiece);
            playSound(soundChipFall); // Play fall sound when piece falls off
            pieces.shift();
        }
        for (let i = 0; i < pieces.length; i++) board[row][i] = pieces[i];
        setTimeout(() => {
            moveInProgress = false;
            postMove(newPlayer);
        }, 500);
    }

    function createOffTheEndAnimation(row, col, pieceColor) {
        const slotIndex = row * BOARD_SIZE + col;
        const slotElement = gameBoard.children[slotIndex];

        if (slotElement) {
            // Create a diamond piece that appears off the bottom edge
            const flyingDiamond = document.createElement('div');
            flyingDiamond.className = `falling-diamond ${pieceColor}`;
            flyingDiamond.style.position = 'absolute';
            flyingDiamond.style.zIndex = '100';

            const rect = slotElement.getBoundingClientRect();
            const boardRect = gameBoard.getBoundingClientRect();
            flyingDiamond.style.left = (rect.left - boardRect.left) + 'px';
            flyingDiamond.style.top = (rect.top - boardRect.top + 60) + 'px'; // Draw off the bottom

            gameBoard.appendChild(flyingDiamond);
            playSound(soundChipPush);

            // After half second, flash and fade
            setTimeout(() => {
                flyingDiamond.style.transform = 'scale(1.3) rotate(45deg)';
                flyingDiamond.style.boxShadow = `0 0 20px ${pieceColor === 'orange' ? '#ff9900' : '#4da6ff'}`;
                flyingDiamond.style.transition = 'opacity 0.5s ease-out';
                flyingDiamond.style.opacity = '0';

                setTimeout(() => {
                    if (flyingDiamond.parentNode) {
                        flyingDiamond.parentNode.removeChild(flyingDiamond);
                    }
                }, 500);
            }, 500);
        }
    }

    function dropChip() {
        if (gameOver || moveInProgress) return;
    // Stop turn timer while move is in progress
    stopTurnTimer();
    moveInProgress = true;

        // Test sounds on first user interaction
        if (!window.soundsTested) {
            testSounds();
            window.soundsTested = true;
        }

        const { side, index } = getSelectorInfo(activeSelectorIndex);
        const player = PLAYER_COLORS[currentPlayer];

        if (side === 'top-left') {
            slideColumnDown(index, player);
        } else {
            slideRowRight(index, player);
        }
    }

    function slideColumnDown(col, newPlayer) {
        // Check if position 0 is empty - if so, no cascade needed
        if (board[0][col] === EMPTY) {
            // Simply place the new piece
            board[0][col] = newPlayer;
            flashCell(0, col);

            setTimeout(() => {
                moveInProgress = false;
                postMove(newPlayer);
            }, 300);
            return;
        }

        // Play push sound since pieces will cascade
        playSound(soundChipPush);

        // Position 0 is occupied, need to cascade
        let explodedPiece = null;

        // Check if we'll push something off the bottom
        if (board[BOARD_SIZE - 1][col] !== EMPTY) {
            explodedPiece = board[BOARD_SIZE - 1][col];
            pushedOffPieces.pieces.push(explodedPiece); // Record the actual color
            playSound(soundChipFall); // Play fall sound when piece falls off
        }

        // Execute the cascade with visual feedback
        executeColumnCascade(col, newPlayer, 0, () => {
            // Handle explosion animation
            if (explodedPiece !== null) {
                createOffTheEndAnimation(BOARD_SIZE - 1, col, explodedPiece);
            }

            setTimeout(() => {
                moveInProgress = false;
                postMove(newPlayer);
            }, 300);
        });
    }

    function executeColumnCascade(col, newPlayer, delay, callback) {
        // Find the chain of adjacent pieces starting from position 0
        let piecesToMove = [];

        // Start from position 0 and find consecutive pieces
        for (let r = 0; r < BOARD_SIZE; r++) {
            if (board[r][col] !== EMPTY) {
                // Found a piece, it needs to move down
                piecesToMove.push({fromRow: r, piece: board[r][col], toRow: r + 1});
            } else {
                // Found empty space, stop the chain
                break;
            }
        }

        // Execute moves one by one with visual feedback (from bottom to top to avoid conflicts)
        let moveIndex = piecesToMove.length - 1;
        function executeNextMove() {
            if (moveIndex >= 0) {
                let move = piecesToMove[moveIndex];

                // Clear the original position
                board[move.fromRow][col] = EMPTY;

                // Place in new position (if within bounds)
                if (move.toRow < BOARD_SIZE) {
                    board[move.toRow][col] = move.piece;
                    flashCell(move.toRow, col);
                }
                // If move.toRow >= BOARD_SIZE, piece falls off (already handled in slideColumnDown)

                moveIndex--;
                setTimeout(executeNextMove, 100);
            } else {
                // All pieces moved, now place new piece
                board[0][col] = newPlayer;
                flashCell(0, col);

                setTimeout(callback, 150);
            }
        }

        setTimeout(executeNextMove, delay);
    }



    function flashCell(row, col) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cell) {
            cell.style.backgroundColor = '#ffffff';
            setTimeout(() => {
                cell.style.backgroundColor = '';
            }, 200);
        }
    }

    function slideRowRight(row, newPlayer) {
        // Check if position 0 is empty - if so, no cascade needed
        if (board[row][0] === EMPTY) {
            // Simply place the new piece
            board[row][0] = newPlayer;
            flashCell(row, 0);

            setTimeout(() => {
                moveInProgress = false;
                postMove(newPlayer);
            }, 300);
            return;
        }

        // Play push sound since pieces will cascade
        playSound(soundChipPush);

        // Position 0 is occupied, need to cascade
        let explodedPiece = null;

        // Check if we'll push something off the right
        if (board[row][BOARD_SIZE - 1] !== EMPTY) {
            explodedPiece = board[row][BOARD_SIZE - 1];
            pushedOffPieces.pieces.push(explodedPiece); // Record the actual color
            playSound(soundChipFall); // Play fall sound when piece falls off
        }

        // Execute the cascade with visual feedback
        executeRowCascade(row, newPlayer, 0, () => {
            // Handle explosion animation
            if (explodedPiece !== null) {
                createOffTheEndAnimation(row, BOARD_SIZE - 1, explodedPiece);
            }

            setTimeout(() => {
                moveInProgress = false;
                postMove(newPlayer);
            }, 300);
        });
    }

    function executeRowCascade(row, newPlayer, delay, callback) {
        // Find the chain of adjacent pieces starting from position 0
        let piecesToMove = [];

        // Only push pieces that form a continuous chain from position 0
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[row][c] !== EMPTY) {
                // Found a piece, it needs to move right
                piecesToMove.push({fromCol: c, piece: board[row][c], toCol: c + 1});
            } else {
                // Found empty space, stop the chain - pieces beyond this gap don't move
                break;
            }
        }

        // Execute moves one by one with visual feedback (from right to left to avoid conflicts)
        let moveIndex = piecesToMove.length - 1;
        function executeNextMove() {
            if (moveIndex >= 0) {
                let move = piecesToMove[moveIndex];

                // Clear the original position
                board[row][move.fromCol] = EMPTY;

                // Place in new position (if within bounds)
                if (move.toCol < BOARD_SIZE) {
                    board[row][move.toCol] = move.piece;
                    flashCell(row, move.toCol);
                }
                // If move.toCol >= BOARD_SIZE, piece falls off (already handled in slideRowRight)

                moveIndex--;
                setTimeout(executeNextMove, 100);
            } else {
                // All pieces moved, now place new piece
                console.log(`Placing new piece at row ${row}, col 0`);
                board[row][0] = newPlayer;
                flashCell(row, 0);

                setTimeout(callback, 150);
            }
        }

        setTimeout(executeNextMove, delay);
    }



    function checkWinOnBoard(boardState, player) {
        // Version 12.21 - Supports 4, 5, or 6 in a row
        console.log(`Checking win for player: ${player}, CONNECT_N: ${CONNECT_N}`);

        // Horizontal check - all rows
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c <= BOARD_SIZE - CONNECT_N; c++) {
                let count = 0;
                for (let i = 0; i < CONNECT_N; i++) {
                    if (boardState[r][c + i] === player) count++;
                }
                if (count === CONNECT_N) {
                    console.log(`Horizontal win found at row ${r}, starting col ${c}`);
                    return true;
                }
            }
        }

        // Vertical check - all columns including center diamond column
        for (let c = 0; c < BOARD_SIZE; c++) {
            for (let r = 0; r <= BOARD_SIZE - CONNECT_N; r++) {
                let count = 0;
                for (let i = 0; i < CONNECT_N; i++) {
                    if (boardState[r + i][c] === player) count++;
                }
                if (count === CONNECT_N) {
                    console.log(`Vertical win found at col ${c}, starting row ${r}`);
                    return true;
                }
            }
        }

        // Diagonal (top-left to bottom-right) check
        for (let r = 0; r <= BOARD_SIZE - CONNECT_N; r++) {
            for (let c = 0; c <= BOARD_SIZE - CONNECT_N; c++) {
                let count = 0;
                for (let i = 0; i < CONNECT_N; i++) {
                    if (boardState[r + i][c + i] === player) count++;
                }
                if (count === CONNECT_N) {
                    console.log(`Diagonal \\ win found starting at (${r}, ${c})`);
                    return true;
                }
            }
        }

        // Diagonal (top-right to bottom-left) check
        for (let r = CONNECT_N - 1; r < BOARD_SIZE; r++) {
            for (let c = 0; c <= BOARD_SIZE - CONNECT_N; c++) {
                let count = 0;
                for (let i = 0; i < CONNECT_N; i++) {
                    if (boardState[r - i][c + i] === player) count++;
                }
                if (count === CONNECT_N) {
                    console.log(`Diagonal / win found starting at (${r}, ${c})`);
                    return true;
                }
            }
        }

        // Special diamond center column check (middle column - index 2 in 6x6 grid)
        const centerCol = Math.floor(BOARD_SIZE / 2) - 1; // Column 2 for 6x6 board
        console.log(`Checking diamond center column ${centerCol} for ${CONNECT_N} in a row`);
        for (let r = 0; r <= BOARD_SIZE - CONNECT_N; r++) {
            let count = 0;
            for (let i = 0; i < CONNECT_N; i++) {
                if (boardState[r + i][centerCol] === player) count++;
            }
            if (count === CONNECT_N) {
                console.log(`Diamond center column win found at col ${centerCol}, starting row ${r}`);
                return true;
            }
        }

        // Special diamond center row check (middle row - index 2 in 6x6 grid)
        const centerRow = Math.floor(BOARD_SIZE / 2) - 1; // Row 2 for 6x6 board
        console.log(`Checking diamond center row ${centerRow} for ${CONNECT_N} in a row`);
        for (let c = 0; c <= BOARD_SIZE - CONNECT_N; c++) {
            let count = 0;
            for (let i = 0; i < CONNECT_N; i++) {
                if (boardState[centerRow][c + i] === player) count++;
            }
            if (count === CONNECT_N) {
                console.log(`Diamond center row win found at row ${centerRow}, starting col ${c}`);
                return true;
            }
        }

        // Diamond main diagonal through center (0,0 to 5,5)
        for (let start = 0; start <= BOARD_SIZE - CONNECT_N; start++) {
            let count = 0;
            for (let i = 0; i < CONNECT_N; i++) {
                if (boardState[start + i][start + i] === player) count++;
            }
            if (count === CONNECT_N) {
                console.log(`Main diagonal win found starting at (${start}, ${start})`);
                return true;
            }
        }

        // Diamond anti-diagonal through center (0,5 to 5,0)
        for (let start = CONNECT_N - 1; start < BOARD_SIZE; start++) {
            let count = 0;
            for (let i = 0; i < CONNECT_N; i++) {
                if (boardState[start - i][BOARD_SIZE - 1 - start + i] === player) count++;
            }
            if (count === CONNECT_N) {
                console.log(`Anti-diagonal win found starting at (${start}, ${BOARD_SIZE - 1 - start})`);
                return true;
            }
        }

        return false;
    }

    // Version 12.20 - Added threat detection for 3-in-a-row patterns to make AI more aggressive
    function checkThreatOnBoard(boardState, player, threatLength = 3) {
        console.log(`Checking ${threatLength}-in-a-row threats for player: ${player}`);

        // Horizontal threat check - all rows
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c <= BOARD_SIZE - threatLength; c++) {
                let count = 0;
                let emptyCount = 0;
                let emptyPos = -1;
                for (let i = 0; i < threatLength; i++) {
                    if (boardState[r][c + i] === player) count++;
                    else if (boardState[r][c + i] === EMPTY) {
                        emptyCount++;
                        emptyPos = c + i;
                    }
                }
                if (count === threatLength - 1 && emptyCount === 1) {
                    console.log(`Horizontal threat found at row ${r}, col ${emptyPos}`);
                    return { row: r, col: emptyPos, direction: 'horizontal' };
                }
            }
        }

        // Vertical threat check - all columns
        for (let c = 0; c < BOARD_SIZE; c++) {
            for (let r = 0; r <= BOARD_SIZE - threatLength; r++) {
                let count = 0;
                let emptyCount = 0;
                let emptyPos = -1;
                for (let i = 0; i < threatLength; i++) {
                    if (boardState[r + i][c] === player) count++;
                    else if (boardState[r + i][c] === EMPTY) {
                        emptyCount++;
                        emptyPos = r + i;
                    }
                }
                if (count === threatLength - 1 && emptyCount === 1) {
                    console.log(`Vertical threat found at row ${emptyPos}, col ${c}`);
                    return { row: emptyPos, col: c, direction: 'vertical' };
                }
            }
        }

        // Diagonal threat check (top-left to bottom-right)
        for (let r = 0; r <= BOARD_SIZE - threatLength; r++) {
            for (let c = 0; c <= BOARD_SIZE - threatLength; c++) {
                let count = 0;
                let emptyCount = 0;
                let emptyRow = -1;
                let emptyCol = -1;
                for (let i = 0; i < threatLength; i++) {
                    if (boardState[r + i][c + i] === player) count++;
                    else if (boardState[r + i][c + i] === EMPTY) {
                        emptyCount++;
                        emptyRow = r + i;
                        emptyCol = c + i;
                    }
                }
                if (count === threatLength - 1 && emptyCount === 1) {
                    console.log(`Diagonal \\ threat found at (${emptyRow}, ${emptyCol})`);
                    return { row: emptyRow, col: emptyCol, direction: 'diagonal-main' };
                }
            }
        }

        // Diagonal threat check (top-right to bottom-left)
        for (let r = threatLength - 1; r < BOARD_SIZE; r++) {
            for (let c = 0; c <= BOARD_SIZE - threatLength; c++) {
                let count = 0;
                let emptyCount = 0;
                let emptyRow = -1;
                let emptyCol = -1;
                for (let i = 0; i < threatLength; i++) {
                    if (boardState[r - i][c + i] === player) count++;
                    else if (boardState[r - i][c + i] === EMPTY) {
                        emptyCount++;
                        emptyRow = r - i;
                        emptyCol = c + i;
                    }
                }
                if (count === threatLength - 1 && emptyCount === 1) {
                    console.log(`Diagonal / threat found at (${emptyRow}, ${emptyCol})`);
                    return { row: emptyRow, col: emptyCol, direction: 'diagonal-anti' };
                }
            }
        }

        console.log(`No ${threatLength}-in-a-row threats found for ${player}`);
        return null; // No threat found
    }

    // V12.23 - Enhanced scoring-based AI with multi-level threat detection
    function scoreMove(move, player) {
        const opponent = player === 'blue' ? 'orange' : 'blue';
        let score = 0;

        // Simulate the move
        const testBoard = simulateMoveOnBoard(board, move, player);
        if (!testBoard) return -1000; // Invalid move

        // Check for immediate win (highest priority)
        if (checkWinOnBoard(testBoard, player)) {
            return 10000;
        }

        // Count our threats (N-1 in a row with open end)
        const ourThreats = countThreatsOnBoard(testBoard, player, CONNECT_N - 1);
        score += ourThreats * 100;

        // Count our 2-in-a-row setups
        const ourSetups = countThreatsOnBoard(testBoard, player, CONNECT_N - 2);
        score += ourSetups * 20;

        // Check if we create a fork (2+ winning threats)
        if (ourThreats >= 2) {
            score += 500; // Fork is very strong
        }

        // Check if opponent can win after our move
        for (let oppMove = 0; oppMove < BOARD_SIZE * 2; oppMove++) {
            const afterOppMove = simulateMoveOnBoard(testBoard, oppMove, opponent);
            if (afterOppMove && checkWinOnBoard(afterOppMove, opponent)) {
                score -= 5000; // Very bad - we enable opponent win
                break;
            }
        }

        // Prefer center positions
        const { side, index } = getSelectorInfo(move);
        if (index >= 2 && index <= 3) {
            score += 15; // Center preference
        } else if (index >= 1 && index <= 4) {
            score += 8; // Near-center preference
        }

        return score;
    }

    // Simulate placing a piece on a board copy
    function simulateMoveOnBoard(boardState, selectorIndex, playerColor) {
        const { side, index } = getSelectorInfo(selectorIndex);
        const testBoard = boardState.map(row => [...row]);

        if (side === 'top-left') {
            // Simulate column drop with push mechanics
            if (testBoard[0][index] !== EMPTY) {
                // Column is full at top - piece will push
                // Check if bottom piece falls off
                if (testBoard[BOARD_SIZE - 1][index] !== EMPTY) {
                    // Piece falls off - shift everything down
                    for (let r = BOARD_SIZE - 1; r > 0; r--) {
                        testBoard[r][index] = testBoard[r - 1][index];
                    }
                    testBoard[0][index] = playerColor;
                } else {
                    // Find empty spot and cascade
                    for (let r = BOARD_SIZE - 1; r >= 0; r--) {
                        if (testBoard[r][index] === EMPTY) {
                            // Shift pieces from top down to this spot
                            for (let s = r; s > 0; s--) {
                                testBoard[s][index] = testBoard[s - 1][index];
                            }
                            testBoard[0][index] = playerColor;
                            break;
                        }
                    }
                }
            } else {
                // Simple drop at top
                testBoard[0][index] = playerColor;
            }
        } else if (side === 'top-right') {
            // Simulate row push from left
            if (testBoard[index][0] !== EMPTY) {
                // Row has piece at left - will push
                if (testBoard[index][BOARD_SIZE - 1] !== EMPTY) {
                    // Rightmost piece falls off - shift everything right
                    for (let c = BOARD_SIZE - 1; c > 0; c--) {
                        testBoard[index][c] = testBoard[index][c - 1];
                    }
                    testBoard[index][0] = playerColor;
                } else {
                    // Find empty spot and cascade
                    for (let c = BOARD_SIZE - 1; c >= 0; c--) {
                        if (testBoard[index][c] === EMPTY) {
                            // Shift pieces from left to this spot
                            for (let s = c; s > 0; s--) {
                                testBoard[index][s] = testBoard[index][s - 1];
                            }
                            testBoard[index][0] = playerColor;
                            break;
                        }
                    }
                }
            } else {
                // Simple place at left
                testBoard[index][0] = playerColor;
            }
        }

        return testBoard;
    }

    // Count number of threat patterns (N pieces in a row with room to complete)
    function countThreatsOnBoard(boardState, player, threatLength) {
        let threats = 0;

        // Horizontal threats
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c <= BOARD_SIZE - CONNECT_N; c++) {
                let count = 0;
                let emptyCount = 0;
                for (let i = 0; i < CONNECT_N; i++) {
                    if (boardState[r][c + i] === player) count++;
                    else if (boardState[r][c + i] === EMPTY) emptyCount++;
                }
                if (count === threatLength && emptyCount === CONNECT_N - threatLength) {
                    threats++;
                }
            }
        }

        // Vertical threats
        for (let c = 0; c < BOARD_SIZE; c++) {
            for (let r = 0; r <= BOARD_SIZE - CONNECT_N; r++) {
                let count = 0;
                let emptyCount = 0;
                for (let i = 0; i < CONNECT_N; i++) {
                    if (boardState[r + i][c] === player) count++;
                    else if (boardState[r + i][c] === EMPTY) emptyCount++;
                }
                if (count === threatLength && emptyCount === CONNECT_N - threatLength) {
                    threats++;
                }
            }
        }

        // Diagonal threats (both directions)
        for (let r = 0; r <= BOARD_SIZE - CONNECT_N; r++) {
            for (let c = 0; c <= BOARD_SIZE - CONNECT_N; c++) {
                let count = 0;
                let emptyCount = 0;
                for (let i = 0; i < CONNECT_N; i++) {
                    if (boardState[r + i][c + i] === player) count++;
                    else if (boardState[r + i][c + i] === EMPTY) emptyCount++;
                }
                if (count === threatLength && emptyCount === CONNECT_N - threatLength) {
                    threats++;
                }
            }
        }

        for (let r = CONNECT_N - 1; r < BOARD_SIZE; r++) {
            for (let c = 0; c <= BOARD_SIZE - CONNECT_N; c++) {
                let count = 0;
                let emptyCount = 0;
                for (let i = 0; i < CONNECT_N; i++) {
                    if (boardState[r - i][c + i] === player) count++;
                    else if (boardState[r - i][c + i] === EMPTY) emptyCount++;
                }
                if (count === threatLength && emptyCount === CONNECT_N - threatLength) {
                    threats++;
                }
            }
        }

        return threats;
    }

    function findBestComputerMove() {
        const availableMoves = [];

        // All moves are available (the game uses push mechanics)
        for (let i = 0; i < BOARD_SIZE * 2; i++) {
            availableMoves.push(i);
        }

        if (availableMoves.length === 0) return -1;

        console.log("=== Computer AI V12.23 ===");
        console.log("Current board state:");
        for (let r = 0; r < BOARD_SIZE; r++) {
            console.log(board[r].map(cell => cell === EMPTY ? '.' : cell.charAt(0)).join(' '));
        }

        // PRIORITY 1: Check for immediate win
        for (let move of availableMoves) {
            const testBoard = simulateMoveOnBoard(board, move, 'blue');
            if (testBoard && checkWinOnBoard(testBoard, 'blue')) {
                console.log(`🎯 WINNING MOVE: ${move}`);
                return move;
            }
        }

        // PRIORITY 2: Block opponent's winning move
        for (let move of availableMoves) {
            const testBoard = simulateMoveOnBoard(board, move, 'orange');
            if (testBoard && checkWinOnBoard(testBoard, 'orange')) {
                console.log(`🛡️ BLOCKING WIN: ${move}`);
                return move;
            }
        }

        // PRIORITY 3: Score all moves and pick the best
        const scoredMoves = availableMoves.map(move => ({
            move: move,
            score: scoreMove(move, 'blue')
        }));

        // Sort by score descending
        scoredMoves.sort((a, b) => b.score - a.score);

        console.log("Move scores:", scoredMoves.slice(0, 5).map(m => `${m.move}:${m.score}`).join(', '));

        // Pick best move, or random among ties
        const bestScore = scoredMoves[0].score;
        const bestMoves = scoredMoves.filter(m => m.score === bestScore);
        const selectedMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];

        console.log(`📍 Selected move: ${selectedMove.move} (score: ${selectedMove.score})`);
        return selectedMove.move;
    }

    function makeComputerMove() {
        const move = findBestComputerMove();
        if (move !== -1) {
            activeSelectorIndex = move;
            playSound(soundChipDrop);
            dropChip();
        } else {
            console.log("No available moves for computer");
        }
    }

    function wouldWinWithMove(selectorIndex, playerColor) {
        // Simulate the move and check if it would result in a win
        const { side, index } = getSelectorInfo(selectorIndex);

        // Create a copy of the board to test the move
        const testBoard = board.map(row => [...row]);

        // Simulate placing the piece based on actual drop mechanics
        if (side === 'top-left') {
            // Drop from top into column (gravity effect)
            for (let r = BOARD_SIZE - 1; r >= 0; r--) {
                if (testBoard[r][index] === EMPTY) {
                    testBoard[r][index] = playerColor;
                    break;
                }
            }
        } else if (side === 'top-right') {
            // Drop from left into row (slide effect)
            for (let c = BOARD_SIZE - 1; c >= 0; c--) {
                if (testBoard[index][c] === EMPTY) {
                    testBoard[index][c] = playerColor;
                    break;
                }
            }
        }

        // Check if this results in a win
        return checkWinOnBoard(testBoard, playerColor);
    }

    function wouldWinWithMoveOnBoard(testBoard, selectorIndex, playerColor) {
        // Simulate the move on a provided board and check if it would result in a win
        const { side, index } = getSelectorInfo(selectorIndex);

        // Create a copy of the provided board to test the move
        const boardCopy = testBoard.map(row => [...row]);

        // Simulate placing the piece based on actual drop mechanics
        if (side === 'top-left') {
            // Drop from top into column (gravity effect)
            for (let r = BOARD_SIZE - 1; r >= 0; r--) {
                if (boardCopy[r][index] === EMPTY) {
                    boardCopy[r][index] = playerColor;
                    break;
                }
            }
        } else if (side === 'top-right') {
            // Drop from left into row (slide effect)
            for (let c = BOARD_SIZE - 1; c >= 0; c--) {
                if (boardCopy[index][c] === EMPTY) {
                    boardCopy[index][c] = playerColor;
                    break;
                }
            }
        }

        // Check if this results in a win
        return checkWinOnBoard(boardCopy, playerColor);
    }

    // Version 12.20 - Added threat blocking function for 3-in-a-row detection
    function wouldBlockThreatWithMove(selectorIndex, opponentColor) {
        // First, check if there's currently a threat on the board
        const currentThreat = checkThreatOnBoard(board, opponentColor, 3);
        if (!currentThreat) {
            console.log(`No threat to block for ${opponentColor}`);
            return false; // No threat to block
        }

        console.log(`Found threat to block: ${JSON.stringify(currentThreat)}`);

        // Simulate the move and check if it would block the opponent's 3-in-a-row threat
        const { side, index } = getSelectorInfo(selectorIndex);

        // Create a copy of the board to test the move
        const testBoard = board.map(row => [...row]);

        // Simulate placing the computer piece based on actual drop mechanics
        if (side === 'top-left') {
            // Drop from top into column (gravity effect)
            for (let r = BOARD_SIZE - 1; r >= 0; r--) {
                if (testBoard[r][index] === EMPTY) {
                    testBoard[r][index] = 'blue'; // Computer is blue
                    console.log(`Simulating move ${selectorIndex}: placing blue at (${r}, ${index})`);
                    break;
                }
            }
        } else if (side === 'top-right') {
            // Drop from left into row (slide effect)
            for (let c = BOARD_SIZE - 1; c >= 0; c--) {
                if (testBoard[index][c] === EMPTY) {
                    testBoard[index][c] = 'blue'; // Computer is blue
                    console.log(`Simulating move ${selectorIndex}: placing blue at (${index}, ${c})`);
                    break;
                }
            }
        }

        // Check if the specific threat position is now blocked
        const threatAfterMove = checkThreatOnBoard(testBoard, opponentColor, 3);

        // If the threat is gone after our move, we successfully blocked it
        if (!threatAfterMove) {
            console.log(`Move ${selectorIndex} would block threat at (${currentThreat.row}, ${currentThreat.col})`);
            return true;
        }

        // Alternatively, check if we placed a piece exactly where the threat was
        if (side === 'top-left') {
            // Check if we placed in the threat column
            for (let r = BOARD_SIZE - 1; r >= 0; r--) {
                if (board[r][index] === EMPTY) {
                    if (r === currentThreat.row && index === currentThreat.col) {
                        console.log(`Move ${selectorIndex} directly blocks threat at (${currentThreat.row}, ${currentThreat.col})`);
                        return true;
                    }
                    break;
                }
            }
        } else if (side === 'top-right') {
            // Check if we placed in the threat row
            for (let c = BOARD_SIZE - 1; c >= 0; c--) {
                if (board[index][c] === EMPTY) {
                    if (index === currentThreat.row && c === currentThreat.col) {
                        console.log(`Move ${selectorIndex} directly blocks threat at (${currentThreat.row}, ${currentThreat.col})`);
                        return true;
                    }
                    break;
                }
            }
        }

        console.log(`Move ${selectorIndex} does not block the threat`);
        return false; // Threat not blocked by this move
    }

    function postMove(playerColor) {
        render(); // Render immediately after move

        // Check for win condition
        if (checkWinOnBoard(board, playerColor)) {
            endGame(playerColor);
            return;
        }

        if (isComputerGame || isLocalGame) {
            // This is a valid move, switch player
            currentPlayer = (currentPlayer + 1) % 2;
            render();

            // Computer move logic for computer games
            if (isComputerGame && currentPlayer === 1 && !gameOver) {
                // Computer is player 1 (blue), make a move after a short delay
                setTimeout(() => {
                    makeComputerMove();
                }, 1000); // 1 second delay for better UX
            }
        } else {
            // This is a valid move, switch player and post it to the server
            currentPlayer = (currentPlayer + 1) % 2;
            postMoveToServer();
        }
    }

    function endGame(winnerColor) {
        gameOver = true;
        moveInProgress = false;
        const winnerPlayer = winnerColor === 'orange' ? 'p1' : (winnerColor === 'blue' ? 'p2' : null);

        // Add winning piece animations
        if (winnerColor) {
            addWinningPieceAnimations(winnerColor);
            // Play win sound
            playSound(soundWin);
        }

        // Update turn indicator for game end
        if (turnIndicator && turnText) {
            turnIndicator.className = 'turn-indicator';
            if (winnerPlayer) {
                const winnerName = winnerColor.charAt(0).toUpperCase() + winnerColor.slice(1);
                turnText.textContent = `${winnerName} Wins!`;
                if (winnerColor === 'orange') {
                    turnIndicator.classList.add('orange-turn');
                } else {
                    turnIndicator.classList.add('blue-turn');
                }
            } else {
                turnText.textContent = "Round Over! It's a draw!";
                turnIndicator.style.borderColor = '#666';
                turnIndicator.style.background = 'rgba(255, 255, 255, 0.1)';
            }
        }

        // Show New Game button after game ends
        // V12.27 - Button stays in center-controls, just make sure it's visible
        if (newGameBtn) {
            // Button is already in center-controls, no need to move it
        }

        // Add movie marquee celebration for top selectors
        if (winnerColor) {
            addMarqueeCelebration();
        }

        if (winnerPlayer) {
            const winnerName = winnerColor.charAt(0).toUpperCase() + winnerColor.slice(1);
            gameStatusDiv.textContent = `Round Over! ${winnerName} wins!`;
            gameStatusDiv.style.color = '#33ff57';
            playSound(soundWin);
            if (serverUrl && currentServerGameId) {
                reportWinToServer(winnerPlayer);
            }
        } else {
            gameStatusDiv.textContent = "Round Over! It's a draw!";
        }

        // Guard old UI reference (button removed in new layout)
        if (typeof restartButton !== 'undefined' && restartButton) {
            restartButton.textContent = 'New Round';
        }
        renderSelectors(); // Hide selectors
    }

    function updateStatus() {
        if (gameOver) return;
        const playerColor = PLAYER_COLORS[currentPlayer];
        const isMyTurn = myPlayerRole === (currentPlayer === 0 ? 'p1' : 'p2');

        // Update turn indicator
        if (turnIndicator && turnText && turnIndicatorContainer) {
            turnIndicator.className = 'turn-indicator';
            turnText.textContent = `${playerColor.charAt(0).toUpperCase() + playerColor.slice(1)}'s Turn`;

            // Reset container classes
            turnIndicatorContainer.className = 'turn-indicator-container';

            // Update the circle in the turn indicator
            const turnCircle = turnIndicator.querySelector('.player-circle');
            if (turnCircle) {
                turnCircle.className = `player-circle ${playerColor}`;
            }

            if (playerColor === 'orange') {
                turnIndicator.classList.add('orange-turn');
                turnIndicatorContainer.classList.add('align-left'); // Orange on left
            } else {
                turnIndicator.classList.add('blue-turn');
                turnIndicatorContainer.classList.add('align-right'); // Blue on right
            }
        }

        // V12.36 - Turn outlines removed with player boxes; turn indicator in center-controls shows whose turn it is

        // Hide old game status since we have the animated turn indicator
        if (gameStatusDiv) {
            gameStatusDiv.style.display = 'none';
        }

        // Start or stop per-turn timer depending on whether it's my turn
        if (isMyTurn && !moveInProgress) {
            startTurnTimer();
        } else {
            stopTurnTimer();
        }
    }

    // Turn timer helpers
    function startTurnTimer() {
        stopTurnTimer();
        if (!turnTimerEl) return;
        turnTimerRemaining = turnTimerSeconds;
        turnTimerEl.textContent = `${turnTimerRemaining}s`;
        turnTimerEl.classList.remove('warning','expired');
        turnTimerInterval = setInterval(() => {
            turnTimerRemaining--;
            if (turnTimerRemaining <= 0) {
                stopTurnTimer();
                handleTurnTimeout();
                return;
            }
            if (turnTimerRemaining <= 10) {
                turnTimerEl.classList.add('warning');
            }
            turnTimerEl.textContent = `${turnTimerRemaining}s`;
        }, 1000);
    }

    function stopTurnTimer() {
        if (turnTimerInterval) clearInterval(turnTimerInterval);
        turnTimerInterval = null;
        if (turnTimerEl) {
            turnTimerEl.textContent = '';
            turnTimerEl.classList.remove('warning','expired');
        }
    }

    function handleTurnTimeout() {
        if (turnTimerEl) turnTimerEl.classList.add('expired');
        showGameMessage('Time expired — turn passed', 'warning');
        // For local/computer games just advance locally
        if (isLocalGame || isComputerGame) {
            currentPlayer = (currentPlayer + 1) % 2;
            render();
            if (isComputerGame && currentPlayer === 1 && !gameOver) {
                setTimeout(() => makeComputerMove(), 800);
            }
            return;
        }

        // For online games, send a pass move: post current board but advance turn
        if (serverUrl && currentServerGameId) {
            const playerSecret = localStorage.getItem(`game_${currentServerGameId}_secret`);
            const playerId = myPlayerRole;
            if (!playerSecret || !playerId) return;
            const payload = {
                action: 'move',
                id: currentServerGameId,
                turnNumber: serverTurnNumber,
                board: board,
                pushedOffPieces: pushedOffPieces,
                playerId: playerId,
                currentPlayer: (currentPlayer + 1) % 2,
                playerSecret: playerSecret
            };
            fetch(serverUrl, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
                .then(r=>r.json()).then(j=>{
                    if (!j.ok) {
                        showGameMessage('Pass move rejected: ' + (j.error||'Unknown error'), 'error');
                    } else {
                        serverTurnNumber = j.game.turnNumber;
                    }
                }).catch(()=>{});
        }
    }

    function handleForfeit(e) {
        let forfeitingPlayer = myPlayerRole || 'p1'; // Player clicking forfeit
        const winnerPlayer = forfeitingPlayer === 'p1' ? 'p2' : 'p1';

        const forfeitName = forfeitingPlayer === 'p1' ? 'Orange' : 'Blue';
        const winnerName = winnerPlayer === 'p1' ? 'Orange' : 'Blue';

        showGameMessage(`${forfeitName} forfeited. ${winnerName} wins!`, 'warning', 2500);

        // Report the winner to server
        if (serverUrl && currentServerGameId) {
            reportWinToServer(winnerPlayer);
        }

        // Return to lobby after a delay
        setTimeout(() => { window.location.href = 'index.html'; }, 2500);
    }

    function handleLobby() {
    showGameMessage("Returning to lobby...", 'warning', 2000);
    setTimeout(() => { window.location.href = 'index.html'; }, 2000);
    }

    // Timer edit popup (basic inline prompt for now)
    /* This needs to be re-evaluated with the new design
    if (editTimersBtn) {
        editTimersBtn.onclick = () => {
            const newGameTimer = prompt('Set game timer (e.g. 10:00):', gameTimerHeader ? gameTimerHeader.textContent.replace('Game: ','') : '10:00');
            const newMoveTimer = prompt('Set move timer (e.g. 30s):', moveTimerHeader ? moveTimerHeader.textContent.replace('Move: ','') : '30s');
            if (newGameTimer && gameTimerHeader) gameTimerHeader.textContent = `Game: ${newGameTimer}`;
            if (newMoveTimer && moveTimerHeader) moveTimerHeader.textContent = `Move: ${newMoveTimer}`;
            // TODO: Save to server/local if needed
        };
    }
    */

    function handleKeyDown(e) {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
        if (gameOver || moveInProgress) return;

        // Check if player can make a move
        let canMove = false;
        if (isLocalGame) {
            // In local games, both players can always make moves
            canMove = true;
        } else if (isComputerGame) {
            // In computer games, only allow human player (player 0) to make moves
            canMove = (currentPlayer === 0);
        } else {
            // In online games, check if it's the player's turn
            canMove = (myPlayerRole === (currentPlayer === 0 ? 'p1' : 'p2'));
        }

        if (!canMove) return;

        let newIndex = -1;
        if (e.key >= '1' && e.key <= '6') newIndex = parseInt(e.key) - 1;
        else if (e.key.toLowerCase() >= 'a' && e.key.toLowerCase() <= 'f') newIndex = e.key.toLowerCase().charCodeAt(0) - 97 + BOARD_SIZE;

        if (newIndex !== -1) {
            activeSelectorIndex = newIndex;
            playSound(soundChipDrop);
            dropChip();
            return;
        }

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') activeSelectorIndex = (activeSelectorIndex + 1) % (BOARD_SIZE * 2);
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') activeSelectorIndex = (activeSelectorIndex - 1 + BOARD_SIZE * 2) % (BOARD_SIZE * 2);
        else if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            playSound(soundChipDrop);
            dropChip();
            return;
        }
        render();
    }

    function restartGame() {
        // This button now resets the current round.
        // This functionality is now handled by forfeit/quit.
        // This function can be repurposed or removed.
        console.log("Restart button clicked, but functionality is being redesigned.");
    }

    function startNewGame() {
        if (confirm('Start a new game? This will reset the current game.')) {
            // Reset game state
            createEmptyBoard();
            currentPlayer = 0;
            gameOver = false;
            moveInProgress = false;
            pushedOffPieces = { pieces: [] };

            // Reset scores (bare numbers, no "Score:" prefix)
            if (p1_score) p1_score.textContent = '0';
            if (p2_score) p2_score.textContent = '0';

            // Clear room name for local games
            if (!currentServerGameId && roomNameSpan) {
                roomNameSpan.textContent = '';
            }

            // V12.27 - New Game button stays in center-controls, no moving needed

            render();
            updateStatus();
            gameStatusDiv.textContent = "New game started! Orange goes first.";
        }
    }

    // V12.38 - AI analysis and move functions removed in cleanup refactor

    // Version 12.21 - Added computer move function that uses AI logic
    function makeComputerMove() {
        if (gameOver || moveInProgress) return;

        console.log('Computer is thinking...');
        console.log('Current board state:', board.map(row => row.slice()));

        // Use the AI to find the best move
        const bestMove = findBestComputerMove();

        if (bestMove !== null) {
            console.log(`Computer chooses move: ${bestMove}`);

            // Set the active selector to the chosen move
            activeSelectorIndex = bestMove;

            // Execute the move
            setTimeout(() => {
                playSound(soundChipDrop);
                dropChip();
            }, 500); // Small delay for better UX

        } else {
            console.log('Computer could not find a valid move - this should not happen!');
            // Fallback: make a random move
            const availableMoves = [];
            for (let i = 0; i < BOARD_SIZE * 2; i++) {
                if (canMakeMove(i)) {
                    availableMoves.push(i);
                }
            }

            if (availableMoves.length > 0) {
                const randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
                console.log(`Computer fallback: random move ${randomMove}`);
                activeSelectorIndex = randomMove;
                setTimeout(() => {
                    playSound(soundChipDrop);
                    dropChip();
                }, 500);
            }
        }
    }

    // Event Listeners and Initialization
    if (p1_forfeitBtn) p1_forfeitBtn.addEventListener('click', handleForfeit);
    if (p2_forfeitBtn) p2_forfeitBtn.addEventListener('click', handleForfeit);
    if (forfeitBtnMain) forfeitBtnMain.addEventListener('click', handleForfeit);
    if (lobbyBtnMain) lobbyBtnMain.addEventListener('click', handleLobby);
    if (helpBtnGame) helpBtnGame.addEventListener('click', () => { window.open('help.html','_blank'); });
    // Lobby buttons (both player boxes now have lobby buttons)
    const lobbyBtn = document.getElementById('lobby-btn');
    if (lobbyBtn) lobbyBtn.addEventListener('click', handleLobby);
    const lobbyBtnP1 = document.getElementById('lobby-btn-p1');
    if (lobbyBtnP1) lobbyBtnP1.addEventListener('click', handleLobby);



    const startNewGameBtn = document.getElementById('start-new-game');
    if (startNewGameBtn) {
        startNewGameBtn.addEventListener('click', startNewGame);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', render);

    // Auto-detect server API from URL params, or set up local/computer game
    (async function autoDetectServer() {
        const serverParam = params.get('server');
        const idParam = params.get('id');

        if (isComputerGame || isLocalGame) {
            // For local or computer game: initialize empty board, set both players
            currentServerGameId = idParam || ('local_' + Date.now());
            createEmptyBoard();
            myPlayerRole = 'p1'; // Creator is always Orange/p1

            // For computer games, randomly decide who goes first
            if (isComputerGame) {
                currentPlayer = Math.random() < 0.5 ? 0 : 1; // 50/50 chance
                console.log(`Computer game: ${currentPlayer === 0 ? 'Human' : 'Computer'} goes first`);
            }

            // Update win condition display
            if (winConditionDiv) {
                winConditionDiv.textContent = `${CONNECT_N} in a Row Wins`;
            }

            render();
            gameStatusDiv.textContent = isComputerGame ?
                (currentPlayer === 0 ? 'Your Turn (vs Computer)' : 'Computer\'s Turn') :
                'You are the host. Waiting for opponent.';

            // Update "You are" display for local/computer games
            youAreColorEl.textContent = 'Orange';
            youAreColorEl.style.color = '#ff9900'; // Orange color

            // Handle initial computer move if computer goes first
            if (isComputerGame && currentPlayer === 1 && !gameOver) {
                setTimeout(() => {
                    makeComputerMove();
                }, 1000);
            }

            // Set up invite URL for local/computer games
            updateInviteUrl();
            return;
        }

        if (serverParam && idParam) {
            serverUrl = serverParam;
            currentServerGameId = idParam;

            // If the URL includes secret/role (creator navigation), persist them immediately so importTurnFileFromObject can detect role
            const urlSecret = params.get('secret');
            const urlRole = params.get('role');
            if (urlSecret) {
                try { localStorage.setItem(`game_${idParam}_secret`, urlSecret); } catch(e){}
            }
            if (urlRole) {
                try { localStorage.setItem(`game_${idParam}_role`, urlRole); } catch(e){}
            }

            fetch(`${serverUrl}?action=get&id=${encodeURIComponent(idParam)}`).then(r=>r.json()).then(j=>{
                if (j.ok && j.game) {
                    importTurnFileFromObject(j.game);
                    startServerPolling();
                    // Set up invite URL for online games
                    updateInviteUrl();
                } else {
                    gameStatusDiv.textContent = "Could not load game: " + (j.error || "Unknown error");
                }
            }).catch((err)=>{
                gameStatusDiv.textContent = "Could not connect to game backend. Check console for details.";
                console.error("Fetch error:", err);
            });
        } else {
            gameStatusDiv.textContent = "No game specified. Please join from the lobby.";
            boardArea.style.display = 'none';
        }
    })();

    function updateInviteUrl() {
        const inviteBtn = document.getElementById('invite-btn');

        if (!inviteBtn) return;

        // Only show invite button for online games where players can actually join
        if (!serverUrl || !currentServerGameId || isComputerGame || isLocalGame) {
            inviteBtn.style.display = 'none';
            return;
        }

        // Generate the invite URL
        const inviteUrl = `${window.location.origin}${window.location.pathname.replace('game.html', 'index.html')}?join=${encodeURIComponent(currentServerGameId)}`;
        inviteBtn.style.display = 'inline-block';

        // Set up copy functionality
        inviteBtn.onclick = () => {
            navigator.clipboard.writeText(inviteUrl).then(() => {
                showGameMessage('Invite URL copied to clipboard!', 'success');
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = inviteUrl;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                showGameMessage('Invite URL copied to clipboard!', 'success');
            });
        };
    }
});
