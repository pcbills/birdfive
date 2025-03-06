// Core game state
const state = {
    birdData: [], // Will hold the full dataset from CSV
    currentBirds: [], // Current 5 birds for the puzzle
    selectedInputBox: null, // Currently selected input box
    filledBoxes: {}, // Track which boxes are filled
    activeWords: {} // Track which words are active/used
};

// DOM Elements
const elements = {
    birdsContainer: document.getElementById('birds-container'),
    wordBank: document.getElementById('word-bank'),
    resetButton: document.getElementById('reset-button'),
    newPuzzleButton: document.getElementById('new-puzzle-button'),
    checkAnswerButton: document.getElementById('check-answer-button'),
    showAnswerButton: document.getElementById('show-answer-button'),
    helpButton: document.getElementById('help-button'),
    helpModal: document.getElementById('help-modal'),
    imageModal: document.getElementById('image-modal'),
    modalImage: document.getElementById('modal-image')
};

// Load bird list
import { birds } from './birdList.js';

async function loadBirdData(){
    state.birdData = birds;
    return birds;
}


// Select 5 random birds for the game
function selectRandomBirds() {
    const shuffled = [...state.birdData].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);
}

// Initialize the birds display
function initializeBirdsDisplay() {
    elements.birdsContainer.innerHTML = '';

    state.currentBirds.forEach((bird, index) => {
        const birdItem = document.createElement('div');
        birdItem.className = 'bird-item';

        // Create bird image
        const img = document.createElement('img');
        img.className = 'bird-image';
        img.src = bird.photoLink;
        img.alt = `Bird ${index + 1}`;
        img.onerror = () => {
            // If image loading fails, use placeholder
            img.src = `/api/placeholder/120/120`;
            console.log(`Failed to load image: ${bird.photoLink}`);
        };

        // Add click event listener to the image
        img.addEventListener('click', handleBirdImageClick);

        // Create input boxes
        const inputsContainer = document.createElement('div');
        inputsContainer.className = 'bird-inputs';

        // Input box for Word 1
        const input1 = document.createElement('div');
        input1.className = 'input-box';
        input1.dataset.birdIndex = index;
        input1.dataset.wordType = 'word1';
        input1.addEventListener('click', handleInputBoxClick);

        // Input box for Word 2
        const input2 = document.createElement('div');
        input2.className = 'input-box';
        input2.dataset.birdIndex = index;
        input2.dataset.wordType = 'word2';
        input2.addEventListener('click', handleInputBoxClick);

        // Append elements
        inputsContainer.appendChild(input1);
        inputsContainer.appendChild(input2);

        birdItem.appendChild(img);
        birdItem.appendChild(inputsContainer);

        elements.birdsContainer.appendChild(birdItem);
    });
}


// Initialize the word bank
// Replace the initializeWordBank function with this updated version
function initializeWordBank() {
    elements.wordBank.innerHTML = '';

    // Collect all words
    const words = [];
    state.currentBirds.forEach(bird => {
        words.push(bird.word1);
        words.push(bird.word2);
    });

    // Shuffle words
    const shuffledWords = [...words].sort(() => 0.5 - Math.random());

    // Initialize active words tracking
    state.activeWords = {};

    // Create word buttons with unique IDs
    shuffledWords.forEach((word, index) => {
        const wordId = `word-${index}`; // Create unique ID based on position
        state.activeWords[wordId] = false; // Track by ID instead of word text

        const wordButton = document.createElement('div');
        wordButton.className = 'word-item';
        wordButton.textContent = word;
        wordButton.dataset.word = word;
        wordButton.dataset.wordId = wordId; // Store the unique ID
        wordButton.addEventListener('click', handleWordClick);

        elements.wordBank.appendChild(wordButton);
    });
}

// Handle input box click
function handleInputBoxClick(event) {
    const inputBox = event.currentTarget;

    // If box is already filled, clear it
    if (inputBox.textContent) {
        const word = inputBox.textContent;
        const wordId = inputBox.dataset.wordId; // Get the stored wordId

        inputBox.textContent = '';
        inputBox.classList.remove('filled', 'correct', 'incorrect');

        // Mark word as available using its specific ID
        if (wordId && state.activeWords[wordId]) {
            state.activeWords[wordId] = false;
        }

        // Remove the wordId from the input
        delete inputBox.dataset.wordId;

        updateWordButtonStates();

        // Remove from filled boxes tracking
        const key = `${inputBox.dataset.birdIndex}-${inputBox.dataset.wordType}`;
        delete state.filledBoxes[key];

        return;
    }

    // Deselect previously selected box
    if (state.selectedInputBox) {
        state.selectedInputBox.classList.remove('active');
    }

    // Select this box
    inputBox.classList.add('active');
    state.selectedInputBox = inputBox;
}

