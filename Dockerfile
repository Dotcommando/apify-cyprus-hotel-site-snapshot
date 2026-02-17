FROM mcr.microsoft.com/playwright:v1.58.2-jammy AS build

WORKDIR /usr/src/app

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV NODE_ENV=development

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build


FROM mcr.microsoft.com/playwright:v1.58.2-jammy AS runtime

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /usr/src/app/dist ./dist

# Crawlee/Apify local storage is ./storage by default -> must be writable by pwuser
RUN mkdir -p /usr/src/app/storage \
  && chown -R pwuser:pwuser /usr/src/app

USER pwuser

CMD ["npm", "start"]
