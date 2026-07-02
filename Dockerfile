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

RUN npm run build

FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Von Unraids Docker-Manager gelesene Labels für Icon/WebUI-Link – nur PNG
# wird von Unraid für das Icon-Label zuverlässig gerendert (SVG/WEBP nicht,
# empirisch verifiziert). Greift zuverlässig bei Template-basiert erstellten
# Containern (z. B. über "Add Container" in der WebUI); bei rein per
# `docker run` erstellten Containern ggf. nicht, dann Icon-URL manuell im
# Template-Feld setzen (siehe docs/unraid-deployment.md).
LABEL net.unraid.docker.icon="https://raw.githubusercontent.com/reneheitmann/kicktipp-app/main/public/icon.png"
LABEL net.unraid.docker.webui="http://[IP]/"

EXPOSE 80
