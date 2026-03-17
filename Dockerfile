# Build stage
FROM node:20-slim AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* ./

ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

# Install Chrome using the project's exact puppeteer version
RUN pnpm exec puppeteer browsers install chrome

# Production stage
FROM node:20-slim

WORKDIR /app

# Install Chrome system dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxkbcommon0 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Copy standalone server (includes necessary node_modules)
COPY --from=builder /app/.next/standalone ./
# Copy Chrome from builder (version-matched with project's puppeteer)
COPY --from=builder /root/.cache/puppeteer /root/.cache/puppeteer
# Copy static assets
COPY --from=builder /app/.next/static ./.next/static
# Copy public assets
COPY --from=builder /app/public ./public

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production

CMD ["node", "server.js"]
