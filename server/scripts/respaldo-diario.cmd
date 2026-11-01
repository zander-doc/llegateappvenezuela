@echo off
rem Respaldo diario de la base. Lo programa programar-respaldo.cmd.
rem Deja el resultado en backups\respaldo.log.
cd /d "%~dp0.."
if not exist backups mkdir backups
node scripts\backup.mjs >> backups\respaldo.log 2>&1
