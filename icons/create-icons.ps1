# TDM Icon Sizes Generator
# สร้างไฟล์ placeholder สำหรับไอคอนขนาดต่างๆ

$iconSizes = @(72, 96, 128, 144, 152, 192, 384, 512)
$iconFolder = "c:\Users\jobao\Desktop\app\icons"

Write-Host "🎨 Creating TDM icon placeholders..." -ForegroundColor Cyan

foreach ($size in $iconSizes) {
    $fileName = "tdm-icon-${size}x${size}.png"
    $filePath = Join-Path $iconFolder $fileName
    
    # สร้างไฟล์ placeholder (ไฟล์ว่าง)
    New-Item -Path $filePath -ItemType File -Force | Out-Null
    Write-Host "📱 Created placeholder: $fileName" -ForegroundColor Green
}

Write-Host "✅ All icon placeholders created!" -ForegroundColor Green
Write-Host "📝 Note: Replace these with actual PNG files generated from TDM logo" -ForegroundColor Yellow
