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

EXPOSE 80
