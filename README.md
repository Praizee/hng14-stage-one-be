# HNG14 Stage One BE Task -- Profiles API

A REST API that accepts a name, enriches it with gender, age, and nationality data from external APIs, and stores the result in a SQLite database.

---

## Tech Stack

- **Runtime**: Node.js v22+
- **Framework**: Express
- **Database**: SQLite (via Node's built-in `node:sqlite`)
- **Deployment**: Railway

---

## Local Development

### Prerequisites

- Node.js v22+
- pnpm

### Setup

```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
pnpm install
pnpm seed   # seeds the database with 2026 profiles
pnpm dev
```

Server runs on `http://localhost:3000`

### Environment Variables

| Variable  | Description                        | Default      |
| --------- | ---------------------------------- | ------------ |
| `PORT`    | Port to run the server on          | `3000`       |
| `DB_PATH` | Directory path for the SQLite file | Project root |

---

## API Reference

### POST `/api/profiles`

Creates a new profile by enriching the given name with external API data. Returns existing profile if name already exists.

**Request Body**

```json
{ "name": "emma" }
```

**Response `201`**

```json
{
  "status": "success",
  "data": {
    "id": "019d9bf0-990e-70ac-a59d-e5534dea6e90",
    "name": "emma",
    "gender": "female",
    "gender_probability": 0.97,
    "sample_size": 500304,
    "age": 43,
    "age_group": "adult",
    "country_id": "CN",
    "country_name": "",
    "country_probability": 0.09,
    "created_at": "2026-04-17T14:55:29.551Z"
  }
}
```

---

### GET `/api/profiles`

Returns all profiles. Supports filtering, sorting, and pagination.

**Query Parameters**

| Param                     | Description                                           | Example                        |
| ------------------------- | ----------------------------------------------------- | ------------------------------ |
| `gender`                  | Filter by gender                                      | `?gender=female`               |
| `age_group`               | Filter by age group                                   | `?age_group=adult`             |
| `country_id`              | Filter by ISO country code                            | `?country_id=NG`               |
| `min_age`                 | Minimum age                                           | `?min_age=18`                  |
| `max_age`                 | Maximum age                                           | `?max_age=40`                  |
| `min_gender_probability`  | Minimum gender confidence score                       | `?min_gender_probability=0.8`  |
| `min_country_probability` | Minimum country confidence score                      | `?min_country_probability=0.5` |
| `sort_by`                 | Sort field: `age`, `created_at`, `gender_probability` | `?sort_by=age`                 |
| `order`                   | Sort direction: `asc` or `desc`                       | `?order=desc`                  |
| `page`                    | Page number (default: 1)                              | `?page=2`                      |
| `limit`                   | Results per page (default: 10, max: 50)               | `?limit=25`                    |

All filters are combinable. Filter values are case-insensitive.

---

### GET `/api/profiles/search?q=`

Natural language search endpoint. Converts plain English queries into structured filters.

**Example:**

```
GET /api/profiles/search?q=young males from nigeria
```

Also supports `page` and `limit` query parameters.

---

### GET `/api/profiles/:id`

Returns a single profile by ID.

---

### DELETE `/api/profiles/:id`

Deletes a profile by ID. Returns `204 No Content`.

---

## Natural Language Parsing

The `/api/profiles/search` endpoint uses rule-based parsing — no AI or LLMs involved.

### Supported Keywords & Mappings

| Query Pattern                    | Maps To                  |
| -------------------------------- | ------------------------ |
| `males` / `male`                 | `gender=male`            |
| `females` / `female`             | `gender=female`          |
| `children` / `child`             | `age_group=child`        |
| `teenagers` / `teenager`         | `age_group=teenager`     |
| `adults` / `adult`               | `age_group=adult`        |
| `seniors` / `senior` / `elderly` | `age_group=senior`       |
| `young`                          | `min_age=16, max_age=24` |
| `above 30` / `older than 30`     | `min_age=30`             |
| `below 40` / `younger than 40`   | `max_age=40`             |
| `between 20 and 35`              | `min_age=20, max_age=35` |
| `from nigeria` / `in nigeria`    | `country_id=NG`          |

### How It Works

1. The query string is lowercased and trimmed
2. Regex patterns match gender, age group, age range, and country keywords in any order
3. Matched values are converted to structured filters
4. Filters are applied to the database using the same logic as `GET /api/profiles`
5. If no filters are extracted, the endpoint returns `"Unable to interpret query"`

### Supported Countries

Nigeria, Ghana, Kenya, Ethiopia, Tanzania, Uganda, Angola, Cameroon, Senegal, Mali, Zambia, Zimbabwe, Mozambique, Madagascar, Benin, Togo, Niger, Chad, Sudan, Somalia, Rwanda, Burundi, Malawi, Namibia, Botswana, Lesotho, Eswatini, Egypt, Morocco, Algeria, Tunisia, Libya, South Africa, Ivory Coast, DRC, Congo, Burkina Faso, Guinea, Sierra Leone, Liberia, Gambia, Cape Verde, Mauritius, Seychelles.

### Limitations

- Only one gender can be matched per query — `"male and female"` will not match either
- `"young"` always maps to ages 16–24 regardless of other age keywords in the query
- Country matching requires the full country name in English — abbreviations and demonyms (e.g. `"Nigerian"`) are not supported
- Queries with no recognizable keywords return `"Unable to interpret query"` rather than returning all profiles
- Complex queries with `"not"`, `"except"`, or negation are not supported
- Only countries in the supported list above are recognized — unlisted countries will be ignored

---

## Age Group Classification

| Age Range | Group    |
| --------- | -------- |
| 0 – 12    | child    |
| 13 – 19   | teenager |
| 20 – 59   | adult    |
| 60+       | senior   |

---

## External APIs Used

- [Genderize](https://genderize.io) — predicts gender from name
- [Agify](https://agify.io) — predicts age from name
- [Nationalize](https://nationalize.io) — predicts nationality from name

