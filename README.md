# Smart Office Management System — Frontend

A modern, enterprise-quality React single-page application built with Vite, Tailwind CSS, Lucide icons, and React Router, designed for seamless integration with the Spring Boot backend.

---

## 🛠️ Technology Stack

- **Framework**: React 18
- **Build Tool**: Vite 5
- **Routing**: React Router v6
- **Styling**: Tailwind CSS + Custom Design System
- **Icons**: Lucide React
- **HTTP Client**: Axios (pre-configured with base URL)

---

## 📋 Prerequisites & Installation

### 1. Install Node.js & npm (if not already installed)

Download and install the latest LTS release of Node.js:
- **Official Installer**: [https://nodejs.org/](https://nodejs.org/) (Choose LTS)
- **Windows Package Manager (winget)**:
  ```powershell
  winget install OpenJS.NodeJS.LTS
  ```
- After installation, reopen your terminal and verify:
  ```powershell
  node -v
  npm -v
  ```

---

## 🚀 Getting Started

From the project root:

```powershell
# Navigate into the frontend folder
cd frontend

# Install all dependencies
npm install

# Start the local development server
npm run dev
```

The application will be running at:
👉 **`http://localhost:5173`**

---

## 📦 Building for Production

To create an optimized production build:

```powershell
npm run build
```

The compiled output will be generated inside the `dist/` directory.

To preview the production build locally:

```powershell
npm run preview
```

---

## 🔗 Spring Boot Backend Integration

- **Backend REST URL**: `http://localhost:8080/api`
- **Frontend Dev URL**: `http://localhost:5173`
- **CORS Support**: The Spring Boot backend (`SecurityConfig.java`) is pre-configured to accept requests from `http://localhost:5173`.
- **Environment Configuration**: Set in `.env`:
  ```env
  VITE_API_BASE_URL=http://localhost:8080/api
  VITE_APP_NAME="Smart Office Management System"
  ```

---

## 📁 Project Architecture

```
frontend/
├── .env                  # Local environment configuration
├── .env.example          # Safe environment template
├── .gitignore            # Git exclusion rules
├── index.html            # HTML5 template entry point
├── package.json          # Project dependencies and npm scripts
├── postcss.config.js     # PostCSS pipeline
├── tailwind.config.js    # Design system tokens and colors
├── vite.config.js        # Vite bundler & reverse proxy setup
└── src/
    ├── main.jsx          # React application root mount
    ├── App.jsx           # Root layout provider & routing shell
    ├── index.css         # Tailwind directives & global styling
    ├── assets/           # Static media assets
    ├── components/
    │   └── common/       # Modular UI components (Button, Card, InputField, Badge, PageHeader, etc.)
    ├── context/          # Global application state (sidebar, drawer, toast alerts)
    ├── layouts/          # Shell layouts (Sidebar, Navbar, MainLayout)
    ├── pages/            # View modules (Overview, Employees, Attendance, Tasks, etc.)
    ├── routes/           # Centralized React Router configuration
    ├── services/         # Axios instance (apiClient) and API endpoint constants
    └── utils/            # Helper utilities (cn classname merger)
```
