$ErrorActionPreference = "Stop"
$nombre = "Llegate respaldo"
$tarea = Get-ScheduledTask -TaskName $nombre
$ajustes = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 1)
Set-ScheduledTask -TaskName $nombre -Settings $ajustes | Out-Null
(Get-ScheduledTask -TaskName $nombre).Settings |
  Select-Object StartWhenAvailable, DisallowStartIfOnBatteries, StopIfGoingOnBatteries, ExecutionTimeLimit |
  Format-List
