# RustFS Upload System 📦

A high-performance, full-stack personal cloud storage system and file gallery designed to manage, organize, and transfer files seamlessly. Built with modern web technologies, it features an S3-compatible storage backend, background job queues for processing, and a highly responsive Next.js frontend.

## 🌟 Key Features

- **Hierarchical Storage**: Create folders, organize files, and navigate through a clean breadcrumb interface.
- **Robust File Management**: Upload files, download via high-speed presigned URLs, rename, move, and view detailed file metadata.
- **Trash & Recovery**: Soft-delete files into a Trash bin with full restoration capabilities, alongside permanent deletion.
- **Starred Items**: Bookmark your most important files and folders for quick access.
- **In-App Previews**: View image and document previews directly in the browser.
- **Background Processing**: Asynchronous tasks powered by BullMQ and Redis for heavy workloads like image thumbnail generation and cleanups.
- **Transfer Tracking**: Real-time progress indicators for file downloads via a global `TransferContext`.

## 🏗️ Technology Stack

### Frontend (`/client`)
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router) & React 19
- **Styling**: Tailwind CSS v4 & custom CSS for rich layout
- **Icons**: Lucide React
- **Architecture**: Custom React hooks (`useGalleryData`, `useFilePreview`) isolating business logic from UI components.

### Backend (`/server`)
- **Runtime**: Node.js & Express.js 5.x
- **Language**: TypeScript (Node16 Module Resolution)
- **Database**: PostgreSQL (`pg`)
- **Caching & Queues**: Redis & [BullMQ](https://docs.bullmq.io/)
- **Storage**: AWS S3 SDK (`@aws-sdk/client-s3`) compatible with any S3 backend (Minio, AWS, RustFS).
- **Processing**: [Sharp](https://sharp.pixelplumbing.com/) for fast image processing.

## 🚀 Getting Started

### Prerequisites
- Node.js v24+
- PostgreSQL
- Redis Server
- S3-compatible Storage Server (e.g., Minio)

### Local Development

1. **Start Infrastructure Services**
   Ensure your database, Redis, and S3 containers are running.
   
2. **Setup Backend**
   ```bash
   cd server
   npm install
   npm run dev    # Starts the Express API
   npm run worker # Starts the BullMQ background job processor
   ```

3. **Setup Frontend**
   ```bash
   cd client
   npm install
   npm run dev    # Starts the Next.js app on port 3001
   ```

4. **Access the App**
   Open [http://localhost:3001](http://localhost:3001) in your browser.

## 📦 Version Release Notes (v0.1.0)

### Major Improvements
- **Architectural Refactor**: Fully decoupled the React UI components from data-fetching and mutation logic by introducing strict custom hooks (`useGalleryData` & `useFilePreview`).
- **Server Modularization**: Reorganized the Express server into a clean `src/` directory structure separating config, middlewares, and routes.
- **CI/CD Integration**: Implemented strict GitHub Actions workflows for automated code linting, Next.js build verification, and NPM Security Audits (`npm audit --audit-level=high`) on every push to `main` and `staging`.
- **TypeScript Modernization**: Upgraded the backend compilation target to utilize strict `Node16` module resolution standards.
- **Performance Optimization**: Corrected React `setState` hydration issues to eliminate cascading renders and resolved Next.js Image Component warnings.

## 🤝 CI Pipeline
This project enforces code quality and security via GitHub Actions.
- **Web**: Lints Next.js codebase and performs production static compilation checks.
- **API**: Performs strict `tsc` TypeScript builds and NPM vulnerability audits.

---
*Built with ❤️ for reliable and secure cloud storage.*
