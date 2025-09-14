# Multi-Tenant SaaS Notes Application 🚀

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

This is a full-stack, multi-tenant SaaS application that allows different organizations to securely manage their notes. It features role-based access control, subscription plan limitations, and a clean, modern user interface.

## ✨ Live Demo

* **Frontend:** [Your Vercel Frontend URL Here]
* **Backend API:** [Your Vercel Backend URL Here]

---

## 📋 Features

* **Multi-Tenancy:** Secure data isolation between different tenants (e.g., Acme and Globex).
* **Authentication:** JWT-based authentication for secure access.
* **Authorization:** Two distinct user roles:
    * **Admin:** Can manage users (invite/remove) and upgrade the organization's subscription.
    * **Member:** Can create, read, update, and delete notes.
* **Subscription Gating:**
    * **Free Plan:** Limited to a maximum of 3 notes per organization.
    * **Pro Plan:** Unlimited notes.
* **CRUD API:** A full set of API endpoints for managing notes.
* **Admin Dashboard:** A dedicated interface for admins to manage their team and view pending invitations.
* **Modern Frontend:** A responsive and user-friendly interface built with React and Tailwind CSS, featuring a dark mode toggle.

---

## 🛠️ Tech Stack

| Area      | Technologies                                                      |
| :-------- | :---------------------------------------------------------------- |
| **Backend** | Node.js, Express, PostgreSQL (Neon), JWT, bcryptjs                |
| **Frontend**| React (Vite), Tailwind CSS, Axios, React Router, Lucide Icons     |
| **Deployment**| Vercel                                                            |

---

## 🏢 Multi-Tenancy Approach

This project implements a **Shared Schema, Shared Database** approach using a `tenant_slug` column as the discriminator.

* All data for all tenants resides in the same set of tables (`users`, `notes`, etc.).
* Each table that contains tenant-specific data has a `tenant_slug` column.
* Every database query is strictly filtered by the `tenant_slug` of the authenticated user, which is extracted from their JWT.

This approach was chosen for its simplicity, cost-effectiveness, and ease of management for an application of this scale. It avoids the complexity of managing multiple schemas or databases while still providing robust data isolation at the application layer.

---

## 🚀 Getting Started Locally

### Prerequisites

* Node.js (v20.x or later)
* `npm` or `yarn`
* A PostgreSQL database (e.g., a free tier from [Neon](https://neon.tech/))

### 1. Backend Setup

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Install dependencies
npm install

# 3. Create a .env file from the example
cp .env.example .env
````

**4. Configure your `.env` file:**
Update the `backend/.env` file with your database credentials and a secure JWT secret.

```env
NODE_ENV=development
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-here
FRONTEND_URL=http://localhost:5173

# Your PostgreSQL Connection String Details
DB_HOST=your-database-host
DB_PORT=5432
DB_NAME=your-database-name
DB_USER=your-database-user
DB_PASSWORD=your-database-password
```

**5. Set up the Database:**
Connect to your PostgreSQL database using a client like `psql` or TablePlus and run the SQL script located at `backend/src/models/database.sql`. This will create all the necessary tables and seed the initial test accounts.

**6. Run the Backend Server:**

```bash
npm run dev
```

The backend API will be running at `http://localhost:5000`.

### 2\. Frontend Setup

```bash
# 1. Open a new terminal and navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Create a .env file from the example
cp .env.example .env
```

**4. Configure your `.env` file:**
Ensure the `frontend/.env` file points to your local backend server.

```env
VITE_API_URL=http://localhost:5000
```

**5. Run the Frontend Development Server:**

```bash
npm run dev
```

The React application will be available at `http://localhost:5173`.

-----

## 📡 API Endpoints

The base URL for the API is `/api`. All endpoints below require a `Bearer` token unless specified otherwise.

| Endpoint                     | Method | Auth? | Admin? | Description                                      |
| :--------------------------- | :----- | :---- | :----- | :----------------------------------------------- |
| `/auth/login`                | POST   | No    | No     | Logs in a user and returns a JWT.                |
| `/auth/register-tenant`      | POST   | No    | No     | Creates a new tenant and an admin user.          |
| `/auth/profile`              | GET    | Yes   | No     | Retrieves the current user's profile.            |
| `/notes`                     | POST   | Yes   | No     | Creates a new note.                              |
| `/notes`                     | GET    | Yes   | No     | Lists notes (all for admin, own for member).     |
| `/notes/:id`                 | GET    | Yes   | No     | Retrieves a specific note.                       |
| `/notes/:id`                 | PUT    | Yes   | No     | Updates a specific note.                         |
| `/notes/:id`                 | DELETE | Yes   | No     | Deletes a specific note.                         |
| `/tenants/:slug/upgrade`     | POST   | Yes   | Yes    | Upgrades a tenant's subscription to 'pro'.       |
| `/admin/users`               | GET    | Yes   | Yes    | Lists all users and invitations for the tenant.  |
| `/admin/invite-user`         | POST   | Yes   | Yes    | Creates an invitation for a new user.            |
| `/admin/users/:userId`       | DELETE | Yes   | Yes    | Removes a user from the tenant.                  |
| `/health`                    | GET    | No    | No     | Health check endpoint.                           |

-----

## ☁️ Deployment

This project is configured for deployment on **Vercel**.

1.  Create a Vercel project and link it to your GitHub repository.
2.  Set the **Root Directory** to `backend` and deploy. Add your production environment variables.
3.  Create a second Vercel project for the frontend.
4.  Set the **Root Directory** to `frontend` and deploy. Set the `VITE_API_URL` environment variable to your deployed backend URL.

<!-- end list -->