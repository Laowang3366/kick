!macro customCheckAppRunning
  DetailPrint "Closing running Quick Translate before install."
  nsExec::Exec `"$CmdPath" /C taskkill /IM "${APP_EXECUTABLE_FILENAME}" /T`
  Pop $0
  Sleep 1200

  nsExec::Exec `"$CmdPath" /C taskkill /F /IM "${APP_EXECUTABLE_FILENAME}" /T`
  Pop $0
  Sleep 800
!macroend
