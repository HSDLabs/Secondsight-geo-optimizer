# SecondSight GEO Optimizer

<div align="center">
  <img src="./public/logo.svg" alt="SecondSight Logo" width="80" height="80" />
  <br/>
  <h3>The ultimate AI & Generative Engine Optimization (GEO) Analysis Workspace</h3>
</div>

<br/>

![SecondSight GEO Optimizer](./screenshot.png)

*(Note: Add a screenshot of the dashboard named `screenshot.png` to the root of this repository to display it here.)*

## Overview

SecondSight GEO Optimizer is a professional-grade, dark-themed diagnostic dashboard built to evaluate how AI agents, large language models (LLMs), and traditional web crawlers interpret digital content. It shifts the focus from traditional SEO to **Generative Engine Optimization (GEO)** by simulating machine interpretation across multiple vectors.

## Key Features

-  **Machine Understanding:** Real-time progressive timeline analyzing identity, document structure, primary content intent, extracted knowledge entities, and accessibility blockages.
-  **Crawler Access:** In-depth diagnostics for `robots.txt` compliance, sitemap parsing, indexability, and server response readiness.
- **External Intelligence:** An aggregated view of an entity's digital footprint across the web, including real-time sentiment analysis, Reddit discussions, and recent news mentions.
-  **Premium UI/UX:** Built with a sophisticated, highly-polished dark mode interface utilizing modern CSS techniques, glassmorphism, and responsive CSS Grid architecture.

## Tech Stack

- **Frontend:** React, Vite, React Router
- **Backend:** Node.js, Express (API layer for simulations and crawling)
- **Styling:** Custom Vanilla CSS with a bespoke design system

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/HSDLabs/secondSight-geo-optimizer.git
   cd secondSight-geo-optimizer
   ```

2. Install dependencies for both the client and the server (if applicable):
   ```bash
   npm install
   ```

### Running Locally

You'll need to run both the frontend and the backend services.

1. **Start the backend server:**
   ```bash
   npm run server
   ```

2. **Start the Vite development server:**
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`.

## Architecture & Workflows

SecondSight is designed around an extensible modular architecture:
- **Services (`/server/services/`)**: Independent modules for crawling, external web intelligence, and AI processing.
- **Layers (`/server/services/layers/`)**: Granular heuristic extractors (accessibility, links, content structure).
- **UI Architecture (`/src/`)**: Compartmentalized React components broken down by analysis pillar.

## Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request