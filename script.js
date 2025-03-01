const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: "#292039",
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

class GameState {
    constructor() {
        this.grid = [];
        this.coins = 500;
        this.timeLeft = 60;
        this.gameActive = true;
        this.hiddenCoins = [];
        this.timer = null;
        this.gameOverPanel = null;
        this.coinsText = null;
        this.timeText = null;
        this.unitSize = 120;
        this.gridStartX = 0; // Dynamically set
        this.gridStartY = 0; // Dynamically set
        this.levelUpCost = 20;
        this.reset();
    }

    reset() {
        // Properly initialize the grid
        this.grid = [];
        for (let row = 0; row < GRID_SIZE; row++) {
            this.grid[row] = [];
            for (let col = 0; col < GRID_SIZE; col++) {
                this.grid[row][col] = null;
            }
        }

        this.coins = 500;
        this.timeLeft = 60;
        this.gameActive = true;
        this.hiddenCoins = [];
    }

}

const GRID_SIZE = 3;
const COLORS = {
    1: 0xff4444,
    2: 0x4488ff,
    3: 0x44ff44,
    4: 0xffff44,
    5: 0xff44ff,
    default: 0xaaaaaa
};

let game;
let gameState;

function init() {
    game = new Phaser.Game(config);
    gameState = new GameState();
}

function preload() {
    this.load.image('gridCell', 'assets/case.png');
    this.load.image('unit', 'assets/chat.png');
    this.load.image('coin', 'assets/coin.png');
    this.load.image('deco1', 'assets/catfond.png');
    this.load.image('deco2', 'assets/patte.png');
    this.load.image('deco3', 'assets/traces.png');
    this.load.image('deco4', 'assets/trace.svg');
    this.load.font('customFont', 'assets/SourGummy-VariableFont_wdth,wght.ttf');
}

function create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // Ajouter une image décorative
    this.add.image(100, window.innerHeight - 100, 'deco1')
        .setScale(0.6)
        .setDepth(1);

    this.add.image(centerX + 165, centerY - 150, 'deco2')
        .setScale(0.1)
        .setDepth(1);

    this.add.image(centerX - 225, centerY + 385, 'deco2')
        .setScale(0.1)
        .setDepth(1);

    this.add.image(window.innerWidth - 100, 100, 'deco3')
        .setScale(0.05)
        .setDepth(1);

    // Calculer la position de la grille dynamiquement
    const gridSizePixels = GRID_SIZE * gameState.unitSize;
    gameState.gridStartX = centerX - (gridSizePixels / 2);
    gameState.gridStartY = centerY - (gridSizePixels / 2) + 45;

    // Ajouter le titre
    this.add.text(centerX, centerY - 300, 'LevelCats', {
        font: '70px customFont',
        fill: '#fff',
        stroke: '#000000',
        strokeThickness: 6
    }).setOrigin(0.5).setDepth(2);

    // Ajouter l'affichage des pièces
    gameState.coinsText = this.add.text(centerX, centerY - 230, `Coins: ${gameState.coins}`, {
        font: '30px customFont',
        fill: '#FFD700'
    }).setOrigin(0.5).setDepth(2);

    this.add.image(centerX - 95, centerY - 232, 'coin')
        .setScale(0.6)
        .setDepth(1);

    // Ajouter l'affichage du temps
    gameState.timeText = this.add.text(centerX, centerY - 190, `Time: ${gameState.timeLeft}s`, {
        font: '24px customFont',
        fill: '#FFFFFF'
    }).setOrigin(0.5).setDepth(2);

    // Dessiner la grille
    drawGrid(this);

    // Créer et configurer le bouton "Acheter"
    const addUnitButton = this.add.rectangle(centerX, centerY + 300, 220, 60, 0xfffd77, 0.8)
        .setStrokeStyle(3, 0x000000)
        .setInteractive()
        .setDepth(2)
        .on('pointerdown', () => {
            if (gameState.gameActive) {
                this.tweens.add({
                    targets: addUnitButton,
                    scaleX: 0.9,
                    scaleY: 0.9,
                    duration: 50,
                    yoyo: true,
                    onComplete: () => purchaseUnit(this)
                });
            }
        })
        .on('pointerover', () => {
            this.tweens.add({
                targets: addUnitButton,
                scaleX: 1.1,
                scaleY: 1.1,
                duration: 100,
                ease: 'Power2'
            });
        })
        .on('pointerout', () => {
            this.tweens.add({
                targets: addUnitButton,
                scaleX: 1,
                scaleY: 1,
                duration: 100,
                ease: 'Power2'
            });
        });

    // Ajouter le texte du bouton
    const buttonText = this.add.text(centerX, centerY + 300, 'Acheter | 20$', {
        font: '24px customFont',
        fill: '#000'
    }).setOrigin(0.5).setDepth(3);

    // Fonction pour mettre à jour l'état du bouton
    const updateButtonState = () => {
        const emptySlot = findEmptySlot();
        if (!emptySlot || gameState.coins < gameState.levelUpCost) {
            addUnitButton.setFillStyle(0xaaaaaa, 0.5);
            buttonText.setColor('#888');
            addUnitButton.disableInteractive();
        } else {
            addUnitButton.setFillStyle(0xfffd77, 0.8);
            buttonText.setColor('#000');
            addUnitButton.setInteractive();
        }
    };

    // Mettre à jour l'état du bouton toutes les 100ms
    this.time.addEvent({
        delay: 100,
        callback: updateButtonState,
        loop: true
    });

    // Mise à jour initiale de l'état du bouton
    updateButtonState();

    // Faire apparaître des pièces cachées périodiquement
    this.time.addEvent({
        delay: 10000,
        callback: spawnHiddenCoin,
        loop: true
    });

    // Démarrer le compte à rebours
    gameState.timer = this.time.addEvent({
        delay: 1000,
        callback: updateTimer,
        callbackScope: this,
        loop: true
    });

    // Créer le panneau de game over
    createGameOverPanel(this);
}
function createGameOverPanel(scene) {
    gameState.gameOverPanel = scene.add.group();

    // Semi-transparent overlay
    const overlay = scene.add.rectangle(
        scene.cameras.main.centerX,
        scene.cameras.main.centerY,
        scene.cameras.main.width,
        scene.cameras.main.height,
        0x000000, 0.7
    ).setDepth(10);

    // Game Over text
    const gameOverText = scene.add.text(
        scene.cameras.main.centerX,
        scene.cameras.main.centerY - 100,
        'GAME OVER',
        {
            font: '80px customFont',
            fill: '#FF0000',
            stroke: '#000000',
            strokeThickness: 8
        }
    ).setOrigin(0.5).setDepth(10);

    // Final score text
    const finalScoreText = scene.add.text(
        scene.cameras.main.centerX,
        scene.cameras.main.centerY,
        'Score: 0',
        {
            font: '40px customFont',
            fill: '#FFFFFF'
        }
    ).setOrigin(0.5).setDepth(10);

    // Replay button
    const replayButton = scene.add.rectangle(
        scene.cameras.main.centerX,
        scene.cameras.main.centerY + 100,
        200, 60, 0x00FF00, 0.8
    ).setStrokeStyle(3, 0x000000).setInteractive().setDepth(10);

    const replayText = scene.add.text(
        scene.cameras.main.centerX,
        scene.cameras.main.centerY + 100,
        'REJOUER',
        {
            font: '30px customFont',
            fill: '#000000'
        }
    ).setOrigin(0.5).setDepth(10);

    // Replay button event
    replayButton.on('pointerdown', () => {
        resetGame(scene);
    });

    // Add all elements to the group
    gameState.gameOverPanel.add(overlay);
    gameState.gameOverPanel.add(gameOverText);
    gameState.gameOverPanel.add(finalScoreText);
    gameState.gameOverPanel.add(replayButton);
    gameState.gameOverPanel.add(replayText);

    // Reference to the final score text for updates
    gameState.gameOverPanel.finalScoreText = finalScoreText;

    // Initially hide the panel
    gameState.gameOverPanel.setVisible(false);
}

