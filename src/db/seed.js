require("dotenv").config();
const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const { v7: uuidv7 } = require("uuid");
const fs = require("fs");

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH, "profiles.db")
  : path.resolve(__dirname, "../../profiles.db");

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    gender TEXT NOT NULL,
    gender_probability REAL NOT NULL,
    sample_size INTEGER NOT NULL DEFAULT 0,
    age INTEGER NOT NULL,
    age_group TEXT NOT NULL,
    country_id TEXT NOT NULL,
    country_name TEXT NOT NULL DEFAULT '',
    country_probability REAL NOT NULL,
    created_at TEXT NOT NULL
  )
`);

const { profiles } = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../../seed_profiles.json"), "utf-8"),
);

const insert = db.prepare(`
  INSERT OR IGNORE INTO profiles 
  (id, name, gender, gender_probability, sample_size, age, age_group, country_id, country_name, country_probability, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let inserted = 0;
let skipped = 0;

for (const p of profiles) {
  const result = insert.run(
    uuidv7(),
    p.name,
    p.gender,
    p.gender_probability,
    0,
    p.age,
    p.age_group,
    p.country_id,
    p.country_name,
    p.country_probability,
    new Date().toISOString(),
  );
  if (result.changes > 0) inserted++;
  else skipped++;
}

console.log(`Seed complete. Inserted: ${inserted}, Skipped: ${skipped}`);
