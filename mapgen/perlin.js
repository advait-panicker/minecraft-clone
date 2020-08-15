function perlin (seed) {
    vectors = [];
    this.noise = function (x, y) {       // return value between 0 and 1
        x /= CHUNKSIZE; y /= CHUNKSIZE;
        const c_x = Math.floor(x); const c_y = Math.floor(y);
        const s_x = x - c_x; const s_y = y - c_y;

        function getVector(v_x, v_y) {
            if (vectors[v_y] == undefined) {
                vectors[v_y] = [];
            }
            if (vectors[v_y][v_x] == undefined) {
                let angle = new Math.seedrandom(seed + v_x + v_y)() * 2 * Math.PI;
                vectors[v_y][v_x] = [Math.cos(angle), Math.sin(angle)];
                return [Math.cos(angle), Math.sin(angle)];
            } else {
                return vectors[v_y][v_x];
            }
        }
        function gradient(xoff, yoff) {
            let v = getVector(c_x+xoff,c_y+yoff);
            return v[0]*(s_x-xoff) + v[1]*(s_y-yoff);
        }
        function interp(a0, a1, w) {
            w = 6 * Math.pow(w, 5) - 15 * Math.pow(w, 4) + 10 * Math.pow(w, 3);
            return (1-w)*a0 + w*a1
        }
        const ix0 = interp(gradient(0,0), gradient(1,0), s_x);
        const ix1 = interp(gradient(0,1), gradient(1,1), s_x);
        return interp(ix0, ix1, s_y);
    }
    return this;
}