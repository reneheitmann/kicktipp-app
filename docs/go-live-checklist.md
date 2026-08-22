# Go-Live-Checkliste

Offene, bewusst nicht automatisierbare Schritte auf dem Weg zu "vollständig
internetfähig, sicher, stabil, userfreundlich". Jeder Punkt ist eine manuelle
Aktion – kein Code, der das für dich erledigt.

- [ ] Echte Betreiberdaten unter `/admin/legal` eintragen (Name, Anschrift, Kontakt, Hosting-Standorte)
- [x] Reverse Proxy + TLS gemäß `docs/unraid-deployment.md`, Teil 6, einrichten
- [x] Supabase Redirect-URLs + `ALLOWED_ORIGINS` auf die neue Domain umstellen
- [ ] UptimeRobot/healthchecks.io-Monitor gemäß Teil 5 einrichten, nach Punkt 3 auf HTTPS umstellen
- [ ] Einen echten Restore-Drill gegen das "Kicktipp Dev"-Projekt durchspielen (Anleitung: Teil 4, Abschnitt "Zurückspielen")
- [ ] Im GitHub-Actions-Tab die Läufe von `npm audit` und dem Trivy-Scan (`docker-publish.yml`) auf tatsächliche Findings sichten
- [ ] Eine Rotationsfrequenz für Secrets festlegen (`SUPABASE_SERVICE_ROLE_KEY`, SMTP-Zugangsdaten, `BACKUP_ENCRYPTION_PASSPHRASE`) – z. B. jährlich, oder anlassbezogen bei Verdacht auf Kompromittierung
