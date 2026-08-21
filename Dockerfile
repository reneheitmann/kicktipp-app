# Liefert die statischen Vite/React-Produktions-Builds über nginx aus. Das
# Supabase-Backend läuft weiterhin in der Cloud – dieser Container enthält
# ausschließlich das Frontend, keine Server-Logik.
#
# Anders als früher baut dieses Image nicht mehr selbst per npm/Vite: der
# GitHub-Actions-Workflow (docker-publish.yml) checkt main UND beta separat
# aus, baut beide Branches getrennt (unterschiedliche VITE_APP_CHANNEL/
# base-Pfade, siehe vite.config.ts) und liefert die fertigen dist-Ordner als
# dist-prod/dist-beta in den Build-Kontext – ein Container liefert dadurch
# beide Versionen gleichzeitig aus (Prod unter /, Beta unter /beta/, siehe
# nginx.conf.template), statt zwei komplett getrennte Container/Images zu
# brauchen.

FROM nginx:alpine AS runtime

# Zeitzone für Container-interne Zeitstempel (z. B. nginx-Access-Logs,
# `docker logs`) – hat KEINEN Einfluss auf Datums-/Zeitangaben innerhalb der
# App selbst, die werden clientseitig im Browser mit dessen Zeitzone
# formatiert. tzdata bringt die Zonendaten mit, die musl-libc (Alpine) braucht,
# um den TZ-Wert überhaupt aufzulösen. Default hier, überschreibbar per
# Umgebungsvariable (z. B. über ein Unraid-GUI-Feld), ohne neuen Build.
RUN apk add --no-cache tzdata
ENV TZ=Europe/Berlin

COPY dist-prod /usr/share/nginx/html
COPY dist-beta /usr/share/nginx/html/beta

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

# Non-root (USER nginx) wurde zweimal versucht und hat beide Male den
# Container-Start auf dem Ziel-Unraid-Host verhindert (bestätigt, nicht nur
# vermutet – zweiter Vorfall nach demselben Muster) – trotz der offiziellen
# Doku, dass nginx:alpine das seit 1.19 ohne weitere Anpassungen unterstützen
# soll. Root Cause noch nicht durch echte Logs bestätigt (kein direkter
# Zugriff auf den Host). Bewusst NICHT erneut versuchen, ohne vorher
# `docker logs kicktipp-app` vom fehlgeschlagenen Start einzusehen.
