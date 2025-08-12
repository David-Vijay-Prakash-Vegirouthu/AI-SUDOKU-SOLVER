document.addEventListener('DOMContentLoaded', function() {
    // Initialize the grid
    const grid = document.getElementById('sudoku-grid');
    let board = Array(9).fill().map(() => Array(9).fill(0));
    let originalBoard = Array(9).fill().map(() => Array(9).fill(0));
    let solvedBoard = null; // Store the full solution for checking
    let iterations = 0;
    let startTime = 0;
    let solving = false;
    let manualMode = true;
    let timerInterval = null;
    let gameStarted = false;
    let inputMode = false; // For manual puzzle creation

    // DOM elements
    const solveBtn = document.getElementById('solve-btn');
    const showAnswerBtn = document.getElementById('show-answer-btn');
    const checkBtn = document.getElementById('check-btn');
    const newBtn = document.getElementById('new-btn');
    const clearBtn = document.getElementById('clear-btn');
    const exportBtn = document.getElementById('export-btn');
    const algorithmSelect = document.getElementById('algorithm');
    const difficultySelect = document.getElementById('difficulty');
    const modeRadios = document.querySelectorAll('input[name="mode"]');
    const puzzleSourceRadios = document.querySelectorAll('input[name="puzzle-source"]');
    const uploadSection = document.getElementById('upload-controls');
    const manualInputSection = document.getElementById('manual-input-controls');
    const setPuzzleBtn = document.getElementById('set-puzzle-btn');
    const clearInputBtn = document.getElementById('clear-input-btn');
    const timeElement = document.getElementById('time');
    const iterationsElement = document.getElementById('iterations');
    const statusElement = document.getElementById('status');
    const loader = document.querySelector('.loader');
    const uploadInput = document.getElementById('sudoku-upload');
    const uploadBtn = document.getElementById('upload-btn');
    
    // Modal elements
    const algorithmModalOverlay = document.querySelector('.algorithm-modal-overlay');
    const algorithmModal = document.querySelector('.algorithm-modal');
    const algorithmModalOptions = document.querySelectorAll('.algorithm-option');
    const algorithmStartBtn = document.querySelector('.algorithm-modal-buttons .start-btn');
    const algorithmCancelBtn = document.querySelector('.algorithm-modal-buttons .cancel-btn');
    
    const solutionModalOverlay = document.querySelector('.solution-modal-overlay');
    const solutionModal = document.querySelector('.solution-modal');
    const solutionMessage = document.getElementById('solution-message');
    const solutionShowBtn = document.querySelector('.solution-modal-buttons .show-btn');
    const solutionContinueBtn = document.querySelector('.solution-modal-buttons .continue-btn');

    const inputModeModalOverlay = document.querySelector('.input-mode-modal-overlay');
    const inputModeModal = document.querySelector('.input-mode-modal');
    const inputModeGotItBtn = document.querySelector('.input-mode-modal-buttons .got-it-btn');
    
    let selectedAlgorithm = 'dfs';

    // Start the timer in manual mode
    function startTimer() {
        if (timerInterval) return; // Don't start if already running
        
        startTime = Date.now();
        
        // Update time display every 100ms
        timerInterval = setInterval(() => {
            const currentTime = (Date.now() - startTime) / 1000;
            timeElement.textContent = `Time: ${currentTime.toFixed(2)}s`;
        }, 100);
    }

    // Stop the timer
    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    // Initialize the grid
    function initializeGrid() {
        grid.innerHTML = '';
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                
                // Add block coloring (highlight every other 3x3 block)
                const blockIndex = Math.floor(row / 3) * 3 + Math.floor(col / 3);
                if (blockIndex % 2 === 0) {
                    cell.classList.add(`block-${blockIndex}`);
                }
                
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                // Handle cell click to input number
                cell.addEventListener('click', () => {
                    if (solving) return;
                    
                    // If we're in input mode for creating a puzzle
                    if (inputMode) {
                        showNumberPicker(row, col);
                        return;
                    }
                    
                    // If it's a fixed cell in the original puzzle and in manual mode, don't allow changes
                    if (manualMode && originalBoard[row][col] !== 0) {
                        showToast('This is a fixed cell from the original puzzle', 'warning');
                        return;
                    }
                    
                    showNumberPicker(row, col);
                });
                
                grid.appendChild(cell);
            }
        }
        updateDisplay();
    }

    // Number picker for cell input
    function showNumberPicker(row, col) {
        const picker = document.createElement('div');
        picker.className = 'number-picker';
        
        // Add numbers 1-9 and a clear option
        for (let i = 1; i <= 9; i++) {
            const numBtn = document.createElement('div');
            numBtn.className = 'number-option';
            numBtn.textContent = i;
            numBtn.addEventListener('click', () => {
                selectNumber(row, col, i);
                document.body.removeChild(picker);
            });
            picker.appendChild(numBtn);
        }
        
        // Add clear option
        const clearBtn = document.createElement('div');
        clearBtn.className = 'number-option clear';
        clearBtn.textContent = 'X';
        clearBtn.addEventListener('click', () => {
            selectNumber(row, col, 0);
            document.body.removeChild(picker);
        });
        picker.appendChild(clearBtn);
        
        // Position the picker near the clicked cell
        const cell = grid.children[row * 9 + col];
        const cellRect = cell.getBoundingClientRect();
        
        picker.style.position = 'absolute';
        picker.style.top = `${cellRect.bottom + 5}px`;
        picker.style.left = `${cellRect.left}px`;
        
        // Close picker when clicking outside
        const closePickerOnClickOutside = (e) => {
            if (!picker.contains(e.target)) {
                document.body.removeChild(picker);
                document.removeEventListener('click', closePickerOnClickOutside);
            }
        };
        
        // Add small delay to prevent immediate closing
        setTimeout(() => {
            document.addEventListener('click', closePickerOnClickOutside);
        }, 100);
        
        document.body.appendChild(picker);
    }

    // Select a number for a cell
    function selectNumber(row, col, num) {
        // For manual input mode, update the board but use a different css class
        if (inputMode) {
            board[row][col] = num;
            // Play sound effect
            playSoundEffect(num > 0 ? 'place' : 'clear');
            
            // Add visual effect
            const cell = grid.children[row * 9 + col];
            cell.classList.add('number-changed');
            setTimeout(() => {
                cell.classList.remove('number-changed');
            }, 300);
            
            updateDisplay();
            return;
        }
        
        // Start timer when the first number is placed in manual mode
        if (manualMode && !gameStarted && num > 0) {
            gameStarted = true;
            startTimer();
        }
        
        board[row][col] = num;
        
        if (num === 0) {
            if (!manualMode) {
                originalBoard[row][col] = 0;
            }
        } else {
            if (!manualMode) {
                // In AI mode, all inputs are considered fixed
                originalBoard[row][col] = num;
            }
        }
        
        // Play sound effect
        playSoundEffect(num > 0 ? 'place' : 'clear');
        
        // Add visual effect
        const cell = grid.children[row * 9 + col];
        cell.classList.add('number-changed');
        setTimeout(() => {
            cell.classList.remove('number-changed');
        }, 300);
        
        updateDisplay();
    }

    // Update the display based on the board state
    function updateDisplay() {
        const cells = grid.querySelectorAll('.cell');
        cells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const value = board[row][col];
            
            cell.textContent = value || '';
            
            // Keep the block highlighting
            const blockIndex = Math.floor(row / 3) * 3 + Math.floor(col / 3);
            cell.className = 'cell';
            if (blockIndex % 2 === 0) {
                cell.classList.add(`block-${blockIndex}`);
            }
            
            // If we're in input mode for creating puzzles
            if (inputMode) {
                if (value !== 0) {
                    cell.classList.add('input-mode');
                }
                return;
            }
            
            // Set appropriate class based on cell type
            if (value !== 0) {
                if (originalBoard[row][col] !== 0) {
                    cell.classList.add('fixed');
                } else if (manualMode) {
                    cell.classList.add('user-input');
                } else {
                    cell.classList.add('solved');
                }
                
                // Check if the value violates Sudoku rules
                const tempValue = board[row][col];
                board[row][col] = 0; // Temporarily remove to check
                const isValid = isValidMove(board, row, col, tempValue);
                board[row][col] = tempValue; // Restore
                
                if (!isValid) {
                    cell.classList.add('error');
                }
            }
        });
    }

    // Clear the board
    function clearBoard() {
        // If in input mode, just clear the board
        if (inputMode) {
            board = Array(9).fill().map(() => Array(9).fill(0));
            updateDisplay();
            statusElement.textContent = 'Status: Input mode - create your puzzle';
            return;
        }
        
        // Confirm before clearing
        if (board.some(row => row.some(cell => cell !== 0))) {
            if (!confirm('Are you sure you want to clear the board?')) {
                return;
            }
        }
        
        // Stop timer and reset game state
        if (manualMode) {
            gameStarted = false;
            stopTimer();
        }
        
        if (manualMode) {
            // In manual mode, only clear user-input cells
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    if (originalBoard[row][col] === 0) {
                        board[row][col] = 0;
                    }
                }
            }
        } else {
            // In AI mode, clear everything
            board = Array(9).fill().map(() => Array(9).fill(0));
            originalBoard = Array(9).fill().map(() => Array(9).fill(0));
        }
        
        updateDisplay();
        iterations = 0;
        timeElement.textContent = 'Time: 0.00s';
        iterationsElement.textContent = 'Iterations: 0';
        statusElement.textContent = 'Status: Ready';
        
        // Play clear sound
        playSoundEffect('clear');
    }

    // Generate a solved Sudoku board
    function generateSolvedBoard() {
        // Start with an empty board
        const solvedBoard = Array(9).fill().map(() => Array(9).fill(0));
        
        // Helper function to solve the board (simplified DFS without visualization)
        function solveBoard(board) {
            const emptyCell = findEmptyCell(board);
            if (!emptyCell) return true;
            
            const [row, col] = emptyCell;
            
            // Shuffle numbers 1-9 for randomization
            const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
            for (let i = numbers.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
            }
            
            for (const num of numbers) {
                if (isValidMove(board, row, col, num)) {
                    board[row][col] = num;
                    
                    if (solveBoard(board)) {
                        return true;
                    }
                    
                    board[row][col] = 0;
                }
            }
            
            return false;
        }
        
        // Fill the first few cells with random numbers to create a random seed
        for (let i = 0; i < 3; i++) {
            const row = Math.floor(Math.random() * 9);
            const col = Math.floor(Math.random() * 9);
            const num = Math.floor(Math.random() * 9) + 1;
            
            if (solvedBoard[row][col] === 0 && isValidMove(solvedBoard, row, col, num)) {
                solvedBoard[row][col] = num;
            }
        }
        
        // Solve the board to create a valid, complete solution
        solveBoard(solvedBoard);
        
        return solvedBoard;
    }
    
    // Generate a puzzle with a given difficulty (cells to remove)
    function generatePuzzle(difficulty) {
        // Generate a solved board
        const solvedBoard = generateSolvedBoard();
        const puzzle = JSON.parse(JSON.stringify(solvedBoard));
        
        // Determine how many cells to remove based on difficulty
        let cellsToRemove;
        switch(difficulty) {
            case 'easy':
                cellsToRemove = 40; // 41 clues remaining
                break;
            case 'medium':
                cellsToRemove = 50; // 31 clues remaining
                break;
            case 'hard':
                cellsToRemove = 55; // 26 clues remaining
                break;
            case 'expert':
                cellsToRemove = 60; // 21 clues remaining
                break;
            default:
                cellsToRemove = 45;
        }
        
        // Keep track of cells we've already emptied
        const emptiedCells = new Set();
        
        // Remove cells randomly until we've reached the desired difficulty
        while (emptiedCells.size < cellsToRemove) {
            const row = Math.floor(Math.random() * 9);
            const col = Math.floor(Math.random() * 9);
            const cellIndex = row * 9 + col;
            
            if (!emptiedCells.has(cellIndex)) {
                // Temporarily remove the number
                const temp = puzzle[row][col];
                puzzle[row][col] = 0;
                
                // Check if the puzzle still has a unique solution
                const tempBoard = JSON.parse(JSON.stringify(puzzle));
                const solutions = countSolutions(tempBoard, 2); // Check for up to 2 solutions
                
                if (solutions === 1) {
                    // If the puzzle has a unique solution, keep the cell empty
                    emptiedCells.add(cellIndex);
                } else {
                    // Otherwise, restore the number
                    puzzle[row][col] = temp;
                }
            }
        }
        
        return { puzzle, solution: solvedBoard };
    }
    
    // Count how many solutions a puzzle has (up to maxSolutions)
    function countSolutions(board, maxSolutions) {
        let solutions = 0;
        
        function solve(board) {
            const emptyCell = findEmptyCell(board);
            if (!emptyCell) {
                // Found a solution
                solutions++;
                return solutions >= maxSolutions;
            }
            
            const [row, col] = emptyCell;
            
            for (let num = 1; num <= 9; num++) {
                if (isValidMove(board, row, col, num)) {
                    board[row][col] = num;
                    
                    if (solve(board)) {
                        return true;
                    }
                    
                    board[row][col] = 0;
                }
            }
            
            return false;
        }
        
        solve(board);
        return solutions;
    }
    
    // Generate a new puzzle
    function generateNewPuzzle() {
        // If in input mode, exit it
        if (inputMode) {
            exitInputMode();
        }
        
        // Get current puzzle source
        const puzzleSource = document.querySelector('input[name="puzzle-source"]:checked').value;
        
        // If manual input is selected, enter input mode
        if (puzzleSource === 'manual') {
            enterInputMode();
            return;
        }
        
        // Otherwise generate a random puzzle
        
        // Reset game state
        gameStarted = false;
        stopTimer();
        
        // Show loader
        loader.style.display = 'block';
        
        // Use setTimeout to allow the UI to update before the computation
        setTimeout(() => {
            const difficulty = difficultySelect.value;
            
            // Generate puzzle with unique solution
            const { puzzle, solution } = generatePuzzle(difficulty);
            
            // Store the board and solution
            board = JSON.parse(JSON.stringify(puzzle));
            originalBoard = JSON.parse(JSON.stringify(puzzle));
            solvedBoard = solution;
            
            updateDisplay();
            
            // Hide loader
            loader.style.display = 'none';
            
            // Reset timer display
            timeElement.textContent = 'Time: 0.00s';
            
            // Show difficulty in status
            statusElement.textContent = `Status: New ${difficulty} puzzle generated`;
            
            // Play new puzzle sound
            playSoundEffect('new-puzzle');
        }, 100);
    }

    // Check if a move is valid
    function isValidMove(board, row, col, num) {
        // Check row
        for (let i = 0; i < 9; i++) {
            if (board[row][i] === num) return false;
        }
        
        // Check column
        for (let i = 0; i < 9; i++) {
            if (board[i][col] === num) return false;
        }
        
        // Check 3x3 box
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[boxRow + i][boxCol + j] === num) return false;
            }
        }
        
        return true;
    }

    // Find empty cell
    function findEmptyCell(board) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (board[row][col] === 0) {
                    return [row, col];
                }
            }
        }
        return null; // No empty cell found
    }

    // Update cell visualization during solving
    function updateCell(row, col, value, className) {
        const cells = grid.querySelectorAll('.cell');
        const cellIndex = row * 9 + col;
        const cell = cells[cellIndex];
        
        if (cell) {
            cell.textContent = value || '';
            cell.className = 'cell';
            
            // Add block coloring
            const blockIndex = Math.floor(row / 3) * 3 + Math.floor(col / 3);
            if (blockIndex % 2 === 0) {
                cell.classList.add(`block-${blockIndex}`);
            }
            
            if (className) {
                cell.classList.add(className);
            }
            
            if (originalBoard[row][col] !== 0) {
                cell.classList.add('fixed');
            }
        }
    }

    // Update stats during solving
    function updateStats() {
        const currentTime = (Date.now() - startTime) / 1000;
        timeElement.textContent = `Time: ${currentTime.toFixed(2)}s`;
        iterationsElement.textContent = `Iterations: ${iterations}`;
    }

    // Delay function for visualization
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Check if the current solution is correct
    function checkSolution() {
        // First ensure the board is completely filled
        const emptyCell = findEmptyCell(board);
        if (emptyCell) {
            showSolutionModal('incomplete', 'Your solution is incomplete. Fill all cells first!');
            return;
        }
        
        // Check if each row, column, and box contains all numbers 1-9
        let valid = true;
        
        // Check rows
        for (let row = 0; row < 9; row++) {
            const rowNumbers = new Set();
            for (let col = 0; col < 9; col++) {
                rowNumbers.add(board[row][col]);
            }
            if (rowNumbers.size !== 9) {
                valid = false;
                break;
            }
        }
        
        // Check columns
        if (valid) {
            for (let col = 0; col < 9; col++) {
                const colNumbers = new Set();
                for (let row = 0; row < 9; row++) {
                    colNumbers.add(board[row][col]);
                }
                if (colNumbers.size !== 9) {
                    valid = false;
                    break;
                }
            }
        }
        
        // Check 3x3 boxes
        if (valid) {
            for (let boxRow = 0; boxRow < 3; boxRow++) {
                for (let boxCol = 0; boxCol < 3; boxCol++) {
                    const boxNumbers = new Set();
                    for (let i = 0; i < 3; i++) {
                        for (let j = 0; j < 3; j++) {
                            boxNumbers.add(board[boxRow * 3 + i][boxCol * 3 + j]);
                        }
                    }
                    if (boxNumbers.size !== 9) {
                        valid = false;
                        break;
                    }
                }
                if (!valid) break;
            }
        }
        
        if (valid) {
            showSolutionModal('correct', 'Great job! Your solution is correct!');
            playSoundEffect('success');
            // Stop timer when solution is correct
            stopTimer();
        } else {
            showSolutionModal('incorrect', 'Your solution has errors. Keep trying!');
            playSoundEffect('error');
        }
    }
    
    // Show solution modal
    function showSolutionModal(status, message) {
        solutionMessage.textContent = message;
        solutionModalOverlay.style.display = 'flex';
        
        // Add active class after a small delay for animation
        setTimeout(() => {
            solutionModal.classList.add('active');
        }, 10);
        
        if (status === 'correct') {
            solutionShowBtn.style.display = 'none';
            solutionMessage.style.color = 'var(--success-color)';
        } else if (status === 'incorrect') {
            solutionShowBtn.style.display = 'inline-block';
            solutionMessage.style.color = 'var(--danger-color)';
        } else {
            solutionShowBtn.style.display = 'none';
            solutionMessage.style.color = 'var(--warning-color)';
        }
    }
    
    // Close solution modal
    function closeSolutionModal() {
        solutionModal.classList.remove('active');
        setTimeout(() => {
            solutionModalOverlay.style.display = 'none';
        }, 300);
    }

    // Show the algorithm selection modal
    function showAlgorithmModal() {
        algorithmModalOverlay.style.display = 'flex';
        
        // Add active class after a small delay for animation
        setTimeout(() => {
            algorithmModal.classList.add('active');
        }, 10);
        
        // Select the current algorithm
        algorithmModalOptions.forEach(option => {
            if (option.dataset.algorithm === selectedAlgorithm) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }
    
    // Close algorithm modal
    function closeAlgorithmModal() {
        algorithmModal.classList.remove('active');
        setTimeout(() => {
            algorithmModalOverlay.style.display = 'none';
        }, 300);
    }
    
    // Show input mode modal
    function showInputModeModal() {
        inputModeModalOverlay.style.display = 'flex';
        
        // Add active class after a small delay for animation
        setTimeout(() => {
            inputModeModal.classList.add('active');
        }, 10);
    }
    
    // Close input mode modal
    function closeInputModeModal() {
        inputModeModal.classList.remove('active');
        setTimeout(() => {
            inputModeModalOverlay.style.display = 'none';
        }, 300);
    }
    
    // Enter manual input mode
    function enterInputMode() {
        inputMode = true;
        board = Array(9).fill().map(() => Array(9).fill(0));
        originalBoard = Array(9).fill().map(() => Array(9).fill(0));
        solvedBoard = null;
        
        // Update UI
        updateDisplay();
        statusElement.textContent = 'Status: Input mode - create your puzzle';
        
        // Show the input mode modal
        showInputModeModal();
    }
    
   // Exit manual input mode
   function exitInputMode() {
    inputMode = false;
    
    // Reset the board
    board = Array(9).fill().map(() => Array(9).fill(0));
    originalBoard = Array(9).fill().map(() => Array(9).fill(0));
    
    // Update puzzle source radio button
    document.querySelector('input[name="puzzle-source"][value="random"]').checked = true;
    updatePuzzleSourceUI();
    
    // Generate a new puzzle
    generateNewPuzzle();
}

// Set current board as the puzzle
function setAsCurrentPuzzle() {
    // At least 17 clues are required for a Sudoku to have a unique solution
    let clueCount = 0;
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (board[row][col] !== 0) {
                clueCount++;
            }
        }
    }
    
    if (clueCount < 17) {
        showToast('You need at least 17 clues for a valid Sudoku puzzle', 'warning');
        return;
    }
    
    // Check if the current board is valid and solvable
    const tempBoard = JSON.parse(JSON.stringify(board));
    const solutions = countSolutions(tempBoard, 2);
    
    if (solutions === 0) {
        showToast('This puzzle has no solutions. Please modify it.', 'error');
        return;
    }
    
    if (solutions > 1) {
        showToast('This puzzle has multiple solutions. It needs more clues.', 'warning');
        return;
    }
    
    // Set the current board as the original
    originalBoard = JSON.parse(JSON.stringify(board));
    
    // Solve to get the solution
    const solvedTemp = JSON.parse(JSON.stringify(board));
    const solveQuietly = (board) => {
        const emptyCell = findEmptyCell(board);
        if (!emptyCell) return true;
        
        const [row, col] = emptyCell;
        
        for (let num = 1; num <= 9; num++) {
            if (isValidMove(board, row, col, num)) {
                board[row][col] = num;
                
                if (solveQuietly(board)) {
                    return true;
                }
                
                board[row][col] = 0;
            }
        }
        
        return false;
    };
    
    solveQuietly(solvedTemp);
    solvedBoard = solvedTemp;
    
    // Exit input mode
    inputMode = false;
    
    // Clear the board to start solving
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (originalBoard[row][col] === 0) {
                board[row][col] = 0;
            }
        }
    }
    
    updateDisplay();
    statusElement.textContent = 'Status: Custom puzzle set. Ready to solve.';
    showToast('Custom puzzle is set. You can now solve it!', 'success');
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Show toast with animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Hide and remove after timeout
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Play sound effects
function playSoundEffect(type) {
    // Sound is disabled by default to not annoy users
    // Uncomment and implement if needed
    /*
    const sounds = {
        'place': 'path/to/place-sound.mp3',
        'clear': 'path/to/clear-sound.mp3',
        'success': 'path/to/success-sound.mp3',
        'error': 'path/to/error-sound.mp3',
        'new-puzzle': 'path/to/new-puzzle-sound.mp3'
    };
    
    const sound = new Audio(sounds[type]);
    sound.play();
    */
}

