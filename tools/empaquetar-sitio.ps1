# Empaqueta dist/ en un zip que Netlify entienda.
#
# Compress-Archive de PowerShell escribe las rutas con "\", y el formato ZIP
# exige "/": Netlify lo interpreta como archivos sueltos con nombres raros y el
# sitio queda sin CSS ni JavaScript. Por eso se arman las entradas a mano.
#
# Correr con: npm run empaquetar

Add-Type -AssemblyName System.IO.Compression.FileSystem

$origen = (Resolve-Path 'dist').Path
$destino = Join-Path (Get-Location).Path 'wcs-memorias-sitio.zip'

if (Test-Path $destino) { Remove-Item $destino -Force }

$zip = [System.IO.Compression.ZipFile]::Open($destino, 'Create')
$total = 0

Get-ChildItem -Path $origen -Recurse -File -Force | ForEach-Object {
  $relativa = $_.FullName.Substring($origen.Length + 1).Replace('\', '/')
  [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $relativa)
  $total++
}

$zip.Dispose()

$peso = [math]::Round((Get-Item $destino).Length / 1KB)
Write-Output "$destino listo: $total archivos, $peso KB"
