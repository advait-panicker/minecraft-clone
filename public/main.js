import * as THREE from './three.js-master/build/three.module.js';
import { PointerLockControls } from './three.js-master/examples/jsm/controls/PointerLockControls.js';

// Three.js setup

var renderer = new THREE.WebGLRenderer();               // Init Screen + Camera + Renderer
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);         // Creates Canvas

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(           
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

// Controls
const clamp = (num, a, b) => Math.max(Math.min(num, Math.max(a, b)), Math.min(a, b));
var controls = new PointerLockControls( camera, renderer.domElement );

let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, moveUp = false, moveDown = false;
let SPEED = 200;
document.addEventListener('click', function() {
    controls.lock();
}, false);
var onKeyDown = function(event) {
    switch (event.keyCode) {
        case 87: // w
        case 38: // up
            moveForward = true;    
            break;
        case 83: // s
        case 40: // down
            moveBackward = true;    
            break;
        case 65: // a
        case 37: // left
            moveLeft = true;    
            break;
        case 68: // d
        case 39: // right
            moveRight = true;    
            break;
        case 32: // space
            moveUp = true;    
            break;
        case 16: // shift
            moveDown = true;    
            break;
    }
};
var onKeyUp = function(event) {
    switch (event.keyCode) {
        case 87: // w
        case 38: // up
            moveForward = false;    
            break;
        case 83: // s
        case 40: // down
            moveBackward = false;    
            break;
        case 65: // a
        case 37: // left
            moveLeft = false;    
            break;
        case 68: // d
        case 39: // right
            moveRight = false;    
            break;
        case 32: // space
            moveUp = false;    
            break;
        case 16: // shift
            moveDown = false;    
            break;
    }
};

document.addEventListener('keydown', onKeyDown, false);
document.addEventListener('keyup', onKeyUp, false);

// Textures // 0_0 i really dont know about this one
const loader = new THREE.TextureLoader();
const textures = {};
const TEXTURELIST = [["dirt", 1], ["grass", 2]];
for (let i = 0, l = TEXTURELIST.length; i < l; i++) {
    const count = TEXTURELIST[i][1];
    const name = TEXTURELIST[i][0];
    let mats = [];
    switch (count) {
        case 1:
            var sideTex = loader.load(`resources/blocks/${name}/side.png`);
            sideTex.magFilter = THREE.NearestFilter;
            var s = new THREE.MeshBasicMaterial({map : sideTex});
            mats = [s, s, s, s, s, s];
            break;
        case 2:
            var topTex = loader.load(`resources/blocks/${name}/top.png`);
            var sideTex = loader.load(`resources/blocks/${name}/side.png`);
            topTex.magFilter = THREE.NearestFilter;
            sideTex.magFilter = THREE.NearestFilter;
            var t = new THREE.MeshBasicMaterial({map : topTex});
            var s = new THREE.MeshBasicMaterial({map : sideTex});
            mats = [t, s, s, s, s, s];
            break;
    }
    textures[name] = mats;
};

// Geometry
const RENDERDIST = 4;
const BLOCKSIZE = 10;

let chunks = {}; // Retrieve from Server
let renderedChunks = {};

const Tile = {
    TOP : {x : [1, 0, 1, 0], y : [ 0,  0,  0,  0], z : [0, 0, 1, 1], id : 0},
    ZL  : {x : [1, 0, 1, 0], y : [-1, -1,  0,  0], z : [0, 0, 0, 0], id : 1},
    ZR  : {x : [0, 1, 0, 1], y : [-1, -1,  0,  0], z : [1, 1, 1, 1], id : 2},
    XL  : {x : [0, 0, 0, 0], y : [-1, -1,  0,  0], z : [0, 1, 0, 1], id : 3},
    XR  : {x : [1, 1, 1, 1], y : [-1, -1,  0,  0], z : [1, 0, 1, 0], id : 4}
};

// Create face using verticies and face push() // DEF client
function makeFace(chunkGeom, chnkX, chnkZ, x, y, z, face, block) {
    let geom = chunkGeom[block][face.id];
    let verts = geom.vertices.length;
    for (var i = 0; i < 4; i++) {
        geom.vertices.push( new THREE.Vector3((x+face.x[i]+chnkX*CHUNKSIZE)*BLOCKSIZE, (y+face.y[i])*BLOCKSIZE, (z+face.z[i]+chnkZ*CHUNKSIZE)*BLOCKSIZE));
    }
    geom.faces.push( new THREE.Face3(verts, verts + 3, verts + 2), new THREE.Face3(verts, verts + 1, verts + 3)); 
    geom.faceVertexUvs[0].push( [ new THREE.Vector2(0, 0), new THREE.Vector2(1, 1), new THREE.Vector2(0, 1)],
                                [ new THREE.Vector2(0, 0), new THREE.Vector2(1, 0), new THREE.Vector2(1, 1)]);
}

// Retrieve Existing or New Chunk -- Need to replace w/ server code
function loadChunk(chnkX, chnkZ) {
    const id = chnkZ * WORLDSIZE + chnkX;
    if (chunks[id] == undefined) {
        chunks[id] = generateChunk(chnkX, chnkZ); // <-- This function specifically // Prob w/ io.emit(ChnkX, ChnkZ)
    }
    return chunks[id];
}

camera.position.x = 653.3029678495917;
camera.position.y = 151.47234323017045;
camera.position.z = 697.3360835106855;

camera.rotation.y = 0.8320073541233839;
// Main Chunk Loop
function drawRenderChunks() {
    const playerChunkX = Math.floor(camera.position.x / BLOCKSIZE / WORLDSIZE);
    const playerChunkZ = Math.floor(camera.position.z / BLOCKSIZE / WORLDSIZE);
    for (var chnkZ = playerChunkZ-RENDERDIST; chnkZ < playerChunkZ+RENDERDIST; chnkZ++) {
        for (var chnkX = playerChunkX-RENDERDIST; chnkX < playerChunkX+RENDERDIST; chnkX++) {
            if (renderedChunks[chnkX + chnkZ * WORLDSIZE] == undefined) {
                drawChunk(chnkX, chnkZ);
                renderedChunks[chnkX + chnkZ * WORLDSIZE] = true;
            }
        }
    }
}
function drawChunk(chnkX, chnkZ) {
    let geom = {};
    const chunkData = loadChunk(chnkX, chnkZ);
    for (var z = 0; z < CHUNKSIZE; z++) {
        for (var x = 0; x < CHUNKSIZE; x++) {
            for (var y = 0; y < 256; y++) {
                const blockName = chunkData(x, y, z).name; 
                if (chunkData(x, y, z).name == "air") {
                    continue;
                } else {
                    if (geom[blockName] == undefined) {
                        geom[blockName] = [new THREE.Geometry(),new THREE.Geometry(),new THREE.Geometry(),new THREE.Geometry(),new THREE.Geometry()];
                    }
                    if (chunkData(x, y+1, z).name == "air") {
                        makeFace(geom, chnkX, chnkZ, x, y, z, Tile.TOP, blockName);
                    }
                    if (chunkData(x, y, z-1).name == "air" || (chunkData(x, y, z-1).name == "und" && loadChunk(chnkX, chnkZ-1)(x, y, CHUNKSIZE-1).name == "air")) {
                        makeFace(geom, chnkX, chnkZ, x, y, z, Tile.ZL, blockName);
                    }
                    if (chunkData(x, y, z+1).name == "air" || (chunkData(x, y, z+1).name == "und" && loadChunk(chnkX, chnkZ+1)(x, y, 0).name == "air")) {
                        makeFace(geom, chnkX, chnkZ, x, y, z, Tile.ZR, blockName);
                    }
                    if (chunkData(x-1, y, z).name == "air" || (chunkData(x-1, y, z).name == "und" && loadChunk(chnkX-1, chnkZ)(CHUNKSIZE-1, y, z).name == "air")) {
                        makeFace(geom, chnkX, chnkZ, x, y, z, Tile.XL, blockName);
                    }
                    if (chunkData(x+1, y, z).name == "air" || (chunkData(x+1, y, z).name == "und" && loadChunk(chnkX+1, chnkZ)(0, y, z).name == "air")) {
                        makeFace(geom, chnkX, chnkZ, x, y, z, Tile.XR, blockName);
                    }
                }
            }
        }
    }
    for (let block in geom) {
        for (let i = 0, l = geom[block].length; i < l; i++) {
            // geom[block][i].computeFaceNormals();
            const object = new THREE.Mesh( geom[block][i], textures[block][i]);
            scene.add(object);
        }
    }
}

// Main Loop -- Client

let clock = new THREE.Clock();

drawRenderChunks();
function animate() {
    let delta = clock.getDelta();
    if (controls.isLocked) {
        controls.moveForward((moveForward-moveBackward)*SPEED*delta);
        controls.moveRight((moveRight-moveLeft)*SPEED*delta);
        camera.position.y += (moveUp-moveDown)*SPEED*delta;
    }
    requestAnimationFrame( animate );
    renderer.render(scene, camera);
}
animate();