// Solve using DFS (Depth-First Search)
async function solveDFS() {
    const emptyCell = findEmptyCell(board);
    if (!emptyCell) return true; // No empty cells left, solution found
    
    const [row, col] = emptyCell;
    
    for (let num = 1; num <= 9; num++) {
        iterations++;
        updateStats();
        
        // Check if move is valid
        if (isValidMove(board, row, col, num)) {
            board[row][col] = num;
            updateCell(row, col, num, 'processing');
            await delay(10); // Small delay for visualization
            
            // Recursively try to solve
            if (await solveDFS()) {
                updateCell(row, col, num, 'solved');
                return true;
            }
            
            // If not successful, backtrack
            board[row][col] = 0;
            updateCell(row, col, '', '');
            await delay(10);
        }
    }
    
    return false; // No solution found for this configuration
}

// Solve using BFS (Breadth-First Search)
async function solveBFS() {
    // BFS requires a queue of states to explore
    const queue = [];
    
    // Initial state: current board and first empty cell
    const initialEmptyCell = findEmptyCell(board);
    if (!initialEmptyCell) return true; // Already solved
    
    // State format: [board, row, col]
    queue.push([JSON.parse(JSON.stringify(board)), initialEmptyCell[0], initialEmptyCell[1]]);
    
    const visited = new Set(); // To avoid revisiting same states
    
    while (queue.length > 0) {
        const [currentBoard, row, col] = queue.shift();
        
        // Create a string representation of the board for visited set
        const boardString = currentBoard.flat().join('');
        if (visited.has(boardString)) continue;
        visited.add(boardString);
        
        // Update the display with current state
        board = JSON.parse(JSON.stringify(currentBoard));
        updateDisplay();
        
        iterations++;
        updateStats();
        await delay(10);
        
        // Try all possible values for the current cell
        for (let num = 1; num <= 9; num++) {
            // Check if move is valid
            if (isValidMove(currentBoard, row, col, num)) {
                // Create a new board with this move
                const newBoard = JSON.parse(JSON.stringify(currentBoard));
                newBoard[row][col] = num;
                
                // Find next empty cell
                const nextEmptyCell = findEmptyCell(newBoard);
                
                // If no empty cell left, we found a solution
                if (!nextEmptyCell) {
                    board = newBoard;
                    updateDisplay();
                    return true;
                }
                
                // Add new state to queue
                queue.push([newBoard, nextEmptyCell[0], nextEmptyCell[1]]);
            }
        }
    }
    
    return false; // No solution found
}

