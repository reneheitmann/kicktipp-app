# Baut die statische Vite/React-Produktions-Version und liefert sie über
# nginx aus. Das Supabase-Backend läuft weiterhin in der Cloud – dieser
# Container enthält ausschließlich das Frontend, keine Server-Logik.
#
# VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY werden von Vite zur Build-Zeit fest
# ins JS-Bundle eingebaut (kein Laufzeit-Env möglich) – daher als Build-Args,
# nicht als normale Container-Umgebungsvariablen.

FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Nur für die "Über"-Seite (Commit/Build-Datum) – .git ist per .dockerignore
# nicht im Build-Kontext, daher von GitHub Actions als Build-Arg hereingereicht
# statt hier per `git rev-parse` ermittelt (siehe docker-publish.yml).
ARG VITE_APP_COMMIT_SHA
ARG VITE_APP_BUILD_DATE
ENV VITE_APP_COMMIT_SHA=$VITE_APP_COMMIT_SHA
ENV VITE_APP_BUILD_DATE=$VITE_APP_BUILD_DATE

# "production" oder "beta" – von GitHub Actions je nach Branch gesetzt (siehe
# docker-publish.yml), zeigt eine BETA-Kennzeichnung in der App an.
ARG VITE_APP_CHANNEL=production
ENV VITE_APP_CHANNEL=$VITE_APP_CHANNEL

RUN npm run build

FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html

# .template statt direkt nach conf.d – das offizielle nginx-Image ersetzt
# ${LISTEN_PORT} beim Container-Start automatisch per envsubst (siehe
# nginx.conf.template). Default hier, überschreibbar per Umgebungsvariable
# (z. B. über ein Unraid-GUI-Feld), ohne neuen Build.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
ENV LISTEN_PORT=8080

# Von Unraids Docker-Manager gelesene Labels für Icon/WebUI-Link – nur PNG
# wird von Unraid für das Icon-Label zuverlässig gerendert (SVG/WEBP nicht,
# empirisch verifiziert). Greift zuverlässig bei Template-basiert erstellten
# Containern (z. B. über "Add Container" in der WebUI); bei rein per
# `docker run` erstellten Containern ggf. nicht, dann Icon-URL manuell im
# Template-Feld setzen (siehe docs/unraid-deployment.md). WebUI-Link zeigt
# den Default-Port – bei geändertem LISTEN_PORT im Template-Feld anpassen.
LABEL net.unraid.docker.icon="https://raw.githubusercontent.com/reneheitmann/kicktipp-app/main/public/icon.png"
LABEL net.unraid.docker.webui="http://[IP]:8080/"

EXPOSE 8080
