cd %~dp0\..
set LOGFOLDER=%1/logs
mkdir %LOGFOLDER%
npm run startdev -- storepath=%1 >> %LOGFOLDER%/hompag.log 2>&1 &