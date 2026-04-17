const express = require("express");
const { v7: uuidv7 } = require("uuid");
const { prepare } = require("../db");
const {
  fetchGenderize,
  fetchAgify,
  fetchNationalize,
  getAgeGroup,
} = require("../services/external");

const router = express.Router();

// POST /api/profiles
router.post("/", async (req, res) => {
  const { name } = req.body;

  if (!name || typeof name !== "string" || name.trim() === "") {
    const isWrongType = name !== undefined && typeof name !== "string";
    return res.status(isWrongType ? 422 : 400).json({
      status: "error",
      message: isWrongType ? "Invalid type" : "Missing or empty name",
    });
  }

  const cleanName = name.trim().toLowerCase();

  const existing = prepare("SELECT * FROM profiles WHERE name = ?").get(
    cleanName,
  );
  if (existing) {
    return res.status(200).json({
      status: "success",
      message: "Profile already exists",
      data: existing,
    });
  }

  let genderData, ageData, nationalityData;
  try {
    [genderData, ageData, nationalityData] = await Promise.all([
      fetchGenderize(cleanName),
      fetchAgify(cleanName),
      fetchNationalize(cleanName),
    ]);
  } catch (err) {
    return res.status(502).json({
      status: "error",
      message: `${err.message} returned an invalid response`,
    });
  }

  const profile = {
    id: uuidv7(),
    name: cleanName,
    gender: genderData.gender,
    gender_probability: genderData.gender_probability,
    sample_size: genderData.sample_size,
    age: ageData.age,
    age_group: getAgeGroup(ageData.age),
    country_id: nationalityData.country_id,
    country_probability: nationalityData.country_probability,
    created_at: new Date().toISOString(),
  };

  prepare(`
    INSERT INTO profiles (id, name, gender, gender_probability, sample_size, age, age_group, country_id, country_probability, created_at)
    VALUES (@id, @name, @gender, @gender_probability, @sample_size, @age, @age_group, @country_id, @country_probability, @created_at)
  `).run(profile);

  return res.status(201).json({
    status: "success",
    data: profile,
  });
});

// GET /api/profiles
router.get("/", (req, res) => {
  const { gender, country_id, age_group } = req.query;

  let query = "SELECT * FROM profiles WHERE 1=1";
  const params = [];

  if (gender) {
    query += " AND LOWER(gender) = ?";
    params.push(gender.toLowerCase());
  }
  if (country_id) {
    query += " AND LOWER(country_id) = ?";
    params.push(country_id.toLowerCase());
  }
  if (age_group) {
    query += " AND LOWER(age_group) = ?";
    params.push(age_group.toLowerCase());
  }

  const profiles = prepare(query).all(...params);

  return res.status(200).json({
    status: "success",
    count: profiles.length,
    data: profiles,
  });
});

// GET /api/profiles/:id
router.get("/:id", (req, res) => {
  const profile = prepare("SELECT * FROM profiles WHERE id = ?").get(
    req.params.id,
  );

  if (!profile) {
    return res.status(404).json({
      status: "error",
      message: "Profile not found",
    });
  }

  return res.status(200).json({
    status: "success",
    data: profile,
  });
});

// DELETE /api/profiles/:id
router.delete("/:id", (req, res) => {
  const profile = prepare("SELECT * FROM profiles WHERE id = ?").get(
    req.params.id,
  );

  if (!profile) {
    return res.status(404).json({
      status: "error",
      message: "Profile not found",
    });
  }

  prepare("DELETE FROM profiles WHERE id = ?").run(req.params.id);

  return res.status(204).send();
});

module.exports = router;

