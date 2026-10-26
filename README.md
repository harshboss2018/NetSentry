# NetSentry — Network Monitoring & Security Platform

NetSentry is a network monitoring and security platform designed to provide real-time visibility into network activity, connections, routing, performance, and security events. It combines a web-based dashboard with a Python backend to help users explore network behavior and troubleshoot common networking issues.

## Features

- **Dashboard:** Centralized view of network status and monitoring information.
- **Connection Monitoring:** View and inspect network connection information.
- **Network Topology:** Explore network structure and relationships.
- **Routing Lab:** Explore routing-related functionality.
- **Performance Lab:** Monitor and analyze network performance.
- **Security Events:** Review network security events and rule-related information.
- **IP Tools:** Access IP-related networking utilities.
- **WebSocket Support:** Support for real-time communication between the frontend and backend.
- **TCP/UDP Clients:** Client utilities for connection-oriented and connectionless network communication.

## Technology Stack

### Frontend
- React
- Vite
- JavaScript
- CSS
- Tailwind CSS configuration

### Backend
- Python
- FastAPI
- WebSockets
- SQLite

### Development Tools
- Node.js and npm
- Python and pip
- Git and GitHub

## Project Structure

```text
CN/
├── netsentry/
│   ├── backend/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   ├── routers/
│   │   ├── services/
│   │   ├── ws/
│   │   ├── requirements.txt
│   │   └── test_suite.py
│   ├── client/
│   │   ├── tcp_client.py
│   │   └── udp_client.py
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   ├── store/
│   │   │   ├── App.jsx
│   │   │   └── main.jsx
│   │   ├── package.json
│   │   └── vite.config.js
│   ├── run_netsentry.bat
│   ├── README.md
│   └── ACADEMIC_GUIDE.md
└── README.md
```

## Prerequisites

Install the following software before running the project:

- Python 3
- Node.js and npm
- Git

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/harshboss2018/NetSentry.git
cd NetSentry/netsentry
```

### 2. Set up the backend

Open a terminal in the backend directory:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment on Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install the Python dependencies:

```powershell
pip install -r requirements.txt
```

### 3. Set up the frontend

Open another terminal:

```powershell
cd frontend
npm install
```

## Running the Project

### Start the backend

From the `backend` directory, activate the virtual environment if needed and run:

```powershell
uvicorn main:app --reload
```

The backend will typically be available at:

`http://127.0.0.1:8000`

If the application uses a different ASGI import path or port, follow the project configuration.

### Start the frontend

From the `frontend` directory, run:

```powershell
npm run dev
```

Open the local URL displayed by Vite in your terminal, typically:

`http://localhost:5173`

Keep both terminal sessions running while using the application.

## Testing

The backend includes a test suite at `backend/test_suite.py`.

Review the test file and project dependencies to determine the supported test command before running the tests.

## Security Notes

- Do not commit API keys, passwords, or private environment variables.
- Keep local configuration and development secrets out of version control.
- Use appropriate authorization and access controls before exposing the backend to a public network.
- Use network scanning and monitoring features only on systems and networks you are authorized to test.

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Make and test your changes.
4. Commit your changes with a descriptive message.
5. Open a pull request.

## License

No license has been specified yet. Add a license before allowing others to reuse, modify, or distribute this project.

## Author

**Harsh**

GitHub: [@harshboss2018](https://github.com/harshboss2018)

## Repository

[https://github.com/harshboss2018/NetSentry](https://github.com/harshboss2018/NetSentry)
