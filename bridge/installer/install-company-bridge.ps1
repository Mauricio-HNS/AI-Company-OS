#Requires -RunAsAdministrator
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$project = Join-Path $root 'src\CompanyBridge\CompanyBridge.csproj'
$install = 'C:\Program Files\AI Company OS\Company Bridge'
$data = 'C:\ProgramData\AI Company OS\Company Bridge'
$service = 'AI Company OS Company Bridge Service'

Write-Host 'AI Company OS — Company Bridge installer' -ForegroundColor Cyan

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    throw '.NET 8 SDK/runtime is required. Install it before running this installer.'
}

New-Item -ItemType Directory -Force -Path $install | Out-Null
New-Item -ItemType Directory -Force -Path $data | Out-Null

dotnet publish $project -c Release -r win-x64 --self-contained false -o $install

$config = Join-Path $install 'appsettings.json'
if (-not (Test-Path $config)) {
    throw "Published configuration not found: $config"
}

if (Get-Service -Name $service -ErrorAction SilentlyContinue) {
    Stop-Service -Name $service -Force -ErrorAction SilentlyContinue
    sc.exe delete $service | Out-Null
    Start-Sleep -Seconds 2
}

sc.exe create $service binPath= "\"$install\CompanyBridge.exe\"" start= auto DisplayName= $service | Out-Null
sc.exe failure $service reset= 86400 actions= restart/5000/restart/15000/restart/30000 | Out-Null

$desktop = [Environment]::GetFolderPath('CommonDesktopDirectory')
$shortcutPath = Join-Path $desktop 'AI Company OS.lnk'
$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = 'http://127.0.0.1:48731/api/v1/status'
$shortcut.WorkingDirectory = $install
$shortcut.Description = 'AI Company OS — Company Bridge'
$shortcut.Save()

Start-Service -Name $service

Write-Host ''
Write-Host 'Company Bridge installed.' -ForegroundColor Green
Write-Host "Service: $service"
Write-Host "Install: $install"
Write-Host "Data:    $data"
Write-Host 'Local API: http://127.0.0.1:48731'
Write-Host 'The desktop shortcut is only a management shortcut; the Windows Service runs independently.'