// Handle word click
function handleWordClick(event) {
    const wordButton = event.currentTarget;
    const word = wordButton.dataset.word;
    const wordId = wordButton.dataset.wordId;

    // Check if this specific word button is already in use
    if (state.activeWords[wordId]) {
        return;
    }

    // Check if an input box is selected
    if (!state.selectedInputBox) {
        showToast('Select an input box first!');
        return;
    }

    // Place word in selected input box
    state.selectedInputBox.textContent = word;
    state.selectedInputBox.classList.add('filled');
    state.selectedInputBox.classList.remove('active');

    // Store the wordId in the input box for reference when removing
    state.selectedInputBox.dataset.wordId = wordId;

    // Mark this specific word instance as in use
    state.activeWords[wordId] = true;

    // Track filled box
    const key = `${state.selectedInputBox.dataset.birdIndex}-${state.selectedInputBox.dataset.wordType}`;
    state.filledBoxes[key] = word;

    // Update word button states
    updateWordButtonStates();

    // Clear selection
    state.selectedInputBox = null;

    // Check if all boxes are filled
    if (Object.keys(state.filledBoxes).length === 10) {
        checkWinCondition();
    }
}

// Update word button states (active/inactive)
function updateWordButtonStates() {
    const wordButtons = elements.wordBank.querySelectorAll('.word-item');

    wordButtons.forEach(button => {
        const wordId = button.dataset.wordId;

        if (state.activeWords[wordId]) {
            button.classList.add('used');
        } else {
            button.classList.remove('used');
        }
    });
}
// Add this new function to check answers without showing win message
function checkAnswers() {
    // Check if all boxes are filled
    if (Object.keys(state.filledBoxes).length < 10) {
        showToast('Fill all boxes before checking!');
        return;
    }
    
    let correctCount = 0;
    
    // Get all input boxes
    const inputBoxes = document.querySelectorAll('.input-box');
    
    // Check each input box
    inputBoxes.forEach(box => {
        const birdIndex = box.dataset.birdIndex;
        const wordType = box.dataset.wordType;
        const placedWord = box.textContent;
        const correctWord = state.currentBirds[birdIndex][wordType];
        
        // Remove previous result classes
        box.classList.remove('correct', 'incorrect');
        
        // Apply appropriate class based on correctness
        if (placedWord === correctWord) {
            box.classList.add('correct');
            correctCount++;
        } else {
            box.classList.add('incorrect');
        }
    });
    
    // If all answers are correct, show win message
    if (correctCount === 10) {
        showWinMessage();
    } else {
        showToast(`${correctCount}/10 correct`);
    }
}
// Check if player has won
function checkWinCondition() {
    let allCorrect = true;

    // Check each filled box against correct answers
    for (const key in state.filledBoxes) {
        const [birdIndex, wordType] = key.split('-');
        const placedWord = state.filledBoxes[key];
        const correctWord = state.currentBirds[birdIndex][wordType];

        if (placedWord !== correctWord) {
            allCorrect = false;
            break;
        }
    }

    if (allCorrect) {
        showWinMessage();
        highlightCorrectAnswers();
    }
}

// Show win message
function showWinMessage() {
    // Create win message if it doesn't exist
    if (!document.getElementById('win-message')) {
        // Create win message
        const messageDiv = document.createElement('div');
        messageDiv.id = 'win-message';

        // Add trophy icon
        const trophy = document.createElement('span');
        trophy.className = 'trophy';
        trophy.textContent = '🏆';
        messageDiv.appendChild(trophy);

        // Add congratulatory text
        const text = document.createElement('div');
        text.textContent = ['Amazing!', 'Bird-tastic!', 'That\'s Birdfive!'][Math.floor(Math.random() * 3)];
        messageDiv.appendChild(text);

        document.body.appendChild(messageDiv);

        // Remove message after delay
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }
}

// Highlight correct answers
function highlightCorrectAnswers() {
    const inputBoxes = document.querySelectorAll('.input-box');

    inputBoxes.forEach(box => {
        const birdIndex = box.dataset.birdIndex;
        const wordType = box.dataset.wordType;
        const word = box.textContent;

        if (word === state.currentBirds[birdIndex][wordType]) {
            box.classList.add('correct');
        }
    });
}

