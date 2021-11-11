-- Up
CREATE TABLE Message (
  id INTEGER PRIMARY KEY,
  text STRING,
  authorId INTEGER,
  FOREIGN KEY(authorId) REFERENCES User(id)
);

CREATE TABLE User (
  id INTEGER PRIMARY KEY,
  username STRING UNIQUE,
  passwordHash STRING
);

-- Down
DROP TABLE Message;
DROP TABLE User;
