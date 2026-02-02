# Frontend Dockerfile - Production build
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build args for backend URLs (set at build time)
ARG REACT_APP_FLEX_URL
ARG REACT_APP_MEDIAPIPE_URL

ENV REACT_APP_FLEX_URL=$REACT_APP_FLEX_URL
ENV REACT_APP_MEDIAPIPE_URL=$REACT_APP_MEDIAPIPE_URL

RUN npm run build

# Production stage - lightweight nginx
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
