const express = require("express");
const fs = require("fs");

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send(`<form action="/submit" method="post">
              <input name="user" size=10 />
              <input name="id" type="hidden" value="blablabla" />
              <button type="submit">Submit</button>
            </form>`);
});

app.post("/submit", (req, res) => {
  console.log(req.body);

  fs.appendFile(
    "submissions.log",
    `Form submitted! ${new Date().toISOString()}\n`,
    (err) => {
      if (err) {
        console.error("Error writing to file:", err);
        res.status(500).send("Internal Server Error");
      } else {
        console.log("Form submission recorded.");
        res.send("Form submitted!");
      }
    },
  );
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
