import express from "express";
import exphbs from "express-handlebars";

import sqlite3 from "sqlite3";
import { open } from "sqlite";

import bcrypt from "bcrypt";

import cookieParser from "cookie-parser";
import { v4 as uuidv4 } from "uuid";

const saltRounds = 10;

const dbPromise = open({
  filename: "./databases/database.db",
  driver: sqlite3.Database,
});

const app = express();

app.engine("handlebars", exphbs());
app.set("view engine", "handlebars");

app.use(cookieParser());
app.use(express.urlencoded());

app.use("/static", express.static("./static"));

const authMiddleware = async (req, res, next) => {
  if (!req.cookies || !req.cookies.authToken) {
    return next();
  }
  const db = await dbPromise;
  const authToken = await db.get(
    "SELECT * FROM AuthToken WHERE token = ?",
    req.cookies.authToken
  );
  const user = await db.get(
    "SELECT id, username FROM User WHERE id = ?",
    authToken.userId
  );
  req.user = user;
  next();
};

app.use(authMiddleware);

app.get("/", async function (req, res) {
  const db = await dbPromise;
  const messages = await db.all("SELECT * FROM Message;");
  console.log("user", req.user);
  res.render("home", { messages, user: req.user });
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
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

    const createdUser = await db.get(
      "SELECT * FROM User WHERE username = ?",
      username
    );

    const token = uuidv4();

    await db.run(
      "INSERT INTO AuthToken (token, userId) VALUES (?, ?);",
      token,
      createdUser.id
    );
    res.cookie("authToken", token);
  } catch (e) {
    console.log(e);
    if (
      e.message === "SQLITE_CONSTRAINT: UNIQUE constraint failed: User.username"
    ) {
      return res.render("register", { error: "username already taken" });
    }
    console.log(e);
    return res.render("register", { error: "something went wrong" });
  }

  res.redirect("/");
});

app.post("/login", async (req, res) => {
  const db = await dbPromise;
  const { username, password } = req.body;

  if (!username || !password) {
    return res.render("login", { error: "all field are required" });
  }

  try {
    const user = await db.get(
      "SELECT * FROM User WHERE username = ?",
      username
    );
    if (!user) {
      return res.render("login", { error: "username or password incorrect" });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.render("login", { error: "username or password incorrect" });
    }

    const token = uuidv4();

    await db.run(
      "INSERT INTO AuthToken (token, userId) VALUES (?, ?);",
      token,
      user.id
    );
    res.cookie("authToken", token);
  } catch (e) {
    console.log(e);
    return res.render("login", { error: "something went wrong" });
  }

  res.redirect("/");
});

app.post("/message", async (req, res) => {
  if (!req.user) {
    return res.redirect('/')
  }
  if (req.body.message && req.body.message.length > 500) {
    return res.render("home", {
      error: "messages must be less than 500 characters",
    });
  }

  const db = await dbPromise;
  await db.run(
    "INSERT INTO Message (text, authorId) VALUES (?, ?)",
    req.body.message,
    req.user.id
  );
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
