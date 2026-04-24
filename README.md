# React + Vite Boilerplate (JavaScript)

A production-ready React frontend boilerplate using the latest stack.

## Tech Stack

- **Framework:** [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **State Management:** [Redux Toolkit](https://redux-toolkit.js.org/)
- **Routing:** [React Router DOM](https://reactrouter.com/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/)
- **API Handling:** [Axios](https://axios-http.com/)
- **Notifications:** [Sonner](https://sonner.stevenly.me/)
- **Icons:** [Lucide React](https://lucide.dev/)

## Features

- **Scalable Folder Structure:** Clean and organized architecture.
- **Authentication:** Pre-configured Redux auth slice and services.
- **Protected Routes:** Ready-to-use route guarding logic.
- **API Interceptors:** Axios setup for global error handling and token attachment.
- **Modern UI:** Built with shadcn/ui and Tailwind for beautiful, accessible interfaces.
- **Absolute Imports:** Configured `@/` alias for cleaner import paths.
- **Code Quality:** ESLint and Prettier pre-configured.

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file (copied from `.env.example` if available):
   ```bash
   VITE_API_BASE_URL=http://localhost:5000/api
   ```

### Development

Run the development server:
```bash
npm run dev
```

### Build

Build for production:
```bash
npm run build
```

## Folder Structure

```text
src/
  app/          # Global store configuration
  features/     # Redux slices (auth, etc.)
  components/   # Shared and UI components
  pages/        # Route components (Home, Login, etc.)
  layouts/      # Layout wrappers
  routes/       # Routing logic
  services/     # API and service layer
  hooks/        # Custom React hooks
  utils/        # Utility functions
  lib/          # Library configurations (shadcn, etc.)
```

## License

MIT
