# Optional: a deterministic alternative to Railway's Nixpacks builder.
FROM node:20-slim AS base
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json* ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm install

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# The volume is mounted at /data; DATABASE_URL should point there.
CMD ["npm", "run", "start"]
