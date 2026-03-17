# Build stage
FROM node:20-slim AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* ./

ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

# Production stage
FROM node:20-slim

WORKDIR /app

# Install Chrome and system dependencies via Puppeteer
RUN npx puppeteer browsers install chrome --install-deps && \
    rm -rf /var/lib/apt/lists/*

# Copy standalone server (includes necessary node_modules)
COPY --from=builder /app/.next/standalone ./
# Copy static assets
COPY --from=builder /app/.next/static ./.next/static
# Copy public assets
COPY --from=builder /app/public ./public

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production

CMD ["node", "server.js"]