// Calculate heuristic for A* (number of remaining empty cells)
function calculateHeuristic(board) {
    let emptyCount = 0;
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (board[row][col] === 0) {
                emptyCount++;
            }
        }
    }
    return emptyCount;
}

// Solve using A* algorithm
async function solveAStar() {
    // Priority queue for A* (using array + sorting for simplicity)
    let priorityQueue = [];
    
    // Initial state
    const initialEmptyCell = findEmptyCell(board);
    if (!initialEmptyCell) return true; // Already solved
    
    // State format: [board, row, col, cost, heuristic]
    // cost = number of cells filled so far
    // heuristic = number of empty cells remaining
    const initialCost = 0;
    const initialHeuristic = calculateHeuristic(board);
    priorityQueue.push([
        JSON.parse(JSON.stringify(board)), 
        initialEmptyCell[0], 
        initialEmptyCell[1], 
        initialCost, 
        initialHeuristic
    ]);
    
    const visited = new Set();
    
    while (priorityQueue.length > 0) {
        // Sort by f(n) = g(n) + h(n) and take the best state
        priorityQueue.sort((a, b) => (a[3] + a[4]) - (b[3] + b[4]));
        const [currentBoard, row, col, cost, heuristic] = priorityQueue.shift();
        
        // Create a string representation of the board for visited set
        const boardString = currentBoard.flat().join('');
        if (visited.has(boardString)) continue;
        visited.add(boardString);
        
        // Update the display with current state
        board = JSON.parse(JSON.stringify(currentBoard));
        updateDisplay();
        
        iterations++;
        updateStats();
        await delay(10);
        
        // Try all possible values for the current cell
        for (let num = 1; num <= 9; num++) {
            // Check if move is valid
            if (isValidMove(currentBoard, row, col, num)) {
                // Create a new board with this move
                const newBoard = JSON.parse(JSON.stringify(currentBoard));
                newBoard[row][col] = num;
                
                // Find next empty cell
                const nextEmptyCell = findEmptyCell(newBoard);
                
                // If no empty cell left, we found a solution
                if (!nextEmptyCell) {
                    board = newBoard;
                    updateDisplay();
                    return true;
                }
                
                // Calculate new cost and heuristic
                const newCost = cost + 1;
                const newHeuristic = calculateHeuristic(newBoard);
                
                // Add new state to priority queue
                priorityQueue.push([
                    newBoard, 
                    nextEmptyCell[0], 
                    nextEmptyCell[1], 
                    newCost, 
                    newHeuristic
                ]);
            }
        }
    }
    
    return false; // No solution found
}

