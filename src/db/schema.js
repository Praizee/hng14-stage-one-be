const CREATE_PROFILES_TABLE = `
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
`;

const ADD_COUNTRY_NAME_COLUMN = `
  ALTER TABLE profiles ADD COLUMN country_name TEXT NOT NULL DEFAULT ''
`;

module.exports = { CREATE_PROFILES_TABLE, ADD_COUNTRY_NAME_COLUMN };
