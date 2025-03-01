const config = {
    type: Phaser.AUTO,
    width: 700,
    height: 700,
    backgroundColor: "#222", // Fond plus moderne
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

let game;
let grid;
let unitSize = 100;
let gridOffsetX = 250;
let gridOffsetY = 250;
let coins;
let levelUpCost = 20;
let coinsText;
let hiddenCoins = []; // Stocke les pièces cachées

const GRID_SIZE = 3;
const COLORS = {
    1: 0xff4444,
    2: 0x4488ff,
    3: 0x44ff44,
    4: 0xffff44,
    5: 0xff44ff,
    default: 0xaaaaaa
};

function init() {
    game = new Phaser.Game(config);
    resetGameState();
}

function resetGameState() {
    grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
    coins = 500;
}

function preload() {
    this.load.image('gridCell', 'assets/case.png');
    this.load.image('unit', 'assets/chat.png');
    this.load.image('coin', 'assets/coin.png'); // Image de pièce cachée
    this.load.image('bg', 'https://dummyimage.com/700x700/222/222'); // Fond stylisé
    this.load.font('customFont', 'assets/SourGummy-VariableFont_wdth,wght.ttf');
}

function create() {
    this.add.image(300, 350, 'bg');

    coinsText = this.add.text(20, 20, `Coins: ${coins}`, { 
        font: '24px customFont', 
        fill: '#FFD700' 
    });

    let addUnitButton = this.add.rectangle(300, 650, 120, 50, 0xfffd77, 0.8)
        .setInteractive()
        .on('pointerdown', () => purchaseUnit(this));

    this.add.text(270, 640, 'Acheter', { 
        font: '20px customFont', 
        fill: '#000' 
    });

    drawGrid(this);

    // **💰 Lancement de l'apparition des pièces cachées toutes les 10 secondes**
    this.time.addEvent({
        delay: 10000, // Toutes les 10 secondes
        callback: spawnHiddenCoin,
        loop: true
    });
}

function update() {}

// **💠 Dessiner la grille**
function drawGrid(scene) {
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            scene.add.image(
                gridOffsetX + col * unitSize, 
                gridOffsetY + row * unitSize, 
                'gridCell' // Remplace le rectangle par une image
            ).setDisplaySize(unitSize, unitSize); // Ajuste la taille de l'image
        }
    }
}

// **💰 Générer une pièce cachée aléatoirement**
function spawnHiddenCoin() {
    let x = Phaser.Math.Between(200, 500);
    let y = Phaser.Math.Between(200, 500);

    let coin = game.scene.scenes[0].add.image(x, y, 'coin').setScale(1.2).setInteractive();

    coin.on('pointerdown', () => {
        coins += 50; // Gain de 50 coins
        updateCoinsDisplay();
        coin.destroy();
    });

    hiddenCoins.push(coin);

    // **⏳ Supprimer la pièce après 5 secondes si elle n'est pas collectée**
    game.scene.scenes[0].time.delayedCall(5000, () => {
        if (hiddenCoins.includes(coin)) {
            coin.destroy();
            hiddenCoins.splice(hiddenCoins.indexOf(coin), 1);
        }
    });
}

// **🛒 Acheter une unité**
function purchaseUnit(scene) {
    if (coins >= levelUpCost) {
        addNewUnit(scene);
        coins -= levelUpCost;
        updateCoinsDisplay();
    }
}

function updateCoinsDisplay() {
    coinsText.setText(`Coins: ${coins}`);
}

// **🔹 Trouver une case libre**
function findEmptySlot() {
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (grid[row][col] === null) {
                return { row, col };
            }
        }
    }
    return null;
}

// **🌟 Ajouter une unité**
function addNewUnit(scene) {
    const emptySlot = findEmptySlot();
    if (!emptySlot) return;

    const { row, col } = emptySlot;
    const x = gridOffsetX + col * unitSize;
    const y = gridOffsetY + row * unitSize;
    const unitLevel = 1;

    createUnitAt(scene, row, col, x, y, unitLevel);
}

// **🟦 Créer une unité**
function createUnitAt(scene, row, col, x, y, level) {
    const unitColor = getUnitColor(level);
    const unit = scene.add.image(x, y, 'unit').setDisplaySize(unitSize, unitSize).setTint(unitColor);
    const text = scene.add.text(x -5, y-15 , level.toString(), { 
        font: "20px customFont", 
        fill: "#fff" 
    });

    unit.level = level;
    unit.row = row;
    unit.col = col;
    unit.text = text;

    grid[row][col] = unit;

    unit.setInteractive();
    unit.on('pointerdown', () => tryFusion(unit));

    scene.tweens.add({
        targets: unit,
        scale: 1.2,
        duration: 200,
        yoyo: true
    });
}

// **🎨 Définir la couleur d’une unité**
function getUnitColor(level) {
    return COLORS[level] || COLORS.default;
}

// **🔄 Fusionner les unités**
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
                const neighbor = grid[newRow][newCol];

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
    let fusionLevel = unit1.level + 1;
    let reward = fusionLevel * 10; // Plus le niveau est élevé, plus ça rapporte

    coins += reward;
    updateCoinsDisplay();

    unit1.text.destroy();
    unit2.text.destroy();
    unit1.destroy();
    unit2.destroy();

    grid[unit1.row][unit1.col] = null;
    grid[unit2.row][unit2.col] = null;

    createUnitAt(game.scene.scenes[0], unit1.row, unit1.col, unit1.x, unit1.y, fusionLevel);
}

// **🚀 Démarrer le jeu**
init();
