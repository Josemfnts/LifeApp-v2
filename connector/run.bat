@echo off
REM Lanzador del conector para el Programador de tareas de Windows (mini PC).
REM Hace una pasada y sale; el Programador lo repite cada POLL (ver README).
REM Usa el venv si existe; si no, el lanzador `py` del sistema.
cd /d "%~dp0"
if exist ".venv\Scripts\python.exe" (
  ".venv\Scripts\python.exe" sync.py --once >> sync.log 2>&1
) else (
  py -3 sync.py --once >> sync.log 2>&1
)
exit /b %ERRORLEVEL%
