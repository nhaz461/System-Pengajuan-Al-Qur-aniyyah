Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' 1. Matikan proses lama pada port 5000 jika ada
WshShell.Run "powershell -WindowStyle Hidden -Command ""Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }""", 0, True

' 2. Jalankan server Node di background secara senyap (tanpa jendela CMD)
nodeExe = scriptDir & "\bin\node.exe"
If Not fso.FileExists(nodeExe) Then
    nodeExe = "node"
End If

serverScript = scriptDir & "\backend\dist\index.js"
WshShell.CurrentDirectory = scriptDir
WshShell.Run """" & nodeExe & """ """ & serverScript & """", 0, False

' 3. Tunggu sejenak lalu buka browser otomatis ke aplikasi
WScript.Sleep 3500
WshShell.Run "http://localhost:5000", 1, False
