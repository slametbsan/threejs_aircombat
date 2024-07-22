// inisialisasi three js
import * as THREE from "three";
import { GLTFLoader } from "./node_modules/three/examples/jsm/loaders/GLTFLoader.js";
import { FontLoader } from "./node_modules/three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "./node_modules/three/examples/jsm/geometries/TextGeometry.js";

// skrip game
let scene, camera, renderer, player, playerMixer, clock, enemyMixer;
let bullets = [], enemies = [], enemyModels = [];
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let score = 0, lives = 3, gameOver = false, playerBlinking = false;
let scoreText, livesText, gameOverText, restartText;
let font, gameOverAnimation;
let listener, shootSound, hitSound;

// Initialize the scene
function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    clock = new THREE.Clock();

    // Audio
    listener = new THREE.AudioListener();
    camera.add(listener);

    shootSound = new THREE.Audio(listener);
    hitSound = new THREE.Audio(listener);

    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('assets/shoot-sound.mp3', function (buffer) {
        shootSound.setBuffer(buffer);
        shootSound.setVolume(0.5);
    });
    audioLoader.load('assets/hit-sound.mp3', function (buffer) {
        hitSound.setBuffer(buffer);
        hitSound.setVolume(0.5);
    });

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(ambientLight, directionalLight);

    // Background
    const loader = new THREE.TextureLoader();
    loader.load('assets/day-sky.jpg', function (texture) {
        scene.background = texture;
    });

    // Load font
    const fontLoader = new FontLoader();
    fontLoader.load('./node_modules/three/examples/fonts/helvetiker_regular.typeface.json', (loadedFont) => {
        font = loadedFont;
        createText();
    });

    // Load player model
    const gltfLoader = new GLTFLoader();
    gltfLoader.load('assets/models/player.glb', (gltf) => {
        player = gltf.scene;
        player.scale.set(1, 1, 1);
        player.position.z = 2;
        player.rotation.y = Math.PI;
        scene.add(player);

        playerMixer = new THREE.AnimationMixer(player);
        const action = playerMixer.clipAction(gltf.animations[0]);
        action.play();
    });

    // Controls
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('click', onShoot);

    window.addEventListener('resize', onWindowResize);

    camera.position.y = 3;
    camera.position.z = 10;

    // Enemy spawn interval
    setInterval(spawnEnemy, 3000);

    animate();
}

function createText() {
    const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Score text
    scoreText = new THREE.Mesh(new TextGeometry(`Score: ${score}`, {
        font: font,
        size: 0.5,
        height: 0.1
    }), textMaterial);
    scoreText.position.set(-4, 4, 0);

    scene.add(scoreText);

    // Lives text
    livesText = new THREE.Mesh(new TextGeometry(`Lives: ${lives}`, {
        font: font,
        size: 0.5,
        height: 0.1
    }), textMaterial);
    livesText.position.set(2, 4, 0);

    scene.add(livesText);

    // Game Over text
    gameOverText = new THREE.Mesh(new TextGeometry('Game Over', {
        font: font,
        size: 1,
        height: 0.1
    }), textMaterial);
    gameOverText.position.set(-7, 1, 0);
    gameOverText.visible = false;
    scene.add(gameOverText);

    // Restart text
    restartText = new THREE.Mesh(new TextGeometry('Press Enter to Restart', {
        font: font,
        size: 0.5,
        height: 0.1
    }), textMaterial);
    restartText.position.set(-3, -1, 0);
    restartText.visible = false;
    scene.add(restartText);
}

function onKeyDown(event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = true;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = true;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = true;
            break;
        case 'ArrowRight':
        case 'KeyD':
            moveRight = true;
            break;
        case 'Enter':
            if (gameOver) restartGame();
            break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = false;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = false;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = false;
            break;
        case 'ArrowRight':
        case 'KeyD':
            moveRight = false;
            break;
    }
}

function onShoot() {
    if (gameOver) return;
    const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bullet.position.set(player.position.x, player.position.y, player.position.z);
    bullets.push(bullet);
    scene.add(bullet);

    shootSound.play();
}

