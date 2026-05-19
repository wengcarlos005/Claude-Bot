Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c cd /d ""C:\Users\wengc\Desktop\claude-tradingview-mcp-trading"" && ""C:\Program Files\nodejs\node.exe"" bot.js >> bot.log 2>&1", 0, False
Set WshShell = Nothing
