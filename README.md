# Milk Dairy Management System

## Run locally

1. Create `server/.env` from `server/.env.example` and set `MONGODB_URI` to a MongoDB Atlas connection string.
2. In the project folder, run `npm install` and `npm install --prefix server` and `npm install --prefix client`.
3. Run `npm run dev`. The React app opens at `http://localhost:5173`; the API runs at `http://localhost:5000`.

## Deploy

- Create a MongoDB Atlas database and use its connection string as the Render `MONGODB_URI` environment variable.
- Deploy the `server` folder as a Render Node web service. Set `CLIENT_ORIGIN` to the deployed Vercel frontend URL.
- Deploy the `client` folder to Vercel. Set `VITE_API_URL` to the Render API URL (without a trailing slash).

The system stores customers and milk collection entries in MongoDB. Each collection total is calculated as quantity multiplied by rate per litre.
