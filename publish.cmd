@ECHO OFF
SETLOCAL
IF "%PUBLISH_DEBUG%" == "1" ECHO ON

SET ROOT=%~dp0
SET KUSTOROOT=%~dp0..\..\..\
SET TARGET_JS_FOLDER=kustoclientjs
SET OUT=%ROOT%\bridge
SET ZIPFILE=kustointellisensejs.zip

SET ALL=0
IF "%1" == "" SET ALL=1

:: publish npm will build and publish the package to kusto's vsts package stream in mseng.
:: it will only work if it's the 1st parameter provided to the command. rest of parameters will be ignored.
:: it will only work in the following conditions:
:: 1.user has npm installed (which means user has node installed)
:: 2.user is connected to the vsts npm package feed by calling following ocmmands from this folder
:: npm install -g vsts-npm-auth --registry https://registry.npmjs.com --always-auth false
:: vsts-npm-auth -config .npmrc
::
:: versioning is currently done by specifying version in package.config file.
:: fortunately publish will fail if trying to publish a version that already exists.
IF "%1" == "npm" (CALL :Build & CALL :PublishNpm & GOTO :EOF)

:ArgLoop
IF "%1" NEQ "" GOTO :ArgLoop

REM If we get here either %1 was empty to begin with (ALL=1)
REM or we've completed doing all that was asked of us (ALL=0)
IF "%ALL%" == "0" GOTO :EOF

CALL :PublishNpm
%CECHO% "{color-10}Done.\n"
GOTO :EOF

:Build
call yarn
GOTO :EOF

:PublishNpm
%CECHO% "{color-10}Packing output directory as an npm package...\n"
where npm
IF %ERRORLEVEL% EQU 1 GOTO :EOF
PUSHD %ROOT%
CALL npm.cmd publish
POPD
GOTO :EOF

:Error
%CECHO% "{color-12}%error%"
exit /B 1
:EOF
