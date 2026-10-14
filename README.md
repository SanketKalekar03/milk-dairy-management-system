# Milk Dairy Management System

## Run locally

1. Create `server/.env` from `server/.env.example` and set `MONGODB_URI` to a MongoDB Atlas connection string. The API now requires a successful MongoDB connection before it starts; it does not report temporary in-memory writes as saved data.
2. In the project folder, run `npm install` and `npm install --prefix server` and `npm install --prefix client`.
3. Copy `client/.env.example` to `client/.env` (or leave it unset to use the same default), then run `npm run dev`. The React app opens at `http://localhost:5173`; it calls the API at `http://localhost:5000`.

## Deploy

- Create a MongoDB Atlas database and use its connection string as the Render `MONGODB_URI` environment variable.
- Deploy the `server` folder as a Render Node web service. Set `CLIENT_ORIGIN` to the deployed Vercel frontend URL.
- Deploy the `client` folder to Vercel. Set `VITE_API_URL` to the Render API URL (without a trailing slash).

The system stores customers and milk collection entries in MongoDB. Each collection total is calculated as quantity multiplied by rate per litre.
