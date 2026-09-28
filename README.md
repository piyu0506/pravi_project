# Government Asset Inventory

A hackathon demo for exploring public-infrastructure assets and their lifecycle. The app combines an existing React frontend, an Express API, and MongoDB Atlas data to show asset health, maintenance history, dependencies, and retirement decisions.

**DEMO MODE:** There is no real login or authentication. Use the role switcher in the top bar to preview the interface as different demo roles. This project does not use LLM or AI features.

## Demo Flow

1. Open the dashboard for asset totals, lifecycle and risk breakdowns, and recent lifecycle activity.
2. Browse the inventory; search by ID, name, type, or description and filter by category, lifecycle, risk, city, or state.
3. Open an asset to see its details, lifecycle timeline, maintenance and inspection records, and health score.
4. Recalculate the health score to display its available factor breakdown.
5. Open the dependency graph to explore asset relationships; select a graph node to open that asset.
6. Analyze retirement impact to review direct and indirect dependents and the critical chain. Analysis alone does not retire an asset.
7. As an asset manager or government admin, submit a retirement request with a reason.
8. Switch to government admin or decision maker to approve or reject the request. Approval retires the asset and records a lifecycle event.

The dashboard and inventory are available to all roles. The role switcher changes frontend-visible capabilities only; it is not an authorization boundary.

| Demo role | Main demo capabilities |
| --- | --- |
| `USER` | View dashboard and asset inventory/details |
| `GOV_ADMIN` | Full demo access, including asset edits, requests, and decisions |
| `ASSET_MANAGER` | Manage assets, lifecycle, maintenance, inspections, dependencies, and retirement requests |
| `MAINTENANCE` | View assets and health; add maintenance records and inspections |
| `INSPECTOR` | View assets and health; add inspection records |
| `DECISION_MAKER` | View dependencies and retirement analysis; approve or reject requests |

## Stack

- Frontend: React, Vite, React Router, React Flow
- Backend: Node.js, Express, Mongoose
- Database: MongoDB Atlas

## Requirements

- Node.js 22.12 or newer
- npm
- A MongoDB Atlas database and network access to its cluster

## Run Locally

The backend reads `MONGO_URI` from a `.env` file in the project root (the same folder as this README). `PORT` is optional and defaults to `3000`.

Create or update the root `.env`:

```dotenv
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-host>/<database>?retryWrites=true&w=majority
PORT=3000
```

Use your Atlas connection string and URL-encode any reserved characters in the username or password. Keep database credentials private; do not commit `.env`.

The frontend reads `VITE_API_URL` from `frontend/.env`. Set it to the backend API address:

```dotenv
VITE_API_URL=http://localhost:3000/api
```

Start the backend in one terminal:

```powershell
cd backend
npm install
npm run dev
```

Start the frontend in a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`. The backend health endpoint is `http://localhost:3000/api/health`; it reports whether MongoDB is connected.

## Optional Demo Asset Seed

To add or refresh the sample asset records in the database configured by `MONGO_URI`:

```powershell
cd backend
npm run seed
```

The seed script upserts sample assets by their `DEMO-*` IDs. It does not create lifecycle, maintenance, inspection, dependency, or retirement-request records. Use a demo database: matching `DEMO-*` asset records will be updated. The script is optional and is not run automatically.

## API Overview

All endpoints are under `/api` and return JSON. The frontend defaults to `http://localhost:3000/api`.

| Area | Endpoints |
| --- | --- |
| Health | `GET /health` |
| Assets | `GET/POST /assets`, `GET/PUT/DELETE /assets/:id` |
| Health score | `GET /assets/:id/health` |
| Lifecycle | `GET/POST /assets/:id/lifecycle` |
| Maintenance | `GET/POST /assets/:id/maintenance` |
| Inspections | `GET/POST /assets/:id/inspections` |
| Dependencies | `GET/POST /dependencies`, `DELETE /dependencies/:id`, `GET /assets/:id/dependencies` |
| Retirement impact | `GET /assets/:id/retirement-impact` |
| Retirement requests | `GET/POST /retirement-requests`, `GET /retirement-requests/:id`, `PUT /retirement-requests/:id/decision` |

## Build

From the frontend folder:

```powershell
npm run build
```

Vite writes the production bundle to `frontend/dist/`.

## Troubleshooting

- **Backend cannot connect to Atlas:** Check that the root `.env` contains `MONGO_URI`, that the URI targets the intended cluster, and that the current public IP is allowed in Atlas Network Access. VPNs, proxies, and firewalls can block or interfere with TLS traffic to Atlas on port `27017`. Do not disable TLS certificate validation.
- **Frontend reports a network/API error:** Confirm the backend is running and connected at `http://localhost:3000/api/health`. Confirm `frontend/.env` has the correct `VITE_API_URL`, then restart Vite after changing it.
- **No sample assets appear:** Confirm the connected database has records. Run the optional seed only when you intend to update the `DEMO-*` assets in that database.
