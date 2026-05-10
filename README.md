# Learn Dev

Learn Dev is a MERN e-learning platform with a React frontend and an Express/MongoDB backend. It includes course browsing, authentication, student learning pages, admin course management, payments, reviews, and support ticket flows.

## Tech Stack

- Frontend: React, Vite, React Router, Tailwind CSS, Axios
- Backend: Node.js, Express, MongoDB, Mongoose
- Integrations: Razorpay, ImageKit, Nodemailer

## Project Structure

```text
learn dev/
  backend/      Express API, MongoDB models, routes, seed scripts
  frontend/     React/Vite application
```

## Prerequisites

- Node.js 18 or newer
- npm
- MongoDB running locally or a MongoDB Atlas connection string

## Backend Setup

```bash
cd "learn dev/backend"
npm install
cp .env.example .env
npm run dev
```

Update `learn dev/backend/.env` with your local values:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/learndev
JWT_SECRET=changeme_jwt_secret
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
FRONTEND_URL=http://localhost:5173
IMAGEKIT_PUBLIC_KEY=your_public_key_here
IMAGEKIT_PRIVATE_KEY=your_private_key_here
IMAGEKIT_URL_ENDPOINT=your_url_endpoint_here
```

Backend scripts:

```bash
npm start
npm run dev
npm run create-admin
npm run seed-demo
npm run seed-student
```

## Frontend Setup

Open a second terminal:

```bash
cd "learn dev/frontend"
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` by default.

Frontend scripts:

```bash
npm run dev
npm run build
npm run preview
```

## Running The App

1. Start MongoDB.
2. Start the backend from `learn dev/backend`.
3. Start the frontend from `learn dev/frontend`.
4. Open `http://localhost:5173`.

## Deployment

Recommended hosting setup:

- Backend: Render Web Service
- Frontend: Vercel
- Database: MongoDB Atlas

### 1. Create MongoDB Atlas Database

Create a MongoDB Atlas cluster, add a database user, allow network access for your host, and copy the MongoDB connection string. Use it as `MONGO_URI` in the backend service.

### 2. Deploy Backend On Render

Render can use the `render.yaml` file in this repository.

If configuring manually in Render:

```text
Service type: Web Service
Root directory: learn dev/backend
Build command: npm install
Start command: npm start
```

Add these environment variables in Render:

```env
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_long_random_secret
FRONTEND_URL=https://your-frontend-domain.vercel.app
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
IMAGEKIT_PUBLIC_KEY=your_public_key_here
IMAGEKIT_PRIVATE_KEY=your_private_key_here
IMAGEKIT_URL_ENDPOINT=your_url_endpoint_here
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_app_password
EMAIL_FROM=Learn Dev <your_email@example.com>
```

After Render deploys, copy the backend URL. It will look like:

```text
https://learn-dev-backend.onrender.com
```

### 3. Deploy Frontend On Vercel

Create a Vercel project from this GitHub repository.

Use these settings:

```text
Framework preset: Vite
Root directory: learn dev/frontend
Build command: npm run build
Output directory: dist
```

Add this environment variable in Vercel:

```env
VITE_API_BASE_URL=https://your-render-backend-url.onrender.com/api
```

The frontend includes `vercel.json` so direct page refreshes on routes like `/login` and `/courses` work correctly.

### 4. Update CORS

After Vercel gives you the frontend URL, add it to Render as:

```env
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

Redeploy the Render backend after changing environment variables.

## Notes

- `.env`, `node_modules`, logs, and build output are intentionally ignored.
- Use `.env.example` as the template for backend environment variables.
- Course media files are stored in `learn dev/frontend/public/course-assets`.
