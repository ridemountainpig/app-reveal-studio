# App Reveal Studio

Interactive app reveal animation playground built with Next.js, React, TypeScript, Tailwind CSS, and Framer Motion. Video generation runs on the server via headless Chromium to guarantee consistent rendering across all browsers.

## Features

- Live preview for app reveal animation
- Collapsible floating controls panel
- Editable title, subtitle, badge text, and icon URLs
- Local icon upload (takes priority over icon URL)
- Adjustable duration, playback speed, and icon corner radius
- Color controls for glow, rim, and gray sweep
- Server-side video export using headless Chromium (no Safari compatibility issues)

## Development

Install dependencies:

```bash
pnpm install
```

Start local dev server:

```bash
pnpm dev
```

Build for production:

```bash
pnpm build
```

Run lint:

```bash
pnpm lint
```

## Deployment to Zeabur

This project includes a Dockerfile optimized for Zeabur deployment with headless Chromium support.

### Prerequisites

1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. Have a Zeabur account

### Deploy Steps

1. **Connect Repository**: In Zeabur dashboard, create a new project and connect your Git repository
2. **Automatic Detection**: Zeabur will automatically detect the Dockerfile
3. **Environment Variables**: No special environment variables needed for basic deployment
4. **Deploy**: Click deploy and Zeabur will build and deploy your application

### Important Notes

- The Dockerfile installs all necessary system dependencies for Chromium (including `libnspr4.so`)
- Video export uses `@sparticuz/chromium` for serverless environments
- Memory: Recommend at least 1GB RAM for video generation
- Timeout: Video generation can take 30-120 seconds depending on duration

### Troubleshooting

If you encounter Chromium-related errors:
1. Ensure the Dockerfile is being used (check build logs)
2. Verify memory allocation is sufficient
3. Check that `@sparticuz/chromium` version is compatible

### Local Docker Testing

Test the Docker build locally before deploying:

```bash
docker build -t app-reveal-studio .
docker run -p 3000:3000 app-reveal-studio
```

