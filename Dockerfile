# ─────────────────────────────────────────────
# Stage 1: Build the Angular application
# ─────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests first (layer-cache friendly)
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci --legacy-peer-deps

# Copy the rest of the source
COPY . .

# Build in production mode
# @angular/build:application outputs to dist/MarbaeDemo/browser
RUN npx ng build --configuration production

# ─────────────────────────────────────────────
# Stage 2: Serve with Nginx
# ─────────────────────────────────────────────
FROM nginx:1.27-alpine

# Remove the default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built Angular app from the builder stage
COPY --from=builder /app/dist/MarbaeDemo/browser /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Nginx runs in the foreground
CMD ["nginx", "-g", "daemon off;"]
