$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$project = Join-Path $root 'src\CompanyBridge\CompanyBridge.csproj'
$payload = Join-Path $PSScriptRoot 'payload'

if (Test-Path $payload) { Remove-Item $payload -Recurse -Force }
New-Item -ItemType Directory -Force -Path $payload | Out-Null

dotnet publish $project -c Release -r win-x64 --self-contained false -o $payload
Write-Host "Company Bridge release payload created at $payload" -ForegroundColor Green
Write-Host 'The payload should be signed and packaged for customer distribution before installation.'
