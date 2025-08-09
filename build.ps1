# Extension build script
$sourceFiles = @(
    "manifest.json",
    "popup.html",
    "popup.js",
    "content.js",
    "yt-transcript-logo.png"
)

$distPath = "dist"

# Clean dist folder (remove contents but keep folder)
if (Test-Path $distPath) {
    Remove-Item -Path "$distPath\*" -Recurse -Force
}

# Create dist folder if it doesn't exist
if (-not (Test-Path $distPath)) {
    New-Item -ItemType Directory -Path $distPath
}

# Copy files to dist
foreach ($file in $sourceFiles) {
    if (Test-Path $file) {
        Copy-Item $file -Destination $distPath
        Write-Host "Copied $file to dist/"
    } else {
        Write-Warning "File $file not found, skipping..."
    }
}

# Create ZIP file from dist folder contents
$zipPath = "yt-transcript.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

# Change to dist directory and create ZIP
Push-Location $distPath
Compress-Archive -Path * -DestinationPath "../$zipPath" -Force
Pop-Location

Write-Host "Build complete! Extension files are in the dist/ folder."
Write-Host "ZIP file created: $zipPath"
