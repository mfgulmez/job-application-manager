# Job Application Manager & Job Clipper Extension

## 📖 Project Overview

The **Job Application Manager** is a comprehensive full-stack solution designed to streamline the job search and application tracking process. It features a centralized dashboard for managing applications and a browser extension, **Job Manager Co-Pilot**, which automates the extraction of job details from major platforms like LinkedIn and Indeed,.

The system is built on a microservices-ready architecture and is fully containerized with Docker for consistent deployment.

---

## 🏗 System Architecture & Tech Stack

### 1. Backend Service (`jobmanager-backend`)
A RESTful API facilitating data persistence, scraping logic, and business rules.
* **Language:** Java 17
* **Framework:** Spring Boot 3.2.1
* **Database Interaction:** Spring Data JPA (Hibernate)
* **Migration Tool:** Flyway Core
* **HTML Parsing:** Jsoup 1.17.2
* **Monitoring:** Spring Boot Actuator

### 2. Frontend Application (`jobmanager-frontend`)
A modern Single Page Application (SPA) for the user interface.
* **Framework:** React (Vite)
* **Server:** Nginx (Reverse Proxy & Static Serving in Docker)

### 3. Database (`postgres`)
* **Engine:** PostgreSQL 15-alpine
* **Persistence:** Docker Volume (`postgres_data`)

### 4. Browser Extension (`jobclipperextension`)
A Chrome Extension (Manifest V3) for scraping job data directly from browser tabs.
* **Name:** Job Manager Co-Pilot
* **Permissions:** `activeTab`, `scripting`, `storage`
* **Supported Platforms:**
    * LinkedIn
    * Indeed
      
---

## 🚀 Installation & Setup

### Prerequisites
* **Docker & Docker Compose** (Recommended)
* **Google Chrome** (For the extension)
* **Java 17 & Node.js** (Only for manual non-Docker development)

### Method 1: Docker (Recommended)

Run the entire stack with a single command.

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd job-application-manager
    ```

2.  **Start the services:**
    ```bash
    docker-compose up --build
    ```

3.  **Access the application:**
    * **Dashboard:** [http://localhost](http://localhost) (Port 80)
    * **Backend API:** [http://localhost:8080](http://localhost:8080)
    * **Database:** Port 5432

### Method 2: Extension Installation

The extension operates outside the Docker container and must be loaded manually into Chrome.

1.  Open Chrome and navigate to `chrome://extensions`.
2.  Enable **Developer mode** (toggle in the top right).
3.  Click **Load unpacked**.
4.  Select the `jobclipperextension` folder from this project.
5.  Pin the "Job Manager Co-Pilot" to your toolbar for easy access.

---

## ⚙️ Configuration

### Environment Variables
The following environment variables are configured in `docker-compose.yml`.

| Service  | Variable | Default Value | Description |
| :--- | :--- | :--- | :--- |
| **Postgres** | `POSTGRES_DB` | `jobmanager` | Database Name |
| **Postgres** | `POSTGRES_USER` | `jobmanager_user` | Database User |
| **Postgres** | `POSTGRES_PASSWORD` | `jobmanager_pass` | Database Password |
| **Backend** | `SPRING_DATASOURCE_URL` | `jdbc:postgresql://postgres:5432/jobmanager` | DB Connection URL |

### Ports

* **Frontend:** `80` (Mapped to host)
* **Backend:** `8080` (Mapped to host for debugging/API access)
* **PostgreSQL:** `5432` (Mapped to host)

---

## 🛠 Operational Details

### Database Migrations
The backend uses **Flyway** to manage database schema changes. SQL migration scripts are located in `src/main/resources/db/migration` and are automatically applied on startup.

### Health Checks
* **Backend:** The Docker configuration waits for the database to be healthy (`pg_isready`) before starting the backend.
* **Actuator:** API health status is available at `/actuator/health`.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
