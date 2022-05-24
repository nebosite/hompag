Set WshShell = CreateObject("WScript.Shell" ) 
WshShell.Run chr(34) & "hompagserver.bat" & Chr(34) & " " & Chr(34) & WScript.Arguments.Item(0) & Chr(34) , 0 
Set WshShell = Nothing 