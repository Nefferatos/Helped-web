# Helped - Full Stack Web Application

A modern full-stack web application with React + TypeScript frontend and Node.js/Express backend.

## Project Structure

```
├── frontend/          # React + TypeScript application (Vite)
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── tsconfig.json
├── backend/           # Node.js/Express API server
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js v18+ and npm/yarn
- Git

### Installation

1. **Clone or setup the project**
   ```bash
   cd helped-web
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd ../backend
   npm install
   ```

### Development

Run both frontend and backend in separate terminals:

**Terminal 1 - Backend (runs on port 3000)**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend (runs on port 5173)**
```bash
cd frontend
npm run dev
```

Access the application at `http://localhost:5173`

The frontend is configured to proxy API calls from `/api` to the backend server.

### Building for Production

**Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

**Backend:**
```bash
cd backend
npm run build
npm start
```

## Available Scripts

### Frontend
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Backend
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run compiled server
- `npm run lint` - Run ESLint

## Features

### Frontend
- ⚛️ React 18
- 📘 TypeScript
- ⚡ Vite (fast build tool)
- 🎨 Modern CSS support
- 📦 ESLint for code quality

### Backend
- 🚀 Express.js
- 📘 TypeScript
- 🔄 Hot reload in development (ts-node-dev)
- 🛡️ CORS enabled
- 📋 ESLint for code quality

## API Endpoints

- `GET /` - Welcome message
- `GET /api/health` - Server health check
- `GET /api/data` - Sample data endpoint

## Environment Variables

### Backend
Create a `.env` file in the backend directory:

```bash
PORT=3000
NODE_ENV=development
```

See `.env.example` for reference.

## Next Steps

1. Customize the frontend components in `frontend/src/`
2. Build out your API endpoints in `backend/src/server.ts`
3. Add database integration (MongoDB, PostgreSQL, etc.)
4. Implement authentication/authorization
5. Add environment-specific configurations

## License

ISC
