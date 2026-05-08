!macro customCheckAppRunning
  DetailPrint "Closing running Quick Translate before install."
  nsExec::ExecToLog `"$PowerShellPath" -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance -ClassName Win32_Process | ? {$$_.Path -and $$_.Path.StartsWith('$INSTDIR', 'CurrentCultureIgnoreCase')} | % { Stop-Process -Id $$_.ProcessId -Force -ErrorAction SilentlyContinue }"`
  Pop $0
  nsExec::ExecToLog `"$CmdPath" /C taskkill /T /IM "${APP_EXECUTABLE_FILENAME}"`
  Pop $0
  nsExec::ExecToLog `"$CmdPath" /C taskkill /T /IM "快捷翻译.exe"`
  Pop $0
  nsExec::ExecToLog `"$CmdPath" /C taskkill /T /IM "quick-translate.exe"`
  Pop $0
  Sleep 2500

  nsExec::ExecToLog `"$PowerShellPath" -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance -ClassName Win32_Process | ? {$$_.Path -and $$_.Path.StartsWith('$INSTDIR', 'CurrentCultureIgnoreCase')} | % { Stop-Process -Id $$_.ProcessId -Force -ErrorAction SilentlyContinue }"`
  Pop $0
  nsExec::ExecToLog `"$CmdPath" /C taskkill /T /F /IM "${APP_EXECUTABLE_FILENAME}"`
  Pop $0
  nsExec::ExecToLog `"$CmdPath" /C taskkill /T /F /IM "快捷翻译.exe"`
  Pop $0
  nsExec::ExecToLog `"$CmdPath" /C taskkill /T /F /IM "quick-translate.exe"`
  Pop $0
  Sleep 2000
!macroend

!macro customInit
  StrCpy $0 "$INSTDIR\"
  StrLen $1 "$0"
  StrCpy $2 "$EXEPATH" $1
  StrCmp "$2" "$0" 0 QuickTranslateSafeInstallerDone

  DetailPrint "Installer is inside the install directory. Relaunching from temp before cleanup."
  CreateDirectory "$TEMP\QuickTranslateInstaller"
  CopyFiles /SILENT "$EXEPATH" "$TEMP\QuickTranslateInstaller\Quick-Translate-Update.exe"
  IfErrors QuickTranslateSafeInstallerDone 0
  Exec '"$TEMP\QuickTranslateInstaller\Quick-Translate-Update.exe"'
  Quit

  QuickTranslateSafeInstallerDone:
!macroend
