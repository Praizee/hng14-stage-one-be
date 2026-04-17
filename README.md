# HNG14 Stage One BE Task -- Profiles API

A REST API that accepts a name, enriches it with gender, age, and nationality data from external APIs, and stores the result in a SQLite database.

---

## Tech Stack

- **Runtime**: Node.js v22+
- **Framework**: Express
- **Database**: SQLite (via Node's built-in `node:sqlite`)
- **Deployment**: Railway

## Local Development

### Prerequisites

- Node.js v22+
- pnpm

### Setup

```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
pnpm install
pnpm dev
```

Server runs on `http://localhost:3000`

### Environment Variables

| Variable  | Description                        | Default      |
| --------- | ---------------------------------- | ------------ |
| `PORT`    | Port to run the server on          | `3000`       |
| `DB_PATH` | Directory path for the SQLite file | Project root |

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
    "country_probability": 0.09,
    "created_at": "2026-04-17T14:55:29.551Z"
  }
}
```

---

### GET `/api/profiles`

Returns all profiles. Supports optional filters.

**Query Parameters**

| Param        | Example            |
| ------------ | ------------------ |
| `gender`     | `?gender=female`   |
| `country_id` | `?country_id=NG`   |
| `age_group`  | `?age_group=adult` |

Filter values are case-insensitive.

---

### GET `/api/profiles/:id`

Returns a single profile by ID.

---

### DELETE `/api/profiles/:id`

Deletes a profile by ID. Returns `204 No Content`.

## Age Group Classification

| Age Range | Group    |
| --------- | -------- |
| 0 – 12    | child    |
| 13 – 19   | teenager |
| 20 – 59   | adult    |
| 60+       | senior   |

## External APIs Used

- [Genderize](https://genderize.io) — predicts gender from name
- [Agify](https://agify.io) — predicts age from name
- [Nationalize](https://nationalize.io) — predicts nationality from name

