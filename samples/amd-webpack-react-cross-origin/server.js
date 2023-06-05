const express = require('express');
const path = require('path');

const PORT1 = 3000;
const PORT2 = 8080;

express()
    .get('/', function (req, res) {
        res.sendFile(path.join(__dirname, 'dist/index.html'));
    })
    .listen(PORT1);

express()
    .use(express.static(path.join(__dirname, 'dist')))
    .listen(PORT2);

console.log(`Server started at http://localhost:${PORT1} and http://localhost:${PORT2}`);
