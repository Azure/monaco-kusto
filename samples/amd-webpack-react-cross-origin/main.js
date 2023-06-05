const express = require("express");
const path = require("path");

const port = process.env.PORT || 3000;
const app = express();

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "dist/index.html"));
});

app.listen(port);
console.log("Server started at http://localhost:" + port);
