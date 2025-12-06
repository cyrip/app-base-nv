# Agent App

This is a full-stack application with a Vue.js frontend and a Node.js/Express backend, using MySQL as the database.

## Getting Started

### Prerequisites

- Docker and Docker Compose installed on your machine.

### Installation & Startup

1.  Clone the repository (if you haven't already).
2.  Navigate to the project root.
3.  Run the following command to build and start the containers:

    ```bash
    docker compose up --build
    ```

    This command will:
    - Build the frontend and backend images.
    - Start the MySQL database.
    - Start the backend server (waiting for the database to be ready).
    - Start the frontend development server.

## Database Seeding

The application automatically seeds the database with initial users when the backend starts up. You do not need to run any manual commands.

### Default Users

| Email | Password | Role |
| :--- | :--- | :--- |
| `admin@codeware.cc` | `password` | Admin |
| `user@codeware.cc` | `password` | User |

## Accessing the Application

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3000](http://localhost:3000)

## Development

- **Backend**: The backend runs with `nodemon` and will restart automatically on file changes.
- **Frontend**: The frontend runs with `vite` and supports hot module replacement (HMR).