// Main solve function
async function solve() {
    if (solving) return;
    
    if (!manualMode) {
        // In AI mode, show algorithm picker
        showAlgorithmModal();
        return;
    }
    
    // In manual mode, reveal the solution
    await revealSolution();
}

// Immediately show the answer without animation
function showAnswer() {
    if (solving) return;
    
    // If we're in input mode, first try to set the puzzle
    if (inputMode) {
        setAsCurrentPuzzle();
        return;
    }
    
    // If we already have a solution, display it
    if (solvedBoard) {
        board = JSON.parse(JSON.stringify(solvedBoard));
        updateDisplay();
        statusElement.textContent = 'Status: Solution displayed';
        
        // Stop timer if manual mode
        if (manualMode) {
            stopTimer();
            gameStarted = false;
        }
        
        return;
    }
    
    // Otherwise solve it quickly
    const tempBoard = JSON.parse(JSON.stringify(originalBoard));
    let solved = false;
    
    // Quick solve function (no animation)
    function quickSolve(board) {
        const emptyCell = findEmptyCell(board);
        if (!emptyCell) return true;
        
        const [row, col] = emptyCell;
        
        for (let num = 1; num <= 9; num++) {
            if (isValidMove(board, row, col, num)) {
                board[row][col] = num;
                
                if (quickSolve(board)) {
                    return true;
                }
                
                board[row][col] = 0;
            }
        }
        
        return false;
    }
    
    // Show loader
    loader.style.display = 'block';
    
    // Solve after a small delay to allow loader to appear
    setTimeout(() => {
        solved = quickSolve(tempBoard);
        
        if (solved) {
            solvedBoard = JSON.parse(JSON.stringify(tempBoard));
            board = JSON.parse(JSON.stringify(tempBoard));
            updateDisplay();
            statusElement.textContent = 'Status: Solution displayed';
            
            // Stop timer if manual mode
            if (manualMode) {
                stopTimer();
                gameStarted = false;
            }
        } else {
            showToast('No solution exists for this puzzle!', 'error');
            statusElement.textContent = 'Status: No solution exists';
        }
        
        // Hide loader
        loader.style.display = 'none';
    }, 100);
}

