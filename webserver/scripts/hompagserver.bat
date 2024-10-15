cd %~dp0\..
set LOGFOLDER=%TEMP%\hompage\logs
mkdir %LOGFOLDER%

:: Get the date and time in a suitable format
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set datetime=%%a
set datetime=%datetime:~0,8%_%datetime:~8,6%

set LOGFILE=%LOGFOLDER%\hompag_%datetime%.txt

npm run startdev -- storepath=%1 >> %LOGFILE% 2>&1 &