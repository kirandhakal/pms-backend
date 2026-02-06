# 🚀 Project Management System (PMS) – Backend

A scalable, role-based Project Management System backend built with **Node.js**, **Express**, and **MongoDB**.
Designed for teams to collaborate, manage projects, track progress, and streamline communication.

---

## 📌 Features

### 🔐 Authentication & Authorization

* JWT-based authentication
* Session management
* Role-based access control (RBAC)
* Secure password hashing (bcrypt)

### 👥 Role Management

* Admin
* Project Manager
* Team Member

### 🏗 Project Management

* Create, update, delete projects
* Assign project managers
* Add/remove team members
* Track project progress

### 📊 Dashboard

* Admin dashboard → Overview of all projects & team progress
* Project Manager dashboard → Assigned projects & team performance
* Team dashboard → Individual task & progress tracking

### 🤝 Team Collaboration

* Invite team members
* Assign tasks
* Track individual contributions

### 💬 Discussion Section

* Project-based discussion threads
* Role-based discussion visibility
* Comment & reply system

---

## 🛠 Tech Stack

* **Node.js**
* **Express.js**
* **MongoDB (Mongoose)**
* **JWT**
* **bcrypt**
* **Express-session**
* **dotenv**

---

## 📂 Project Structure

```
pms-backend/
│
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── app.js
│
├── .env
├── package.json
└── server.js
```

---

## ⚙️ Installation

### 1️⃣ Clone the repository

```bash
git clone <your-repo-url>
cd pms-backend
```

### 2️⃣ Install dependencies

```bash
npm install
```

### 3️⃣ Setup Environment Variables

Create a `.env` file:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/pms
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1d
SESSION_SECRET=your_session_secret
```

### 4️⃣ Run the server

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

---

## 🔐 Authentication Flow

1. User registers
2. User logs in
3. Server generates JWT token
4. Token required for protected routes
5. Role-based middleware restricts access

Example Protected Route:

```js
router.get("/admin/dashboard", verifyToken, authorizeRoles("admin"), controller);
```

---

## 🧠 Core API Endpoints

### Auth

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
```

### Projects

```
POST   /api/projects
GET    /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id
```

### Team

```
POST   /api/team/invite
POST   /api/team/assign
GET    /api/team/:projectId
```

### Discussion

```
POST   /api/discussion/:projectId
GET    /api/discussion/:projectId
```

### Dashboard

```
GET /api/dashboard/admin
GET /api/dashboard/manager
GET /api/dashboard/member
```

---

## 🔒 Security Best Practices

* Password hashing with bcrypt
* JWT expiration handling
* Role-based route protection
* Input validation middleware
* Secure environment variables
* CORS configuration

---

## 📈 Future Enhancements

* Real-time updates using Socket.io
* Email invitations
* Activity logs
* File attachments in discussions
* Performance analytics dashboard
* Microservices architecture scaling

---

## 🧪 Testing

Run tests:

```bash
npm test
```

---

## 🚀 Deployment

Recommended Platforms:

* Render
* DigitalOcean
* AWS EC2
* Dockerized deployment

For Docker:

```bash
docker build -t pms-backend .
docker run -p 5000:5000 pms-backend
```

---

## 👨‍💻 Author

Developed by Kiran
Computer Engineering Student | Backend Developer | System Architect in the Making 🚀

---