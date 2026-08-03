FROM node:22-slim AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps

FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV AUTH_SECRET="build-time-placeholder-auth-secret-000000"
ENV APP_ENCRYPTION_KEY="build-time-placeholder-encryption-key-000"
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
RUN node -e "const { execSync } = require('child_process'); const fs = require('fs'); const commit = (() => { try { return execSync('git rev-parse --short HEAD', { encoding: 'utf8', timeout: 3000 }).trim().slice(0, 7); } catch { return 'unknown'; } })(); fs.writeFileSync('.next/build-info.json', JSON.stringify({ version: '1.1.2', commit, buildTime: new Date().toISOString() }));"

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/public ./public
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/.next/build-info.json ./.next/build-info.json
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/lib ./lib
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
RUN npm prune --production --legacy-peer-deps
RUN mkdir -p /app/.storage/evidence /app/data/uploads && chown -R node:node /app/.storage /app/data
EXPOSE 3000
USER node
# Use npx prisma for migrations since the prisma CLI is in node_modules
CMD ["sh", "-c", "npx prisma migrate deploy && ( [ \"$SKIP_SEED\" = true ] && echo 'Seed skipped (SKIP_SEED=true).' || ( [ -f /app/.storage/.seeded ] && echo 'Seed already applied.' || ( npx prisma db seed && touch /app/.storage/.seeded || echo 'Seed failed — continuing anyway' ) ) ) && echo 'Starting server...' && node server.js"]
