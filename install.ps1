# hompag installer for Windows
#
# Quick install (latest release, guided):
#   irm https://raw.githubusercontent.com/nebosite/hompag/master/install.ps1 | iex
#
# With options (see "hompag help" for all of them):
#   & ([scriptblock]::Create((irm https://raw.githubusercontent.com/nebosite/hompag/master/install.ps1))) --mode dev
#
# From a local checkout (no download):
#   .\install.ps1 --from-source .
#
# This script only finds Node.js and fetches the launcher (hompag.mjs); the
# launcher does the real work and is the same on every OS.

function Install-Hompag {
    param([string[]]$InstallArgs)

    $ErrorActionPreference = 'Stop'
    $repo = 'nebosite/hompag'
    $minNode = 20

    # --- Node.js -----------------------------------------------------------------
    $node = Get-Command node -ErrorAction SilentlyContinue
    $nodeMajor = 0
    if ($node) { $nodeMajor = [int](& node -p "process.versions.node.split('.')[0]") }
    if ($nodeMajor -lt $minNode) {
        if ($node) { Write-Host "hompag needs Node.js $minNode or newer; you have $(& node -v)." }
        else { Write-Host "hompag needs Node.js $minNode or newer, and it isn't installed." }
        if (Get-Command winget -ErrorAction SilentlyContinue) {
            $answer = Read-Host 'Install Node.js LTS now with winget? [Y/n]'
            if ($answer -eq '' -or $answer -match '^[Yy]') {
                winget install --id OpenJS.NodeJS.LTS --exact --accept-source-agreements --accept-package-agreements
                Write-Host ''
                Write-Host 'Node.js is installed. Open a NEW PowerShell window and run the installer again.'
                return
            }
        }
        Write-Host 'Install Node.js from https://nodejs.org, then run this installer again.'
        return
    }

    # --- The launcher ------------------------------------------------------------
    $launcher = $null
    $fromSource = [array]::IndexOf($InstallArgs, '--from-source')
    if ($fromSource -ge 0 -and $fromSource + 1 -lt $InstallArgs.Count) {
        $launcher = Join-Path (Resolve-Path $InstallArgs[$fromSource + 1]) 'release\hompag.mjs'
        if (-not (Test-Path $launcher)) {
            Write-Host "No packaged release in $($InstallArgs[$fromSource + 1]). Build one first:"
            Write-Host '  node build-all.js; node scripts/package-release.mjs'
            return
        }
    }
    else {
        $temp = Join-Path ([IO.Path]::GetTempPath()) ("hompag-install-" + [guid]::NewGuid())
        New-Item -ItemType Directory -Path $temp | Out-Null
        $launcher = Join-Path $temp 'hompag.mjs'
        $base = "https://github.com/$repo/releases/latest/download"
        try {
            Write-Host 'Downloading the hompag launcher...'
            Invoke-WebRequest -UseBasicParsing "$base/hompag.mjs" -OutFile $launcher
            $sums = (Invoke-WebRequest -UseBasicParsing "$base/SHA256SUMS").Content
            if ($sums -is [byte[]]) { $sums = [Text.Encoding]::UTF8.GetString($sums) }
        }
        catch {
            Write-Host "Could not download the launcher from $base ($($_.Exception.Message))."
            Write-Host 'If no release has been published yet, install from source instead:'
            Write-Host "  git clone https://github.com/$repo.git; cd hompag"
            Write-Host '  node build-all.js; node launcher/dist/hompag.mjs install --mode dev --repo-dir .'
            return
        }
        $expected = ($sums -split "`n" | Where-Object { $_ -match '\s\*?hompag\.mjs\s*$' } | ForEach-Object { ($_ -split '\s+')[0] })
        $actual = (Get-FileHash -Algorithm SHA256 $launcher).Hash.ToLower()
        if (-not $expected -or $actual -ne $expected.ToLower()) {
            Write-Host 'The downloaded launcher failed its checksum check. Please try again.'
            return
        }
    }

    # --- Hand off ----------------------------------------------------------------
    & node $launcher install @InstallArgs
    if ($LASTEXITCODE -ne 0) { Write-Host "The installer exited with code $LASTEXITCODE." }
}

Install-Hompag -InstallArgs $args
