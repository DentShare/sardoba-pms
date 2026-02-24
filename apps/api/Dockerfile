FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci --workspace=@sardoba/api --workspace=@sardoba/shared --include-workspace-root

# Build shared package
FROM deps AS build-shared
COPY packages/shared ./packages/shared
COPY tsconfig.json ./
RUN npm run build --workspace=@sardoba/shared

# Build API
FROM build-shared AS build
COPY apps/api ./apps/api
RUN npm run build --workspace=@sardoba/api

# Production image
FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
