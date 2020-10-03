const express = require('express');
const app = express();
app.use(express.static(`${__dirname}`));
const serv = require('http').Server(app);

// const perlin = require('./mapgen/generatemap.js');
// const map = require('./mapgen/generatemap.js');

serv.on('error', (err) => {
    console.error('Server error: ', err);
});

serv.listen(process.env.PORT || 2000, () => {
    console.log('Server Started');
});
