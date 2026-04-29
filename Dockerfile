FROM node:20-slim

# build tools required for better-sqlite3 native addon
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make gcc g++ && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# copy full monorepo (workspaces need the root package.json + all packages)
COPY . .

RUN npm install
RUN npm run seed
RUN npm run build

ENV PORT=8080
EXPOSE 8080

CMD ["node", "apps/demo/dist/server/entry.mjs"]
