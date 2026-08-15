FROM node:22-alpine AS base

WORKDIR /app

RUN apk add --no-cache libc6-compat \
  && corepack enable \
  && corepack prepare pnpm@10.32.1 --activate

FROM base AS dependencies

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS build

# NEXT_PUBLIC_* is inlined into the client bundle at build time, so these must
# arrive as build args — setting them at `docker run` has no effect.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_STOREFRONT_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_STOREFRONT_URL=$NEXT_PUBLIC_STOREFRONT_URL
ENV NEXT_TELEMETRY_DISABLED=1

COPY . .

RUN pnpm build

FROM base AS production

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static

RUN mkdir -p .next/cache && chown -R node:node .next

USER node

EXPOSE 3000

CMD ["node", "server.js"]
