import * as THREE from './three.js-master/build/three.module.js';
import { FirstPersonControls } from './three.js-master/examples/jsm/controls/FirstPersonControls.js';

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
var controls = new FirstPersonControls( camera, renderer.domElement );
controls.lookSpeed = 0.05;
controls.movementSpeed = 50;


// Geometry
const RENDERDIST = 10;
const BLOCKSIZE = 10;

let geoms = [];
let chunks = []; // Retrieve from Server

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

const Tile = {
    TOP : {x : [1, 0, 1, 0], y : [ 0,  0,  0,  0], z : [0, 0, 1, 1], id : 0},
    ZL  : {x : [1, 0, 1, 0], y : [-1, -1,  0,  0], z : [0, 0, 0, 0], id : 1},
    ZR  : {x : [0, 1, 0, 1], y : [-1, -1,  0,  0], z : [1, 1, 1, 1], id : 2},
    XL  : {x : [0, 0, 0, 0], y : [-1, -1,  0,  0], z : [0, 1, 0, 1], id : 3},
    XR  : {x : [1, 1, 1, 1], y : [-1, -1,  0,  0], z : [1, 0, 1, 0], id : 4}
};

// Create face using verticies and face push() // DEF client
function makeFace(chnkX, chnkZ, x, y, z, face, block) {
    let geom = geoms[chnkZ * RENDERDIST + chnkX][block][face.id]; let verts = geom.vertices.length;
    for (var i = 0; i < 4; i++) {
        geom.vertices.push( new THREE.Vector3((x+face.x[i]+chnkX*CHUNKSIZE)*BLOCKSIZE, (y+face.y[i])*BLOCKSIZE, (z+face.z[i]+chnkZ*CHUNKSIZE)*BLOCKSIZE));
    }
    geom.faces.push( new THREE.Face3(verts, verts + 3, verts + 2), new THREE.Face3(verts, verts + 1, verts + 3)); 
    geom.faceVertexUvs[0].push( [ new THREE.Vector2(0, 0), new THREE.Vector2(1, 1), new THREE.Vector2(0, 1)],
                                [ new THREE.Vector2(0, 0), new THREE.Vector2(1, 0), new THREE.Vector2(1, 1)]);
}

// Retrieve Existing or New Chunk -- Need to replace w/ server code
function getChunk(chnkX, chnkZ) {
    const id = chnkZ * RENDERDIST + chnkX;
    if (chunks[id] == undefined) {
        chunks[id] = loadChunk(chnkX, chnkZ); // <-- This function specifically // Prob w/ io.emit(ChnkX, ChnkZ)
    }
    return chunks[id];
}

// Main Chunk Loop
for (var chnkZ = 0; chnkZ < RENDERDIST; chnkZ++) {
    for (var chnkX = 0; chnkX < RENDERDIST; chnkX++) {
        const chnkid = chnkZ * RENDERDIST + chnkX;
        geoms[chnkid] = {};
        const chunkData = getChunk(chnkX, chnkZ);
        for (var z = 0; z < CHUNKSIZE; z++) {
            for (var x = 0; x < CHUNKSIZE; x++) {
                for (var y = 0; y < 256; y++) {
                    let blockName = chunkData(x, y, z).name; 
                    if (chunkData(x, y, z).name == "air") {
                        continue;
                    } else {
                        if (geoms[chnkid][blockName] == undefined) {
                            geoms[chnkid][blockName] = [new THREE.Geometry(),new THREE.Geometry(),new THREE.Geometry(),new THREE.Geometry(),new THREE.Geometry()];
                        }
                        if (chunkData(x, y+1, z).name == "air") {
                            makeFace(chnkX, chnkZ, x, y, z, Tile.TOP, blockName);
                        }
                        if (chunkData(x, y, z-1).name == "air" || (chunkData(x, y, z-1).name == "und" && getChunk(chnkX, chnkZ-1)(x, y, CHUNKSIZE-1).name == "air")) {
                            makeFace(chnkX, chnkZ, x, y, z, Tile.ZL, blockName);
                        }
                        if (chunkData(x, y, z+1).name == "air" || (chunkData(x, y, z+1).name == "und" && getChunk(chnkX, chnkZ+1)(x, y, 0).name == "air")) {
                            makeFace(chnkX, chnkZ, x, y, z, Tile.ZR, blockName);
                        }
                        if (chunkData(x-1, y, z).name == "air" || (chunkData(x-1, y, z).name == "und" && getChunk(chnkX-1, chnkZ)(CHUNKSIZE-1, y, z).name == "air")) {
                            makeFace(chnkX, chnkZ, x, y, z, Tile.XL, blockName);
                        }
                        if (chunkData(x+1, y, z).name == "air" || (chunkData(x+1, y, z).name == "und" && getChunk(chnkX+1, chnkZ)(0, y, z).name == "air")) {
                            makeFace(chnkX, chnkZ, x, y, z, Tile.XR, blockName);
                        }
                    }
                }
            }
        }

        // Add Chunk Geom to Scene
        for (let block in geoms[chnkid]) {
            geoms[chnkid][block].forEach(function (geom, id) {
                geom.computeFaceNormals();
                var object = new THREE.Mesh( geom, textures[block][id]);
                scene.add(object);
            });
        }
    }
}
camera.position.x = 653.3029678495917;
camera.position.y = 151.47234323017045;
camera.position.z = 697.3360835106855;

camera.rotation.x = 0.026608505754609577;
camera.rotation.y = 0.8320073541233839;
camera.rotation.z = 0.019673363770192468;

// Main Loop -- Client

let clock = new THREE.Clock();

function animate() {
    controls.update(clock.getDelta());
    requestAnimationFrame( animate );
    // object.rotation.y += 0.1;
    renderer.render( scene, camera);
}
animate();