function showGameOver(scene) {
    gameState.gameActive = false;

    // Stop the timer
    if (gameState.timer) {
        gameState.timer.remove();
    }

    // Update the final score
    gameState.gameOverPanel.finalScoreText.setText(`Score: ${gameState.coins}`);

    // Show the game over panel
    gameState.gameOverPanel.setVisible(true);

    // Animate the panel elements
    scene.tweens.add({
        targets: gameState.gameOverPanel.getChildren(),
        alpha: { from: 0, to: 1 },
        ease: 'Power3',
        duration: 800,
        stagger: 100
    });
}

function resetGame(scene) {
    // Stop the timer if it exists
    if (gameState.timer) {
        gameState.timer.remove();
    }

    // Destroy all units on the grid
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const unit = gameState.grid[row][col];
            if (unit) {
                unit.destroy(); // Destroy the Phaser object
                if (unit.text) {
                    unit.text.destroy(); // Destroy the associated text
                }
                gameState.grid[row][col] = null; // Clear the grid cell
            }
        }
    }

    // Destroy all hidden coins
    gameState.hiddenCoins.forEach(coin => coin.destroy());
    gameState.hiddenCoins = [];

    // Reset the game state
    gameState.reset();

    // Hide the game over panel
    gameState.gameOverPanel.setVisible(false);

    // Update the UI
    updateCoinsDisplay();
    gameState.timeText.setText(`Time: ${gameState.timeLeft}s`);

    // Restart the timer
    gameState.timer = scene.time.addEvent({
        delay: 1000,
        callback: updateTimer,
        callbackScope: scene,
        loop: true
    });
}

function updateTimer() {
    if (!gameState.gameActive) return;

    gameState.timeLeft--;
    gameState.timeText.setText(`Time: ${gameState.timeLeft}s`);

    // Game over if time runs out
    if (gameState.timeLeft <= 0) {
        showGameOver(this);
    }
}

function update() { }

