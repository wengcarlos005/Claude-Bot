# ============================================================
# launch_tradingview.ps1
# Lança o TradingView Desktop com CDP ativo na porta 9222
# Necessário para conectar o Claude ao TradingView via MCP
# ============================================================
# Como usar:
#   1. Feche o TradingView se estiver aberto
#   2. Clique com botão direito neste arquivo > "Executar com PowerShell"
#      OU abra o PowerShell e rode: .\launch_tradingview.ps1
# ============================================================

Write-Host "Procurando TradingView Desktop..." -ForegroundColor Cyan

# Localiza o pacote do TradingView (instalado via Microsoft Store)
$pkg = Get-AppxPackage -Name "TradingView*" -ErrorAction SilentlyContinue

if (-not $pkg) {
    Write-Host ""
    Write-Host "TradingView Desktop nao encontrado." -ForegroundColor Red
    Write-Host "Baixe em: https://www.tradingview.com/desktop/" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit
}

Write-Host "Encontrado: $($pkg.Name)" -ForegroundColor Green

# Monta o caminho para o executavel
$installDir = $pkg.InstallLocation
$exePath = Get-ChildItem -Path $installDir -Filter "TradingView.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName

if (-not $exePath) {
    # Tenta localizar via LocalCache
    $localCache = "$env:LOCALAPPDATA\Packages\$($pkg.PackageFamilyName)\LocalCache\Local\TradingView"
    $exePath = Get-ChildItem -Path $localCache -Filter "TradingView.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
}

if (-not $exePath) {
    Write-Host ""
    Write-Host "Executavel TradingView.exe nao encontrado." -ForegroundColor Red
    Write-Host "Caminho esperado: $installDir" -ForegroundColor Yellow
    Write-Host "Tente localizar manualmente e editar este script." -ForegroundColor Yellow
    pause
    exit
}

Write-Host "Executavel: $exePath" -ForegroundColor Gray
Write-Host ""

# Verifica se a porta 9222 ja esta em uso
$portInUse = netstat -ano 2>$null | Select-String ":9222"
if ($portInUse) {
    Write-Host "Atencao: Porta 9222 ja esta em uso." -ForegroundColor Yellow
    Write-Host "O TradingView pode ja estar rodando com CDP ativo." -ForegroundColor Yellow
    Write-Host ""
}

# Lanca o TradingView com CDP habilitado
Write-Host "Lancando TradingView com --remote-debugging-port=9222..." -ForegroundColor Cyan
Start-Process -FilePath $exePath -ArgumentList "--remote-debugging-port=9222"

Write-Host ""
Write-Host "TradingView iniciado!" -ForegroundColor Green
Write-Host "Aguarde o app carregar completamente antes de verificar a conexao." -ForegroundColor Gray
Write-Host ""
Write-Host "Para verificar a conexao, rode no Claude Code:" -ForegroundColor Cyan
Write-Host "  tv_health_check" -ForegroundColor White
Write-Host ""
Write-Host "Deve retornar: cdp_connected: true" -ForegroundColor Green
