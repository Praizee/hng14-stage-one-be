const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const { CREATE_PROFILES_TABLE } = require("./schema");

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH, "profiles.db")
  : path.resolve(__dirname, "../../profiles.db");

const db = new DatabaseSync(DB_PATH);

db.exec(CREATE_PROFILES_TABLE);

const prepare = (sql) => ({
  get: (...params) => db.prepare(sql).get(...params),
  all: (...params) => db.prepare(sql).all(...params),
  run: (params) => db.prepare(sql).run(params),
});

console.log(`SQLite connected at: ${DB_PATH}`);

module.exports = { prepare };
