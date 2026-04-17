const Database = require("better-sqlite3");
const path = require("path");
const { CREATE_PROFILES_TABLE } = require("./schema");

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH, "profiles.db")
  : path.resolve(__dirname, "../../profiles.db");

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");

db.exec(CREATE_PROFILES_TABLE);

console.log(`SQLite connected at: ${DB_PATH}`);

module.exports = db;