// Start solving with the selected algorithm
async function startSolving() {
    closeAlgorithmModal();
    
    solving = true;
    solveBtn.disabled = true;
    showAnswerBtn.disabled = true;
    checkBtn.disabled = true;
    newBtn.disabled = true;
    clearBtn.disabled = true;
    
    // Add class to container for solving animation
    document.querySelector('.container').classList.add('solving');
    
    iterations = 0;
    startTime = Date.now();
    statusElement.textContent = 'Status: Solving with ' + selectedAlgorithm.toUpperCase() + '...';
    
    // Make a copy of the original board
    board = JSON.parse(JSON.stringify(originalBoard));
    updateDisplay(); 
    
    let solved = false;
    
    try {
        if (selectedAlgorithm === 'dfs') {
            solved = await solveDFS();
        } else if (selectedAlgorithm === 'bfs') {
            solved = await solveBFS();
        } else if (selectedAlgorithm === 'astar') {
            solved = await solveAStar();
        }
        
        if (solved) {
            statusElement.textContent = 'Status: Solved with ' + selectedAlgorithm.toUpperCase() + '!';
            solvedBoard = JSON.parse(JSON.stringify(board));
            playSoundEffect('success');
        } else {
            statusElement.textContent = 'Status: No solution found';
            playSoundEffect('error');
        }
    } catch (error) {
        console.error('Error solving:', error);
        statusElement.textContent = 'Status: Error occurred';
        playSoundEffect('error');
    }
    
    updateStats();
    solving = false;
    solveBtn.disabled = false;
    showAnswerBtn.disabled = false;
    checkBtn.disabled = false;
    newBtn.disabled = false;
    clearBtn.disabled = false;
    
    // Remove solving animation class
    document.querySelector('.container').classList.remove('solving');
}