// Reset the game
function resetGame() {
    // Clear all input boxes
    const inputBoxes = document.querySelectorAll('.input-box');
    inputBoxes.forEach(box => {
        box.textContent = '';
        box.classList.remove('filled', 'active', 'correct', 'incorrect');
        delete box.dataset.wordId; // Clear the wordId reference
    });

    // Reset game state
    state.selectedInputBox = null;
    state.filledBoxes = {};

    // Reset word buttons
    Object.keys(state.activeWords).forEach(wordId => {
        state.activeWords[wordId] = false;
    });
    updateWordButtonStates();

    // Remove win message if present
    const winMessage = document.getElementById('win-message');
    if (winMessage) {
        winMessage.remove();
    }
}

// Show the answers
function showAnswers() {
    resetGame();

    // Get all word buttons to map words to their IDs
    const wordButtons = elements.wordBank.querySelectorAll('.word-item');
    const wordToIdMap = new Map();

    // Create a map of word text to available wordIds
    wordButtons.forEach(button => {
        const word = button.dataset.word;
        const wordId = button.dataset.wordId;

        if (!wordToIdMap.has(word)) {
            wordToIdMap.set(word, []);
        }
        wordToIdMap.get(word).push(wordId);
    });

    // Get all input boxes
    const inputBoxes = document.querySelectorAll('.input-box');

    // Track which word IDs have been used
    const usedWordIds = new Set();

    // Fill in each box with the correct answer
    inputBoxes.forEach(box => {
        const birdIndex = box.dataset.birdIndex;
        const wordType = box.dataset.wordType;
        const correctWord = state.currentBirds[birdIndex][wordType];

        // Find an available ID for this word
        const availableIds = wordToIdMap.get(correctWord).filter(id => !usedWordIds.has(id));

        if (availableIds.length > 0) {
            const wordId = availableIds[0];
            usedWordIds.add(wordId);

            // Fill in the box
            box.textContent = correctWord;
            box.classList.add('filled', 'correct');
            box.dataset.wordId = wordId;

            // Mark word as used
            state.activeWords[wordId] = true;

            // Track filled box
            const key = `${birdIndex}-${wordType}`;
            state.filledBoxes[key] = correctWord;
        }
    });

    // Update word button states
    updateWordButtonStates();
}

// Create a new puzzle
function createNewPuzzle() {
    state.currentBirds = selectRandomBirds();
    resetGame();
    initializeBirdsDisplay();
    initializeWordBank();
}

// Show toast message
function showToast(message) {
    // Remove existing toast if present
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    // Create new toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger reflow
    toast.offsetHeight;

    // Show toast
    toast.classList.add('show');

    // Hide after 2 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// Setup help modal
function setupHelpModal() {
    elements.helpButton.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.helpModal.classList.remove('hidden');
    });

    // Click outside to close
    elements.helpModal.addEventListener('click', (e) => {
        if (e.target === elements.helpModal) {
            elements.helpModal.classList.add('hidden');
        }
    });

    // Make sure clicks on modal content don't close it
    const modalContent = elements.helpModal.querySelector('.bg-white');
    modalContent.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}
// Function to handle bird image click
function handleBirdImageClick(event) {
    const img = event.currentTarget;
    elements.modalImage.src = img.src;
    elements.imageModal.classList.add('visible');

    // Prevent click event from propagating to other elements
    event.stopPropagation();
}

// Function to close the modal
function closeImageModal() {
    elements.imageModal.classList.remove('visible');
}

// Add event listener to the modal itself to close when clicked
function setupImageModal() {
    elements.imageModal.addEventListener('click', closeImageModal);
}


// Initialize game
async function initializeGame() {
    // Load bird data from CSV
    await loadBirdData();

    // Select initial birds
    state.currentBirds = selectRandomBirds();

    // Setup UI elements
    initializeBirdsDisplay();
    initializeWordBank();
    setupHelpModal();
    setupImageModal();

    // Button event listeners
    elements.resetButton.addEventListener('click', resetGame);
    elements.newPuzzleButton.addEventListener('click', createNewPuzzle);
    elements.showAnswerButton.addEventListener('click', showAnswers);
    elements.checkAnswerButton.addEventListener('click', checkAnswers);
}

// Start the game when page loads
document.addEventListener('DOMContentLoaded', initializeGame);