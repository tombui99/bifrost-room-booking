# Bifrost Room Booking

Bifrost is a modern, real-time meeting room booking system designed for efficiency and ease of use. It features a comprehensive dashboard, flexible booking views, and specialized tablet interfaces for meeting rooms.

## 🚀 Tech Stack

### Frontend

- **Framework**: [Angular 21](https://angular.io/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Charts**: [Chart.js](https://www.chartjs.org/)
- **Deployment**: [Firebase Hosting](https://firebase.google.com/docs/hosting)

### Backend

- **Runtime**: [Node.js](https://nodejs.org/) (>= 18)
- **Framework**: [Express.js](https://express.com/)
- **Database & Auth**: [Firebase Firestore](https://firebase.google.com/docs/firestore) & [Firebase Authentication](https://firebase.google.com/docs/auth)
- **Deployment**: [Fly.io](https://fly.io/)

---

## ✨ Key Features

- **Real-time Dashboard**: Overview of room occupancy, usage trends, and top users.
- **Flexible Bookings**:
  - Daily and Weekly calendar views.
  - **Recurring Bookings**: Support for daily, weekly, monthly, and workday repetitions.
  - **Conflict Detection**: Built-in logic to prevent double bookings.
- **Room Management**: Easy-to-use administrative interface for managing room details and capacity.
- **Tablet View**: A dedicated UI designed for wall-mounted tablets outside meeting rooms.
- **Control Deck**: Quick-access interface for room-specific actions.

---

## 🛠 Project Structure

- `frontend/`: Angular application source code.
- `backend/`: Node.js Express server with Firebase Admin SDK integration.

---

## 🏁 Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn
- Firebase account and project

### Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Add your `serviceAccountKey.json` from Firebase to the `backend/` folder.
4. Create a `.env` file with necessary environment variables (e.g., `PORT`).
5. Run the development server:

   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Update the Firebase configuration in `src/environments/` (if applicable) or `app.config.ts`.
4. Run the development server:

   ```bash
   npm run start
   ```

   Access the app at `http://localhost:4200`.

---

## 🚢 Deployment

### Deploying Backend

Deploy to Fly.io using the provided `Dockerfile` and `fly.toml`:

```bash
fly deploy
```

### Deploying Frontend

Deploy to Firebase Hosting:

```bash
firebase deploy
```
