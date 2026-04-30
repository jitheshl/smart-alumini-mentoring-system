# Smart Alumni Mentoring System

A full-stack web application designed to bridge the gap between students and alumni, facilitating mentorship, job opportunities, and professional networking within an institutional ecosystem.

---

## 🚀 Features

### For Students
- **Profile Management**: Create and maintain professional profiles showcasing skills and projects.
- **Mentorship**: Connect with alumni mentors for guidance and career advice.
- **Meeting Scheduling**: Schedule and manage meetings with mentors directly through the platform.
- **Real-time Chat**: Communcate with mentors and peers using the integrated chat system.
- **Job Board**: Browse and apply for job opportunities posted by alumni.
- **Complaint System**: Report issues or provide feedback to administrators.

### For Alumni
- **Mentoring**: Share expertise and guide students in their professional journey.
- **Meeting Management**: Accept, reschedule, or cancel meeting requests from students.
- **Job Posting**: Post job openings and internships from their organizations.
- **Dashboard**: Track mentoring activities and student interactions.

### For Administrators
- **User Management**: Oversee student and alumni accounts.
- **Platform Oversight**: Manage job postings, mentorship connections, and handle complaints.
- **Analytics**: Gain insights into platform usage and engagement.

---

## 🛠️ Tech Stack

### Frontend
- **HTML5 & CSS3**: Responsive and modern UI design.
- **JavaScript**: Dynamic client-side logic and API interactions.
- **Socket.io-client**: Real-time communication for chat and notifications.

### Backend
- **Node.js & Express**: Scalable server-side architecture.
- **MongoDB & Mongoose**: Flexible NoSQL database for data persistence.
- **JWT (JSON Web Tokens)**: Secure user authentication and authorization.
- **Bcrypt.js**: Industry-standard password hashing.
- **Socket.io**: Real-time bidirectional communication.
- **Multer**: Middleware for handling multipart/form-data (file uploads).

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)
- [MongoDB](https://www.mongodb.com/) (local installation or MongoDB Atlas URI)

---

## ⚙️ Installation & Setup

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd PROJECT
   ```

2. **Install Dependencies**
   Navigate to the backend directory and install the required packages:
   ```bash
   cd backend
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the `backend` directory and add the following:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRES_IN=7d
   NODE_ENV=development
   ```

4. **Seed the Database (Optional)**
   If you want to populate the database with initial data (including an admin account):
   ```bash
   npm run seed
   ```
   **Default Credentials (after seeding):**
   - **Admin**: `admin@alumni.com` / `Admin@123`
   - **Student**: `student@alumni.com` / `Student@123`
   - **Alumni**: `rahul@alumni.com` / `Alumni@123`

---

## 🏃 Running the Application

1. **Start the Backend Server**
   From the `backend` directory, run:
   ```bash
   # For development (with nodemon)
   npm run dev

   # For production
   npm start
   ```

2. **Access the Application**
   The server will serve the frontend automatically. Open your browser and navigate to:
   `http://localhost:5000`

---

## 📁 Project Structure

```text
PROJECT/
├── backend/                # Server-side code
│   ├── controllers/        # Route logic
│   ├── database/           # DB configuration and models
│   ├── middleware/         # Custom Express middleware
│   ├── routes/             # API route definitions
│   └── server.js           # Entry point
├── frontend/               # Client-side code
│   └── public/             # Static files (HTML, CSS, JS)
│       ├── admin/          # Admin-specific pages
│       ├── alumni/         # Alumni-specific pages
│       ├── student/        # Student-specific pages
│       ├── css/            # Global styles
│       ├── js/             # Client-side scripts
│       └── index.html      # Main landing page
└── README.md               # Project documentation
```

---

## 🤝 Contributing

Contributions are welcome! If you'd like to improve the Smart Alumni Mentoring System, please follow these steps:
1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
