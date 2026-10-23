<#
.SYNOPSIS
    Local smoke test for the FastDataUpload backend.

.DESCRIPTION
    Starts the compiled backend, exercises the token and upload endpoints,
    verifies the stored file and the token invalidation, then shuts down.

.NOTES
    Run the backend build first:  cd backend; npm run build
#>

$ErrorActionPreference = 'Stop'
$backendDir = Join-Path $PSScriptRoot '..\backend'
$backendDir = (Resolve-Path $backendDir).Path
$baseUrl = 'http://localhost:3001/api'

Push-Location $backendDir
$proc = Start-Process -FilePath 'node' -ArgumentList 'dist/server.js' -PassThru -NoNewWindow `
    -RedirectStandardOutput 'smoke.out.log' -RedirectStandardError 'smoke.err.log'
try {
    Start-Sleep -Seconds 3

    Write-Host '== health =='
    Invoke-RestMethod -Uri "$baseUrl/health" | ConvertTo-Json -Compress

    Write-Host '== generate token =='
    $token = Invoke-RestMethod -Method Post -Uri "$baseUrl/token"
    Write-Host "token=$($token.token)"
    Write-Host "uploadPath=$($token.uploadPath)"
    Write-Host "expiresInSeconds=$($token.expiresInSeconds)"

    Write-Host '== validate token =='
    $validation = Invoke-RestMethod -Uri "$baseUrl/token/$($token.token)/validate"
    Write-Host ($validation | ConvertTo-Json -Compress)

    Write-Host '== upload file =='
    $tmp = Join-Path $backendDir 'smoke-upload.txt'
    Set-Content -Path $tmp -Value 'hello fastdataupload'
    # curl.exe is used because Windows PowerShell 5.1 has no multipart support.
    $uploadJson = & curl.exe -s -X POST "$baseUrl/upload/$($token.token)" -F "files=@$tmp"
    Write-Host $uploadJson

    Write-Host '== stored files =='
    Get-ChildItem (Join-Path $backendDir 'uploads') -File | ForEach-Object { Write-Host $_.Name }

    Write-Host '== reject invalid token =='
    $invalidStatus = & curl.exe -s -o NUL -w '%{http_code}' -X POST "$baseUrl/upload/not-a-real-token" -F "files=@$tmp"
    Write-Host "invalid token rejected with status $invalidStatus"

    Write-Host '== invalidate token =='
    Invoke-RestMethod -Method Delete -Uri "$baseUrl/token/$($token.token)" | ConvertTo-Json -Compress
    try {
        Invoke-RestMethod -Uri "$baseUrl/token/$($token.token)/validate" | Out-Null
        Write-Host 'UNEXPECTED: invalidated token still valid'
    } catch {
        Write-Host "invalidated token rejected with status $($_.Exception.Response.StatusCode.value__)"
    }

    Remove-Item $tmp -ErrorAction SilentlyContinue
    Write-Host '== smoke test finished =='
}
finally {
    if ($proc -and -not $proc.HasExited) {
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host '--- backend stderr ---'
    Get-Content 'smoke.err.log' -ErrorAction SilentlyContinue
    Pop-Location
}
