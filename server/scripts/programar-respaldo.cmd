@echo off
rem Programa el respaldo diario con el Programador de tareas de Windows.
rem Uso: programar-respaldo.cmd [HH:MM]   (por defecto 03:00)
rem Quitar la tarea: schtasks /Delete /TN "Llegate respaldo" /F
setlocal
set "HORA=%~1"
if "%HORA%"=="" set "HORA=03:00"

schtasks /Create /SC DAILY /ST %HORA% /TN "Llegate respaldo" /TR "\"%~dp0respaldo-diario.cmd\"" /F
if errorlevel 1 (
  echo No se pudo programar la tarea.
  exit /b 1
)

echo.
echo Tarea "Llegate respaldo" programada todos los dias a las %HORA%.
echo Revisar:  schtasks /Query /TN "Llegate respaldo"
echo Resultado: server\backups\respaldo.log