function spawnEnemy() {
    if (gameOver) return;

    const gltfLoader = new GLTFLoader();
    gltfLoader.load('assets/models/musuh.glb', (gltf) => {
        const enemy = gltf.scene;
        enemy.scale.set(1, 1, 1);
        enemy.rotateY(3 * Math.PI / 2);
        enemy.position.set((Math.random() - 0.5) * 20, 0.5, player.position.z - 50);
        enemies.push(enemy);
        scene.add(enemy);

        // const enemyMixer = new THREE.AnimationMixer(enemy);
        // const action = enemyMixer.clipAction(gltf.animations[0]);
        // action.play();
        // enemyModels.push({ mixer: enemyMixer, model: enemy });
    });
}

function detectCollisions() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (bullets[i].position.distanceTo(enemies[j].position) < 1) {
                scene.remove(bullets[i]);
                scene.remove(enemies[j]);
                bullets.splice(i, 1);
                enemies.splice(j, 1);
                score++;
                updateText();
                hitSound.play();
                break;
            }
        }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].position.distanceTo(player.position) < 1) {
            scene.remove(enemies[i]);
            enemies.splice(i, 1);
            lives--;
            playerBlink();
            updateText();
            if (lives <= 0) {
                gameOver = true;
                gameOverText.visible = true;
                restartText.visible = true;
                animateGameOverText();
            }
        }
    }
}

function playerBlink() {
    if (playerBlinking) return;
    playerBlinking = true;
    let blinkCount = 0;
    const blinkInterval = setInterval(() => {
        player.visible = !player.visible;
        blinkCount++;
        if (blinkCount >= 6) {
            clearInterval(blinkInterval);
            player.visible = true;
            playerBlinking = false;
        }
    }, 100);
}

function animateGameOverText() {
    gameOverText.scale.set(1, 1, 1);
    const scaleUp = () => {
        if (gameOverText.scale.x < 2) {
            gameOverText.scale.x += 0.1;
            gameOverText.scale.y += 0.1;
            gameOverText.scale.z += 0.1;
            requestAnimationFrame(scaleUp);
        }
    };
    scaleUp();
}

function updateText() {
    scene.remove(scoreText);
    scene.remove(livesText);
    scoreText = new THREE.Mesh(new TextGeometry(`Score: ${score}`, {
        font: font,
        size: 0.5,
        height: 0.1
    }), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    scoreText.position.set(-4, 4, 0);

    scene.add(scoreText);

    livesText = new THREE.Mesh(new TextGeometry(`Lives: ${lives}`, {
        font: font,
        size: 0.5,
        height: 0.1
    }), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    livesText.position.set(2, 4, 0);

    scene.add(livesText);
}

function restartGame() {
    gameOver = false;
    score = 0;
    lives = 3;
    updateText();
    gameOverText.visible = false;
    restartText.visible = false;
    player.position.set(0, 0.5, 5);
    enemies.forEach(enemy => scene.remove(enemy));
    enemies = [];
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    scoreText.position.set(-4, 4, 0);
    livesText.position.set(2, 4, 0);
    gameOverText.position.set(-window.innerWidth / 400, 0, 0);
    restartText.position.set(-window.innerWidth / 500 - 2, -window.innerHeight / 500, 0);
}

let ukur = new THREE.Vector3();

function animate() {
    requestAnimationFrame(animate);

    if (playerMixer) playerMixer.update(clock.getDelta());
    enemyModels.forEach(({ mixer }) => mixer.update(clock.getDelta()));

    if (moveForward && player.position.z > -2) player.position.z -= 0.1;
    if (moveBackward && player.position.z < 2) player.position.z += 0.1;
    if (moveLeft && player.position.x > -10) player.position.x -= 0.1;
    if (moveRight && player.position.x < 10) player.position.x += 0.1;

    bullets.forEach((bullet, index) => {
        bullet.position.z -= 0.2;
        if (bullet.position.z < player.position.z - 40) {
            scene.remove(bullet);
            bullets.splice(index, 1);
        }
    });

    enemies.forEach(enemy => enemy.position.z += 0.05);

    detectCollisions();

    renderer.render(scene, camera);
}

init();