// Reveal the solution for manual mode
async function revealSolution() {
    if (solving) return;
    
    solving = true;
    solveBtn.disabled = true;
    showAnswerBtn.disabled = true;
    checkBtn.disabled = true;
    newBtn.disabled = true;
    clearBtn.disabled = true;
    
    // Stop timer when revealing solution
    stopTimer();
    gameStarted = false;
    
    statusElement.textContent = 'Status: Revealing solution...';
    
    // If we don't have a solved board yet, solve the current puzzle
    if (!solvedBoard) {
        // Save the current state
        const userAttempt = JSON.parse(JSON.stringify(board));
        
        // Reset to the original puzzle
        board = JSON.parse(JSON.stringify(originalBoard));
        
        // Use DFS to solve quickly (without visualization)
        const tempBoard = JSON.parse(JSON.stringify(board));
        let solved = false;
        
        try {
            // Solve without animation for speed
            function quickSolve(board) {
                const emptyCell = findEmptyCell(board);
                if (!emptyCell) return true;
                
                const [row, col] = emptyCell;
                
                for (let num = 1; num <= 9; num++) {
                    if (isValidMove(board, row, col, num)) {
                        board[row][col] = num;
                        
                        if (quickSolve(board)) {
                            return true;
                        }
                        
                        board[row][col] = 0;
                    }
                }
                
                return false;
            }
            
            solved = quickSolve(tempBoard);
            
            if (solved) {
                solvedBoard = JSON.parse(JSON.stringify(tempBoard));
                
                // Animate the solution being revealed
                const originalCells = [];
                const solutionCells = [];
                
                // Identify cells to be revealed
                for (let row = 0; row < 9; row++) {
                    for (let col = 0; col < 9; col++) {
                        if (originalBoard[row][col] === 0) {
                            if (userAttempt[row][col] !== solvedBoard[row][col]) {
                                originalCells.push([row, col, userAttempt[row][col]]);
                                solutionCells.push([row, col, solvedBoard[row][col]]);
                            }
                        }
                    }
                }
                
                // Show animation for incorrect cells
                for (const [row, col, value] of originalCells) {
                    if (value !== 0) {
                        updateCell(row, col, value, 'error');
                    }
                }
                
                await delay(500);
                
                // Reveal solution with animation
                for (let i = 0; i < solutionCells.length; i++) {
                    const [row, col, value] = solutionCells[i];
                    board[row][col] = value;
                    updateCell(row, col, value, 'solved');
                    await delay(50);
                }
                
                statusElement.textContent = 'Status: Solution revealed!';
            } else {
                // No solution exists
                statusElement.textContent = 'Status: No solution exists for this puzzle!';
                // Restore user's attempt
                board = userAttempt;
            }
        } catch (error) {
            console.error('Error solving:', error);
            statusElement.textContent = 'Status: Error occurred while solving';
            // Restore user's attempt
            board = userAttempt;
        }
    } else {
        // We already have a solution, just reveal it
        // Save current state
        const userAttempt = JSON.parse(JSON.stringify(board));
        
        // Identify cells to be revealed
        const cellsToReveal = [];
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (originalBoard[row][col] === 0) {
                    if (userAttempt[row][col] !== solvedBoard[row][col]) {
                        cellsToReveal.push([row, col, solvedBoard[row][col]]);
                    }
                }
            }
        }
        
        // Reveal with animation
        for (let i = 0; i < cellsToReveal.length; i++) {
            const [row, col, value] = cellsToReveal[i];
            board[row][col] = value;
            updateCell(row, col, value, 'solved');
            await delay(50);
        }
        
        statusElement.textContent = 'Status: Solution revealed!';
    }
    
    updateDisplay();
    
    solving = false;
    solveBtn.disabled = false;
    showAnswerBtn.disabled = false;
    checkBtn.disabled = false;
    newBtn.disabled = false;
    clearBtn.disabled = false;
}

