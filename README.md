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

## Notes

- `.env`, `node_modules`, logs, and build output are intentionally ignored.
- Use `.env.example` as the template for backend environment variables.
- Course media files are stored in `learn dev/frontend/public/course-assets`.
