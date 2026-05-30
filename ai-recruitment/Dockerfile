# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ARG CLERK_SECRET_KEY=sk_build_placeholder
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_build_placeholder
ENV DATABASE_URL=$DATABASE_URL
ENV CLERK_SECRET_KEY=$CLERK_SECRET_KEY
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
RUN npx prisma generate && npm run build:ci

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY public ./public
COPY scripts ./scripts
COPY src ./src
COPY next.config.ts tsconfig.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

RUN npm ci --omit=dev && npm install tsx@4.20.6 --no-save

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["sh", "scripts/deploy.sh"]
