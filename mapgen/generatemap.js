const seed = 'this is minecraft';
const CHUNKSIZE = 16;

let heightMap = new perlin(seed);

function loadChunk(chnkX, chnkZ) {
    let chunkData = [];
    for (var z = 0; z < CHUNKSIZE; z++) {
        chunkData[z] = [];
        for (var x = 0; x < CHUNKSIZE; x++) {
            chunkData[z][x] = [];
            let height = Math.round(heightMap.noise(x + chnkX*CHUNKSIZE, z+chnkZ*CHUNKSIZE)*20)+10;
            for (var y = 0; y < 256; y++) {
                if (y > height) {
                    chunkData[z][x][y] = {"name" : "air"};
                } else if (y == height) {
                    chunkData[z][x][y] = {"name" : "grass"};
                } else {
                    chunkData[z][x][y] = {"name" : "dirt"};
                }
            }
        }
    }
    return function (x, y, z) {
        if (chunkData[z] == undefined) {
            return {"name" : "und"};
        } else if (chunkData[z][x] == undefined) {
            return {"name" : "und"};
        } else if (chunkData[z][x][y] == undefined) {
            return {"name" : "und"};
        } else {
            return chunkData[z][x][y];
        }
    }
}