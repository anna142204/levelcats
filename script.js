
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
        this.winPanel = null;
        this.coinsText = null;
        this.timeText = null;
        this.unitSize = 120;
        this.gridStartX = 0;
        this.gridStartY = 0;
        this.levelUpCost = 30;
        this.reset();
    }

    reset() {
        this.grid = [];
        for (let row = 0; row < GRID_SIZE; row++) {
            this.grid[row] = [];
            for (let col = 0; col < GRID_SIZE; col++) {
                this.grid[row][col] = null;
            }
        }

        this.coins = 500;
        this.timeLeft = 180;
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
    6: 0x44ffff,
    7: 0xff8888,
    8: 0x8888ff,
    9: 0x88ff88,
    10: 0xff88ff,
    default: 0xaaaaaa

};
let actualmaxlevel = 1;
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
    this.load.audio('coinSound', 'assets/coin.mp3');
    // this.load.audio('catlvl', 'assets/catlvl.mp3');
    // this.load.audio('catfusion', 'assets/catfusion.mp3');
}

function create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

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

    const gridSizePixels = GRID_SIZE * gameState.unitSize;
    gameState.gridStartX = centerX - (gridSizePixels / 2);
    gameState.gridStartY = centerY - (gridSizePixels / 2) + 45;

    const highScore = localStorage.getItem('highScore') || 0;
    if (gameState.coins > highScore) {
        localStorage.setItem('highScore', gameState.coins);
    }

    this.add.text(centerX, centerY - 300, 'LevelCats', {
        font: '70px customFont',
        fill: '#fff',
        stroke: '#000000',
        strokeThickness: 6
    }).setOrigin(0.5).setDepth(2);

    gameState.coinsText = this.add.text(centerX, centerY - 230, `Coins: ${gameState.coins}`, {
        font: '30px customFont',
        fill: '#FFD700'
    }).setOrigin(0.5).setDepth(2);

    this.add.image(centerX - 95, centerY - 232, 'coin')
        .setScale(0.6)
        .setDepth(1);

    gameState.timeText = this.add.text(centerX, centerY - 190, `Time: ${gameState.timeLeft}s`, {
        font: '24px customFont',
        fill: '#FFFFFF'
    }).setOrigin(0.5).setDepth(2);

    drawGrid(this);

    const pauseButton = this.add.text(50, 50, 'Pause', {
        font: '24px customFont',
        fill: '#FFFFFF'
    }).setInteractive().on('pointerdown', () => {
        gameState.gameActive = !gameState.gameActive;
        pauseButton.setText(gameState.gameActive ? 'Pause' : 'Resume');
    });

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

    const buttonText = this.add.text(centerX, centerY + 300, `Acheter | ${gameState.levelUpCost}$`, {
        font: '24px customFont',
        fill: '#000'
    }).setOrigin(0.5).setDepth(3);

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

    gameState.gameOverPanel = createPanel(this, 'GAME OVER', '#FF0000');
    gameState.winPanel = createPanel(this, 'YOU WIN!', '#00FF00');
}
function createPanel(scene, title, titleColor) {
    const panel = scene.add.group();

    // Semi-transparent overlay
    const overlay = scene.add.rectangle(
        scene.cameras.main.centerX,
        scene.cameras.main.centerY,
        scene.cameras.main.width,
        scene.cameras.main.height,
        0x000000, 0.7
    ).setDepth(10);

    // Title text
    const titleText = scene.add.text(
        scene.cameras.main.centerX,
        scene.cameras.main.centerY - 100,
        title,
        {
            font: '80px customFont',
            fill: titleColor,
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
    panel.add(overlay);
    panel.add(titleText);
    panel.add(finalScoreText);
    panel.add(replayButton);
    panel.add(replayText);

    // Reference to the final score text for updates
    panel.finalScoreText = finalScoreText;

    // Initially hide the panel
    panel.setVisible(false);

    return panel;
}
function hasValidMoves() {
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const unit = gameState.grid[row][col];
            if (unit) {
                // Check all directions for possible fusions
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
                            if (neighbor && neighbor.level === unit.level) {
                                return true; // Valid move found
                            }
                        }
                    }
                }
            }
        }
    }
    return false; // No valid moves left
}
function showPanel(scene, panel) {
    gameState.gameActive = false;

    // Update high score
    const highScore = localStorage.getItem('highScore') || 0;
    if (gameState.coins > highScore) {
        localStorage.setItem('highScore', gameState.coins);
    }

    // Stop the timer
    if (gameState.timer) {
        gameState.timer.remove();
    }

    // Update the final score
    panel.finalScoreText.setText(`Score: ${gameState.coins}`);

    // Show the panel
    panel.setVisible(true);

    // Animate the panel elements
    scene.tweens.add({
        targets: panel.getChildren(),
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

    gameState.gameOverPanel.setVisible(false);
    gameState.winPanel.setVisible(false);

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
        showPanel(this, gameState.gameOverPanel);
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
        game.sound.play('coinSound');
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
    if (!hasValidMoves() && isGridFull()) {
        showPanel(scene, gameState.gameOverPanel);
        console.log('gameover2');
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
function isGridFull() {
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (gameState.grid[row][col] === null) {
                return false; // Grid is not full
            }
        }
    }
    return true; // Grid is full
}
function addNewUnit(scene) {
    const emptySlot = findEmptySlot();
    if (!emptySlot) return;

    const { row, col } = emptySlot;
    const x = gameState.gridStartX + col * gameState.unitSize + gameState.unitSize / 2;
    const y = gameState.gridStartY + row * gameState.unitSize + gameState.unitSize / 2;
    let unitLevel = 1;
    if (actualmaxlevel >= 4) {
        unitLevel = Phaser.Math.Between(1, Math.max(2, Math.floor(actualmaxlevel / 2)));
    }

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
                    // game.sound.play('catfusion');
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
    actualmaxlevel = Math.max(actualmaxlevel, fusionLevel);

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
    if (fusionLevel >= 10) {
        gameState.coins += 500;
        updateCoinsDisplay();
        showPanel(game.scene.scenes[0], gameState.winPanel);
    }
    if (!hasValidMoves() && isGridFull()) {
        showPanel(game.scene.scenes[0], gameState.gameOverPanel);
        console.log('gameover');
    }
}

// Start the game
init();