function drawGrid(scene) {
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const x = gameState.gridStartX + col * gameState.unitSize + gameState.unitSize / 2;
            const y = gameState.gridStartY + row * gameState.unitSize + gameState.unitSize / 2;

            scene.add.image(x, y, 'gridCell')
                .setDisplaySize(gameState.unitSize, gameState.unitSize)
                .setDepth(2);
        }
    }
}

function spawnHiddenCoin() {
    if (!gameState.gameActive) return;

    const centerX = game.scene.scenes[0].cameras.main.centerX;
    const centerY = game.scene.scenes[0].cameras.main.centerY;
    const range = 200;

    const x = Phaser.Math.Between(centerX - range, centerX + range);
    const y = Phaser.Math.Between(centerY - range, centerY + range);

    const coin = game.scene.scenes[0].add.image(x, y, 'coin')
        .setScale(1.2)
        .setInteractive()
        .setDepth(4);

    coin.on('pointerdown', () => {
        if (!gameState.gameActive) return;

        gameState.coins += 50;
        updateCoinsDisplay();
        coin.destroy();
        gameState.hiddenCoins.splice(gameState.hiddenCoins.indexOf(coin), 1);
    });

    gameState.hiddenCoins.push(coin);

    game.scene.scenes[0].time.delayedCall(5000, () => {
        if (gameState.hiddenCoins.includes(coin)) {
            coin.destroy();
            gameState.hiddenCoins.splice(gameState.hiddenCoins.indexOf(coin), 1);
        }
    });
}

function purchaseUnit(scene) {

    const emptySlot = findEmptySlot();
    if (!emptySlot) {
        return; 
    }
    if (gameState.coins >= gameState.levelUpCost) {
        addNewUnit(scene);
        gameState.coins -= gameState.levelUpCost;
        updateCoinsDisplay();
    } 

}

function updateCoinsDisplay() {
    gameState.coinsText.setText(`Coins: ${gameState.coins}`);
}

function findEmptySlot() {
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (gameState.grid[row][col] === null) {
                return { row, col };
            }
        }
    }
    return null;
}

function addNewUnit(scene) {
    const emptySlot = findEmptySlot();
    if (!emptySlot) return;

    const { row, col } = emptySlot;
    const x = gameState.gridStartX + col * gameState.unitSize + gameState.unitSize / 2;
    const y = gameState.gridStartY + row * gameState.unitSize + gameState.unitSize / 2;
    const unitLevel = 1;

    createUnitAt(scene, row, col, x, y, unitLevel);
}

function createUnitAt(scene, row, col, x, y, level) {
    const unitColor = getUnitColor(level);
    const unit = scene.add.image(x, y, 'unit')
        .setDisplaySize(gameState.unitSize, gameState.unitSize)
        .setTint(unitColor)
        .setDepth(3);

    const text = scene.add.text(x, y, level.toString(), {
        font: "20px customFont",
        fill: "#fff"
    }).setOrigin(0.5).setDepth(4);

    unit.level = level;
    unit.row = row;
    unit.col = col;
    unit.text = text;

    gameState.grid[row][col] = unit;

    unit.setInteractive();
    unit.on('pointerdown', () => {
        if (gameState.gameActive) {
            tryFusion(unit);
        }
    });

    scene.tweens.add({
        targets: unit,
        scale: 1.2,
        duration: 200,
        yoyo: true
    });
}

function getUnitColor(level) {
    return COLORS[level] || COLORS.default;
}

function tryFusion(unit) {
    const { row, col, level } = unit;
    const directions = [
        { r: -1, c: 0 }, { r: 1, c: 0 },
        { r: 0, c: -1 }, { r: 0, c: 1 },
        { r: -1, c: -1 }, { r: -1, c: 1 },
        { r: 1, c: -1 }, { r: 1, c: 1 }
    ];

    for (let d of directions) {
        for (let step = 1; step <= 2; step++) {
            const newRow = row + d.r * step;
            const newCol = col + d.c * step;

            if (isValidGridPosition(newRow, newCol)) {
                const neighbor = gameState.grid[newRow][newCol];

                if (neighbor && neighbor.level === level) {
                    fuseUnits(unit, neighbor);
                    return;
                }
            }
        }
    }
}

function isValidGridPosition(row, col) {
    return row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE;
}

function fuseUnits(unit1, unit2) {
    const fusionLevel = unit1.level + 1;
    const reward = fusionLevel * 10;

    gameState.coins += reward;
    updateCoinsDisplay();

    unit1.text.destroy();
    unit2.text.destroy();
    unit1.destroy();
    unit2.destroy();

    gameState.grid[unit1.row][unit1.col] = null;
    gameState.grid[unit2.row][unit2.col] = null;

    const x = gameState.gridStartX + unit1.col * gameState.unitSize + gameState.unitSize / 2;
    const y = gameState.gridStartY + unit1.row * gameState.unitSize + gameState.unitSize / 2;

    createUnitAt(game.scene.scenes[0], unit1.row, unit1.col, x, y, fusionLevel);

    // Game over if a high level is reached
    if (fusionLevel >= 5) {
        gameState.coins += 500;
        updateCoinsDisplay();
        showGameOver(game.scene.scenes[0]);
    }
}

// Start the game
init();