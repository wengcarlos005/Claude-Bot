# Agenda o Claude Trading Bot para rodar a cada 1 minuto

$taskName = "ClaudeTradingBot"
$botDir   = "$env:USERPROFILE\Desktop\claude-tradingview-mcp-trading"
$logFile  = "$botDir\bot.log"

$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodePath) {
    Write-Host "Node.js nao encontrado. Instale em: https://nodejs.org" -ForegroundColor Red
    pause; exit
}

Write-Host "Node.js: $nodePath" -ForegroundColor Green
Write-Host "Bot dir: $botDir" -ForegroundColor Gray

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

$cmdArg = '/c "cd /d "' + $botDir + '" && node bot.js >> "' + $logFile + '" 2>&1"'

$action   = New-ScheduledTaskAction -Execute "cmd.exe" -Argument $cmdArg
$trigger  = New-ScheduledTaskTrigger -Once -At (Get-Date).AddSeconds(5) -RepetitionInterval (New-TimeSpan -Minutes 1) -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew -StartWhenAvailable -DontStopIfGoingOnBatteries -RunOnlyIfNetworkAvailable

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Force | Out-Null

Write-Host ""
Write-Host "Agendador configurado! Bot rodando a cada 1 minuto." -ForegroundColor Green
Write-Host ""
Write-Host "Ver log ao vivo:" -ForegroundColor Yellow
Write-Host "  Get-Content '$logFile' -Wait -Tail 50" -ForegroundColor White
Write-Host ""
Write-Host "Parar o bot:" -ForegroundColor Yellow
Write-Host "  Unregister-ScheduledTask -TaskName ClaudeTradingBot -Confirm:`$false" -ForegroundColor White
Write-Host ""
pause
