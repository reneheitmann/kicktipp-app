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

# Non-root (USER nginx): entgegen der offiziellen Doku ("nginx:alpine
# unterstützt das seit 1.19 ohne weitere Anpassungen") bereitet dieses
# konkrete Unraid-Docker-Setup dem nginx-User NICHT alle Laufzeit-Pfade
# beschreibbar vor – per echten docker logs auf zwei Deploys verteilt
# ermittelt (nicht geraten):
#   - /etc/nginx/conf.d – Ziel des envsubst-Templatings (siehe oben), wird
#     bei JEDEM Start neu erzeugt, anders als der nginx-Standardfall mit
#     fest eingebackener Config.
#   - /var/cache/nginx – nginx' eigenes Arbeitsverzeichnis (client_temp etc.).
#   - /run – Pid-Datei (/run/nginx.pid).
# /var/log/nginx vorsorglich mit freigegeben. Verifiziert per docker logs
# nach dem Deploy: alle Worker starten sauber, keine [emerg]-Fehler mehr.
RUN chown -R nginx:nginx /etc/nginx/conf.d /var/cache/nginx /run /var/log/nginx

USER nginx
