FROM node:20-alpine AS builder
WORKDIR /app
COPY backend/package.json ./backend/
COPY backend/prisma ./backend/prisma/
RUN cd backend && npm install
COPY backend ./backend/
RUN cd backend && npx prisma generate && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./
COPY --from=builder /app/backend/prisma ./prisma
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
