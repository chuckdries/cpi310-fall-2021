import express from "express";
import exphbs from "express-handlebars";

import sqlite3 from "sqlite3";
import { open } from "sqlite";

import bcrypt from "bcrypt";

const saltRounds = 10;

const dbPromise = open({
  filename: "./databases/database.db",
  driver: sqlite3.Database,
});

const app = express();

app.engine("handlebars", exphbs());
app.set("view engine", "handlebars");

app.use(express.urlencoded());

app.use("/static", express.static("./static"));

app.get("/", async function (req, res) {
  const db = await dbPromise;
  const messages = await db.all("SELECT * FROM Message;");
  res.render("home", { messages });
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", async (req, res) => {
  const { username, password, confirmPassword } = req.body;

  if (!username || !password || !confirmPassword) {
    return res.render("register", { error: "all fields are required" });
  }
  if (password !== confirmPassword) {
    return res.render("register", { error: "passwords must match" });
  }

  const db = await dbPromise;

  try {
    const passwordHash = await bcrypt.hash(password, saltRounds);
    console.log("passwordHash :", passwordHash);
    await db.run(
      "INSERT INTO User (username, passwordHash) VALUES (?, ?)",
      username,
      passwordHash
    );
  } catch (e) {
    console.log(e);
    if (
      e.message === "SQLITE_CONSTRAINT: UNIQUE constraint failed: User.username"
    ) {
      return res.render("register", { error: "username already taken" });
    }
    return res.render("register", { error: "something went wrong" });
  }

  res.redirect("/");
});

app.post("/message", async (req, res) => {
  console.log("body", req.body);
  const db = await dbPromise;
  await db.run("INSERT INTO Message (text) VALUES (?)", req.body.message);
  res.redirect("/");
});

const setup = async () => {
  const db = await dbPromise;
  db.migrate({ force: false });
  app.listen(8080, () => {
    console.log("listening on http://localhost:8080");
  });
};

setup();
