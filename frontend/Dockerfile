FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline --no-audit --no-fund --legacy-peer-deps

# Copy sources and build
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

# Small static server with SPA fallback support
RUN npm install -g serve

# Copy built assets
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["sh", "-c", "serve -s dist -l 3000"]
