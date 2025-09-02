/**
 * 2048 Game Class
 * Handles all game logic, state management, and user interactions
 */
class Game2048 {
    constructor() {
        this.grid = [];
        this.score = 0;
        this.bestScore = localStorage.getItem('2048-best-score') || 0;
        this.previousState = null;
        this.autoSave = localStorage.getItem('2048-auto-save') !== 'false';
        this.hasWon = false;
        
        this.initGrid();
        this.loadGame();
        this.updateDisplay();
        this.bindEvents();
        
        document.getElementById('best-score').textContent = this.bestScore;
        document.getElementById('auto-save-status').textContent = this.autoSave ? 'ON' : 'OFF';
    }

    /**
     * Initialize empty 4x4 grid
     */
    initGrid() {
        this.grid = Array(4).fill().map(() => Array(4).fill(0));
    }

    /**
     * Load saved game state or start new game
     */
    loadGame() {
        if (this.autoSave) {
            const savedGame = localStorage.getItem('2048-game-state');
            if (savedGame) {
                const gameState = JSON.parse(savedGame);
                this.grid = gameState.grid;
                this.score = gameState.score;
                this.hasWon = gameState.hasWon || false;
                return;
            }
        }
        this.newGame();
    }

    /**
     * Save current game state to localStorage
     */
    saveGame() {
        if (this.autoSave) {
            localStorage.setItem('2048-game-state', JSON.stringify({
                grid: this.grid,
                score: this.score,
                hasWon: this.hasWon
            }));
        }
    }

    /**
     * Start a new game
     */
    newGame() {
        this.initGrid();
        this.score = 0;
        this.hasWon = false;
        this.previousState = null;
        this.addRandomTile();
        this.addRandomTile();
        this.updateDisplay();
        this.saveGame();
    }