// Toggle between manual and AI mode
function toggleMode() {
    manualMode = document.querySelector('input[name="mode"]:checked').value === 'manual';
    
    // Exit input mode if we're in it
    if (inputMode) {
        exitInputMode();
    }
    
    // Update UI based on mode
    algorithmSelect.parentElement.style.display = manualMode ? 'none' : 'flex';
    solveBtn.textContent = manualMode ? 'Reveal Solution' : 'Solve with AI';
    
    // Reset the board for the new mode
    if (board.some(row => row.some(cell => cell !== 0))) {
        if (confirm('Changing modes will reset the current puzzle. Continue?')) {
            clearBoard();
            generateNewPuzzle();
        } else {
            // Revert the radio button selection
            document.querySelector(`input[name="mode"][value="${manualMode ? 'ai' : 'manual'}"]`).checked = true;
            manualMode = !manualMode;
        }
    }
    
    updateDisplay();
}

// Update UI based on puzzle source selection
function updatePuzzleSourceUI() {
    const puzzleSource = document.querySelector('input[name="puzzle-source"]:checked').value;
    
    // Hide/show upload section
    uploadSection.style.display = puzzleSource === 'file' ? 'flex' : 'none';
    
    // Hide/show manual input section
    manualInputSection.style.display = puzzleSource === 'manual' ? 'flex' : 'none';
}

// Toggle puzzle source
function togglePuzzleSource() {
    const puzzleSource = document.querySelector('input[name="puzzle-source"]:checked').value;
    
    // Exit input mode if active
    if (inputMode && puzzleSource !== 'manual') {
        exitInputMode();
    }
    
    updatePuzzleSourceUI();
    
    // If manual input is selected, enter input mode
    if (puzzleSource === 'manual') {
        enterInputMode();
    }
    
    // If file upload is selected, just show the upload section
    // User needs to click the load button
}

/**
 * Load a puzzle from uploaded file
 */
function loadUploadedPuzzle() {
    const file = uploadInput.files[0];
    if (!file) {
        showToast('Please select a file first', 'warning');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const puzzleText = e.target.result;
            const puzzleArray = parseSudokuFile(puzzleText);
            
            if (!isValidPuzzle(puzzleArray)) {
                showToast('Invalid puzzle format. Please check your file.', 'error');
                return;
            }
            
            // Reset game state
            gameStarted = false;
            stopTimer();
            
            // Load the puzzle
            board = JSON.parse(JSON.stringify(puzzleArray));
            originalBoard = JSON.parse(JSON.stringify(puzzleArray));
            solvedBoard = null; // Reset solution as we don't know it yet
            
            updateDisplay();
            statusElement.textContent = 'Status: Custom puzzle loaded successfully';
            playSoundEffect('new-puzzle');
            
            // Reset timer display
            timeElement.textContent = 'Time: 0.00s';
            iterationsElement.textContent = 'Iterations: 0';
            
            // Show success message
            showToast('Custom puzzle loaded successfully!', 'success');
        } catch (error) {
            console.error('Error parsing file:', error);
            showToast('Error parsing file. Make sure it\'s in the correct format.', 'error');
        }
    };
    
    reader.onerror = function() {
        showToast('Error reading file', 'error');
    };
    
    reader.readAsText(file);
}

/**
 * Parse a text file containing a Sudoku puzzle
 * Supports formats:
 * - Simple grid of numbers (0 or . for empty)
 * - CSV format
 * - Space-separated values
 */
function parseSudokuFile(fileContent) {
    // Remove any BOM or other special characters
    fileContent = fileContent.replace(/^\uFEFF/, '');
    
    // Split into lines, ignoring empty lines
    const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== '');
    
    // Check if we have 9 rows
    if (lines.length !== 9) {
        throw new Error(`Expected 9 rows, got ${lines.length}`);
    }
    
    // Initialize the puzzle array
    const puzzle = Array(9).fill().map(() => Array(9).fill(0));
    
    // Process each line
    for (let row = 0; row < 9; row++) {
        const line = lines[row].trim();
        
        // Handle CSV format (values separated by commas)
        if (line.includes(',')) {
            const values = line.split(',');
            if (values.length !== 9) {
                throw new Error(`Row ${row + 1}: Expected 9 values, got ${values.length}`);
            }
            
            for (let col = 0; col < 9; col++) {
                const val = values[col].trim();
                puzzle[row][col] = (val === '.' || val === '') ? 0 : parseInt(val);
            }
        }
        // Handle space-separated values
        else if (line.includes(' ') && line.split(/\s+/).filter(Boolean).length === 9) {
            const values = line.split(/\s+/).filter(Boolean);
            for (let col = 0; col < 9; col++) {
                const val = values[col].trim();
                puzzle[row][col] = (val === '.' || val === '') ? 0 : parseInt(val);
            }
        }
        // Handle single-character format (no separators)
        else if (line.replace(/[0-9\.]/g, '').length === 0 && line.length === 9) {
            for (let col = 0; col < 9; col++) {
                const val = line[col];
                puzzle[row][col] = (val === '.' || val === '0') ? 0 : parseInt(val);
            }
        }
        // Any other format - try to extract 9 numbers however we can
        else {
            // Remove any non-digit and non-dot characters, then extract characters
            const cleanLine = line.replace(/[^0-9\.]/g, '');
            if (cleanLine.length < 9) {
                throw new Error(`Row ${row + 1}: Not enough values`);
            }
            
            for (let col = 0; col < 9; col++) {
                const val = cleanLine[col];
                puzzle[row][col] = (val === '.' || val === '0') ? 0 : parseInt(val);
            }
        }
    }
    
    return puzzle;
}

