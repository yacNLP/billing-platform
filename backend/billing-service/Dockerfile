# ---------- stage 1 : build ----------
FROM node:20-alpine AS builder

# set working directory
WORKDIR /app

# install all dependencies (including dev)
COPY package*.json ./
RUN npm ci

# copy source code
COPY . .

# build nestjs application (typescript -> javascript)
RUN npm run build

# ---------- stage 2 : production ----------
FROM node:20-alpine

# set working directory
WORKDIR /app

# set production environment
ENV NODE_ENV=production

# install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# copy prisma files (schema + client needs)
COPY prisma ./prisma

# generate prisma client
RUN npx prisma generate

# copy compiled output from builder stage
COPY --from=builder /app/dist ./dist

# expose application port
EXPOSE 3000

# start application
CMD ["node", "dist/src/main.js"]
