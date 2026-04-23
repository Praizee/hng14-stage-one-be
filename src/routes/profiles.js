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

//  NL PARSER
function parseNaturalLanguage(q) {
  const input = q.toLowerCase().trim();
  const filters = {};

  if (!input) return null;

  // Gender
  if (/\bmales?\b/.test(input) && !/\bfemales?\b/.test(input))
    filters.gender = "male";
  else if (/\bfemales?\b/.test(input) && !/\bmales?\b/.test(input))
    filters.gender = "female";

  // Age group
  if (/\bchildren\b|\bchild\b/.test(input)) filters.age_group = "child";
  else if (/\bteenagers?\b/.test(input)) filters.age_group = "teenager";
  else if (/\badults?\b/.test(input)) filters.age_group = "adult";
  else if (/\bseniors?\b|\belderly\b/.test(input)) filters.age_group = "senior";

  // "young" → 16–24
  if (/\byoung\b/.test(input)) {
    filters.min_age = 16;
    filters.max_age = 24;
  }

  // Age ranges
  const aboveMatch = input.match(/\babove\s+(\d+)\b/);
  const belowMatch = input.match(/\bbelow\s+(\d+)\b/);
  const olderMatch = input.match(/\bolder\s+than\s+(\d+)\b/);
  const youngerMatch = input.match(/\byounger\s+than\s+(\d+)\b/);
  const betweenMatch = input.match(/\bbetween\s+(\d+)\s+and\s+(\d+)\b/);

  if (aboveMatch) filters.min_age = parseInt(aboveMatch[1]);
  if (belowMatch) filters.max_age = parseInt(belowMatch[1]);
  if (olderMatch) filters.min_age = parseInt(olderMatch[1]);
  if (youngerMatch) filters.max_age = parseInt(youngerMatch[1]);
  if (betweenMatch) {
    filters.min_age = parseInt(betweenMatch[1]);
    filters.max_age = parseInt(betweenMatch[2]);
  }

  // Country — "from X" or "in X"
  const countryMap = {
    nigeria: "NG",
    ghana: "GH",
    kenya: "KE",
    ethiopia: "ET",
    tanzania: "TZ",
    uganda: "UG",
    angola: "AO",
    cameroon: "CM",
    senegal: "SN",
    mali: "ML",
    zambia: "ZM",
    zimbabwe: "ZW",
    mozambique: "MZ",
    madagascar: "MG",
    benin: "BJ",
    togo: "TG",
    niger: "NE",
    chad: "TD",
    sudan: "SD",
    somalia: "SO",
    rwanda: "RW",
    burundi: "BI",
    malawi: "MW",
    namibia: "NA",
    botswana: "BW",
    lesotho: "LS",
    swaziland: "SZ",
    eswatini: "SZ",
    egypt: "EG",
    morocco: "MA",
    algeria: "DZ",
    tunisia: "TN",
    libya: "LY",
    "south africa": "ZA",
    "ivory coast": "CI",
    "cote d'ivoire": "CI",
    "democratic republic of congo": "CD",
    congo: "CG",
    drc: "CD",
    "burkina faso": "BF",
    guinea: "GN",
    "sierra leone": "SL",
    liberia: "LR",
    gambia: "GM",
    "cape verde": "CV",
    mauritius: "MU",
    seychelles: "SC",
  };

  const fromMatch = input.match(
    /\b(?:from|in)\s+([a-z\s']+?)(?:\s+(?:above|below|older|younger|between|aged?|who|with|and|$))/,
  );
  if (fromMatch) {
    const countryRaw = fromMatch[1].trim();
    if (countryMap[countryRaw]) filters.country_id = countryMap[countryRaw];
  } else {
    // Try matching at end of string
    const fromEndMatch = input.match(/\b(?:from|in)\s+([a-z\s']+)$/);
    if (fromEndMatch) {
      const countryRaw = fromEndMatch[1].trim();
      if (countryMap[countryRaw]) filters.country_id = countryMap[countryRaw];
    }
  }

  if (Object.keys(filters).length === 0) return null;
  return filters;
}

//  SEARCH /api/profiles/search
router.get("/search", (req, res) => {
  const { q, page = 1, limit = 10 } = req.query;

  if (!q || q.trim() === "") {
    return res
      .status(400)
      .json({ status: "error", message: "Missing or empty parameter" });
  }

  const filters = parseNaturalLanguage(q);
  if (!filters) {
    return res
      .status(400)
      .json({ status: "error", message: "Unable to interpret query" });
  }

  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit) || 10, 50);
  const offset = (pageNum - 1) * limitNum;

  let where = "WHERE 1=1";
  const params = [];

  if (filters.gender) {
    where += " AND gender = ?";
    params.push(filters.gender);
  }
  if (filters.age_group) {
    where += " AND age_group = ?";
    params.push(filters.age_group);
  }
  if (filters.country_id) {
    where += " AND country_id = ?";
    params.push(filters.country_id);
  }
  if (filters.min_age) {
    where += " AND age >= ?";
    params.push(filters.min_age);
  }
  if (filters.max_age) {
    where += " AND age <= ?";
    params.push(filters.max_age);
  }

  const total = prepare(`SELECT COUNT(*) as count FROM profiles ${where}`).get(
    ...params,
  ).count;
  const data = prepare(
    `SELECT * FROM profiles ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
  ).all(...params, limitNum, offset);

  return res.status(200).json({
    status: "success",
    page: pageNum,
    limit: limitNum,
    total,
    data,
  });
});

//  POST /api/profiles
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
    country_name: "",
    country_probability: nationalityData.country_probability,
    created_at: new Date().toISOString(),
  };

  prepare(`
    INSERT INTO profiles (id, name, gender, gender_probability, sample_size, age, age_group, country_id, country_name, country_probability, created_at)
    VALUES (@id, @name, @gender, @gender_probability, @sample_size, @age, @age_group, @country_id, @country_name, @country_probability, @created_at)
  `).run(profile);

  return res.status(201).json({ status: "success", data: profile });
});

//  GET /api/profiles
router.get("/", (req, res) => {
  const {
    gender,
    age_group,
    country_id,
    min_age,
    max_age,
    min_gender_probability,
    min_country_probability,
    sort_by,
    order,
    page = 1,
    limit = 10,
  } = req.query;

  // Validate sort params
  const validSortBy = ["age", "created_at", "gender_probability"];
  const validOrder = ["asc", "desc"];
  if (sort_by && !validSortBy.includes(sort_by)) {
    return res
      .status(400)
      .json({ status: "error", message: "Invalid query parameters" });
  }
  if (order && !validOrder.includes(order.toLowerCase())) {
    return res
      .status(400)
      .json({ status: "error", message: "Invalid query parameters" });
  }

  const pageNum = parseInt(page) || 1;
  const limitNum = Math.min(parseInt(limit) || 10, 50);
  const offset = (pageNum - 1) * limitNum;
  const sortCol = sort_by || "created_at";
  const sortDir = (order || "asc").toUpperCase();

  let where = "WHERE 1=1";
  const params = [];

  if (gender) {
    where += " AND LOWER(gender) = ?";
    params.push(gender.toLowerCase());
  }
  if (age_group) {
    where += " AND LOWER(age_group) = ?";
    params.push(age_group.toLowerCase());
  }
  if (country_id) {
    where += " AND LOWER(country_id) = ?";
    params.push(country_id.toLowerCase());
  }
  if (min_age) {
    where += " AND age >= ?";
    params.push(parseInt(min_age));
  }
  if (max_age) {
    where += " AND age <= ?";
    params.push(parseInt(max_age));
  }
  if (min_gender_probability) {
    where += " AND gender_probability >= ?";
    params.push(parseFloat(min_gender_probability));
  }
  if (min_country_probability) {
    where += " AND country_probability >= ?";
    params.push(parseFloat(min_country_probability));
  }

  const total = prepare(`SELECT COUNT(*) as count FROM profiles ${where}`).get(
    ...params,
  ).count;
  const data = prepare(
    `SELECT * FROM profiles ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`,
  ).all(...params, limitNum, offset);

  return res.status(200).json({
    status: "success",
    page: pageNum,
    limit: limitNum,
    total,
    data,
  });
});

//  GET /api/profiles/:id
router.get("/:id", (req, res) => {
  const profile = prepare("SELECT * FROM profiles WHERE id = ?").get(
    req.params.id,
  );
  if (!profile) {
    return res
      .status(404)
      .json({ status: "error", message: "Profile not found" });
  }
  return res.status(200).json({ status: "success", data: profile });
});

// DELETE /api/profiles/:id
router.delete("/:id", (req, res) => {
  const profile = prepare("SELECT * FROM profiles WHERE id = ?").get(
    req.params.id,
  );
  if (!profile) {
    return res
      .status(404)
      .json({ status: "error", message: "Profile not found" });
  }
  prepare("DELETE FROM profiles WHERE id = ?").run(req.params.id);
  return res.status(204).send();
});

module.exports = router;