/**
 * Validate the puzzle to ensure it follows Sudoku rules
 */
function isValidPuzzle(puzzle) {
    // Check dimensions
    if (puzzle.length !== 9) return false;
    for (let row of puzzle) {
        if (row.length !== 9) return false;
    }
    
    // Check that all values are numbers between 0-9
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const val = puzzle[row][col];
            if (isNaN(val) || val < 0 || val > 9) return false;
        }
    }
    
    // Check that the initial state doesn't violate Sudoku rules
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const val = puzzle[row][col];
            if (val !== 0) {
                // Temporarily set to 0 to check if this placement is valid
                puzzle[row][col] = 0;
                if (!isValidMove(puzzle, row, col, val)) {
                    // Restore the value before returning
                    puzzle[row][col] = val;
                    return false;
                }
                // Restore the value
                puzzle[row][col] = val;
            }
        }
    }
    
    return true;
}

/**
 * Export the current puzzle to a file
 */
function exportCurrentPuzzle() {
    // Create a text representation of the puzzle
    let puzzleText = '';
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            puzzleText += originalBoard[row][col] || '.';
        }
        puzzleText += '\n';
    }
    
    // Create a Blob with the puzzle data
    const blob = new Blob([puzzleText], { type: 'text/plain' });
    
    // Create a download link and trigger a click
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sudoku_puzzle.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Show confirmation
    showToast('Puzzle exported successfully!', 'success');
}

// Event listeners for modals
algorithmModalOptions.forEach(option => {
    option.addEventListener('click', () => {
        // Remove selected class from all options
        algorithmModalOptions.forEach(opt => opt.classList.remove('selected'));
        // Add selected class to clicked option
        option.classList.add('selected');
        // Update selected algorithm
        selectedAlgorithm = option.dataset.algorithm;
    });
});

algorithmStartBtn.addEventListener('click', startSolving);
algorithmCancelBtn.addEventListener('click', closeAlgorithmModal);

solutionShowBtn.addEventListener('click', () => {
    closeSolutionModal();
    revealSolution();
});

solutionContinueBtn.addEventListener('click', closeSolutionModal);

inputModeGotItBtn.addEventListener('click', closeInputModeModal);

// Close modals when clicking outside of them
algorithmModalOverlay.addEventListener('click', (e) => {
    if (e.target === algorithmModalOverlay) {
        closeAlgorithmModal();
    }
});

solutionModalOverlay.addEventListener('click', (e) => {
    if (e.target === solutionModalOverlay) {
        closeSolutionModal();
    }
});

inputModeModalOverlay.addEventListener('click', (e) => {
    if (e.target === inputModeModalOverlay) {
        closeInputModeModal();
    }
});

// Main event listeners
solveBtn.addEventListener('click', solve);
showAnswerBtn.addEventListener('click', showAnswer);
checkBtn.addEventListener('click', checkSolution);
newBtn.addEventListener('click', generateNewPuzzle);
clearBtn.addEventListener('click', clearBoard);
exportBtn.addEventListener('click', exportCurrentPuzzle);
uploadBtn.addEventListener('click', loadUploadedPuzzle);
setPuzzleBtn.addEventListener('click', setAsCurrentPuzzle);
clearInputBtn.addEventListener('click', clearBoard);

// Mode selection listeners
modeRadios.forEach(radio => {
    radio.addEventListener('change', toggleMode);
});

// Puzzle source selection listeners
puzzleSourceRadios.forEach(radio => {
    radio.addEventListener('change', togglePuzzleSource);
});

// Create CSS for dynamic elements
const style = document.createElement('style');
style.textContent = `
    .number-picker {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 5px;
        background-color: white;
        padding: 10px;
        border-radius: 5px;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
        z-index: 1000;
    }
    
    .number-option {
        width: 40px;
        height: 40px;
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: var(--secondary-color);
        color: white;
        font-weight: bold;
        border-radius: 5px;
        cursor: pointer;
        transition: transform 0.1s, background-color 0.2s;
    }
    
    .number-option:hover {
        transform: scale(1.05);
        background-color: var(--primary-color);
    }
    
    .number-option.clear {
        background-color: var(--danger-color);
    }
    
    .cell.number-changed {
        animation: pulse 0.3s;
    }
    
    .toast {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 20px;
        border-radius: 5px;
        color: white;
        font-weight: 500;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s, transform 0.3s;
    }
    
    .toast.show {
        opacity: 1;
        transform: translateX(-50%) translateY(-10px);
    }
    
    .toast.info {
        background-color: var(--secondary-color);
    }
    
    .toast.success {
        background-color: var(--success-color);
    }
    
    .toast.warning {
        background-color: var(--warning-color);
    }
    
    .toast.error {
        background-color: var(--danger-color);
    }
`;

document.head.appendChild(style);

// Initialize the grid and generate first puzzle
initializeGrid();

// Set initial UI based on mode
toggleMode();

// Set initial UI based on puzzle source
updatePuzzleSourceUI();

// Generate the first puzzle
generateNewPuzzle();
}); 