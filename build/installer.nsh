!macro customCheckAppRunning
  DetailPrint "Closing running Quick Translate before install."
  nsExec::Exec `"$CmdPath" /C taskkill /IM "${APP_EXECUTABLE_FILENAME}"`
  Pop $0
  nsExec::Exec `"$CmdPath" /C taskkill /IM "快捷翻译.exe"`
  Pop $0
  nsExec::Exec `"$CmdPath" /C taskkill /IM "quick-translate.exe"`
  Pop $0
  Sleep 1500

  nsExec::Exec `"$CmdPath" /C taskkill /F /IM "${APP_EXECUTABLE_FILENAME}"`
  Pop $0
  nsExec::Exec `"$CmdPath" /C taskkill /F /IM "快捷翻译.exe"`
  Pop $0
  nsExec::Exec `"$CmdPath" /C taskkill /F /IM "quick-translate.exe"`
  Pop $0
  Sleep 1200
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
