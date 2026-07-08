FROM node:22-slim AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV AUTH_SECRET="build-time-placeholder-auth-secret-000000"
ENV APP_ENCRYPTION_KEY="build-time-placeholder-encryption-key-000"
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/public ./public
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/prisma ./prisma
RUN mkdir -p /app/.storage/evidence /app/data/uploads && chown -R node:node /app/.storage /app/data
EXPOSE 3000
USER node
# The seed is guarded by a marker file so it runs once per volume lifetime.
# Set SKIP_SEED=true to bypass entirely (e.g. managed database deployments).
CMD ["sh", "-c", "npx prisma migrate deploy && ( [ \"$SKIP_SEED\" = true ] && echo 'Seed skipped (SKIP_SEED=true).' || ( [ -f /app/.storage/.seeded ] && echo 'Seed already applied.' || ( npx prisma db seed && touch /app/.storage/.seeded ) ) ) && node server.js"]