    /**
     * Add a random tile (2 or 4) to an empty cell
     */
    addRandomTile() {
        const emptyCells = [];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (this.grid[i][j] === 0) {
                    emptyCells.push({row: i, col: j});
                }
            }
        }

        if (emptyCells.length > 0) {
            const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.grid[randomCell.row][randomCell.col] = Math.random() < 0.9 ? 2 : 4;
        }
    }

    /**
     * Handle tile movement in specified direction
     * @param {string} direction - 'left', 'right', 'up', or 'down'
     */
    move(direction) {
        this.saveState();
        let moved = false;
        let mergedCells = [];

        const newGrid = this.grid.map(row => [...row]);

        if (direction === 'left') {
            for (let i = 0; i < 4; i++) {
                const row = this.slideAndMergeRow(newGrid[i]);
                if (JSON.stringify(row.row) !== JSON.stringify(newGrid[i])) {
                    moved = true;
                }
                newGrid[i] = row.row;
                mergedCells.push(...row.merged.map(col => ({row: i, col})));
            }
        } else if (direction === 'right') {
            for (let i = 0; i < 4; i++) {
                const reversed = [...newGrid[i]].reverse();
                const row = this.slideAndMergeRow(reversed);
                if (JSON.stringify(row.row.reverse()) !== JSON.stringify(newGrid[i])) {
                    moved = true;
                }
                newGrid[i] = row.row.reverse();
                mergedCells.push(...row.merged.map(col => ({row: i, col: 3 - col})));
            }
        } else if (direction === 'up') {
            for (let j = 0; j < 4; j++) {
                const column = [newGrid[0][j], newGrid[1][j], newGrid[2][j], newGrid[3][j]];
                const row = this.slideAndMergeRow(column);
                if (JSON.stringify([row.row[0], row.row[1], row.row[2], row.row[3]]) !== JSON.stringify(column)) {
                    moved = true;
                }
                for (let i = 0; i < 4; i++) {
                    newGrid[i][j] = row.row[i];
                }
                mergedCells.push(...row.merged.map(rowIdx => ({row: rowIdx, col: j})));
            }
        } else if (direction === 'down') {
            for (let j = 0; j < 4; j++) {
                const column = [newGrid[3][j], newGrid[2][j], newGrid[1][j], newGrid[0][j]];
                const row = this.slideAndMergeRow(column);
                if (JSON.stringify([row.row[3], row.row[2], row.row[1], row.row[0]]) !== JSON.stringify([newGrid[0][j], newGrid[1][j], newGrid[2][j], newGrid[3][j]])) {
                    moved = true;
                }
                for (let i = 0; i < 4; i++) {
                    newGrid[3-i][j] = row.row[i];
                }
                mergedCells.push(...row.merged.map(rowIdx => ({row: 3 - rowIdx, col: j})));
            }
        }

        if (moved) {
            this.grid = newGrid;
            this.addRandomTile();
            this.updateDisplay();
            this.saveGame();

            
            setTimeout(() => {
                mergedCells.forEach(cell => {
                    const tileElement = this.getTileElement(cell.row, cell.col);
                    if (tileElement) {
                        tileElement.classList.add('tile-merged');
                        setTimeout(() => tileElement.classList.remove('tile-merged'), 300);
                    }
                });
            }, 150);

            
            if (this.checkWin() && !this.hasWon) {
                this.hasWon = true;
                setTimeout(() => {
                    document.getElementById('win-overlay').style.display = 'flex';
                }, 300);
            } else if (this.isGameOver()) {
                setTimeout(() => {
                    document.getElementById('final-score').textContent = this.score;
                    document.getElementById('game-over-overlay').style.display = 'flex';
                }, 300);
            }
        }
    }

    /**
     * Slide and merge tiles in a row
     * @param {Array} row - Array representing a row of tiles
     * @returns {Object} - Object containing new row and merged positions
     */
    slideAndMergeRow(row) {
        const newRow = row.filter(val => val !== 0);
        const merged = [];
        
        for (let i = 0; i < newRow.length - 1; i++) {
            if (newRow[i] === newRow[i + 1]) {
                newRow[i] *= 2;
                this.score += newRow[i];
                newRow.splice(i + 1, 1);
                merged.push(i);
            }
        }
        
        while (newRow.length < 4) {
            newRow.push(0);
        }
        
        return { row: newRow, merged };
    }

    /**
     * Check if player has won (reached 2048)
     * @returns {boolean}
     */
    checkWin() {
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (this.grid[i][j] === 2048) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Check if game is over (no moves possible)
     * @returns {boolean}
     */
    isGameOver() {
        
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (this.grid[i][j] === 0) {
                    return false;
                }
            }
        }

        
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const current = this.grid[i][j];
                if (
                    (i < 3 && this.grid[i + 1][j] === current) ||
                    (j < 3 && this.grid[i][j + 1] === current)
                ) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Save current state for undo functionality
     */
    saveState() {
        this.previousState = {
            grid: this.grid.map(row => [...row]),
            score: this.score
        };
    }

    /**
     * Undo last move
     */
    undo() {
        if (this.previousState) {
            this.grid = this.previousState.grid;
            this.score = this.previousState.score;
            this.previousState = null;
            this.updateDisplay();
            this.saveGame();
        }
    }

    /**
     * Toggle auto-save functionality
     */
    toggleAutoSave() {
        this.autoSave = !this.autoSave;
        localStorage.setItem('2048-auto-save', this.autoSave);
        document.getElementById('auto-save-status').textContent = this.autoSave ? 'ON' : 'OFF';
        if (this.autoSave) {
            this.saveGame();
        }
    }

    /**
     * Get tile element at specific position
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @returns {Element|null}
     */
    getTileElement(row, col) {
        const tiles = document.querySelectorAll('.tile');
        for (let tile of tiles) {
            if (tile.dataset.row == row && tile.dataset.col == col) {
                return tile;
            }
        }
        return null;
    }

    /**
     * Update the visual display of the game
     */
    updateDisplay() {
        const container = document.getElementById('grid-container');
        
        
        const existingTiles = container.querySelectorAll('.tile');
        existingTiles.forEach(tile => tile.remove());

        
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (this.grid[i][j] !== 0) {
                    const tile = document.createElement('div');
                    tile.className = `tile tile-${this.grid[i][j]}`;
                    tile.textContent = this.grid[i][j];
                    tile.dataset.row = i;
                    tile.dataset.col = j;
                    
                    const gridCell = container.querySelector(`[data-row="${i}"][data-col="${j}"]`);
                    const rect = gridCell.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();
                    
                    tile.style.left = (rect.left - containerRect.left) + 'px';
                    tile.style.top = (rect.top - containerRect.top) + 'px';
                    
                    container.appendChild(tile);
                }
            }
        }

        
        document.getElementById('score').textContent = this.score;
        
        
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('2048-best-score', this.bestScore);
            document.getElementById('best-score').textContent = this.bestScore;
        }
    }

    /**
     * Bind keyboard and touch events
     */
    bindEvents() {
        
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.move('left');
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.move('right');
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.move('up');
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.move('down');
                    break;
            }
        });

        
        let startX, startY;
        const container = document.getElementById('grid-container');
        
        container.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });

        container.addEventListener('touchend', (e) => {
            if (!startX || !startY) return;
            
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            
            const diffX = startX - endX;
            const diffY = startY - endY;
            
            
            if (Math.abs(diffX) > Math.abs(diffY)) {
                if (diffX > 50) {
                    this.move('left');
                } else if (diffX < -50) {
                    this.move('right');
                }
            } else {
                if (diffY > 50) {
                    this.move('up');
                } else if (diffY < -50) {
                    this.move('down');
                }
            }
            
            startX = null;
            startY = null;
        });
    }
}


function displayDeveloperCredits() {
    console.log('%c┌────────────────────────────────────────────┐', 'color: #667eea; font-size: 14px;');
    console.log('%c│                                            │', 'color: #667eea; font-size: 14px;');
    console.log('%c│        Welcome to 2048 Game!         │', 'color: #764ba2; font-size: 16px; font-weight: bold;');
    console.log('%c│                                            │', 'color: #667eea; font-size: 14px;');
    console.log('%c│    Designed & Developed by Blessan Corley  │', 'color: #f093fb; font-size: 14px; font-weight: 600;');
    console.log('%c│                                            │', 'color: #667eea; font-size: 14px;');
    console.log('%c│           Enjoy the Game!                  │', 'color: #4facfe; font-size: 14px; font-weight: 600;');
    console.log('%c│                                            │', 'color: #667eea; font-size: 14px;');
    console.log('%c└────────────────────────────────────────────┘', 'color: #667eea; font-size: 14px;');
}


document.addEventListener('DOMContentLoaded', () => {
    
    displayDeveloperCredits();
    
    
    window.game = new Game2048();
});