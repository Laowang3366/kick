!macro customCheckAppRunning
  DetailPrint "Closing running Quick Translate before install."
  nsExec::ExecToLog `"$PowerShellPath" -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance -ClassName Win32_Process | ? { ($$_.ExecutablePath -and $$_.ExecutablePath.StartsWith('$INSTDIR', [System.StringComparison]::CurrentCultureIgnoreCase)) -or ($$_.CommandLine -like '*quick-translate-mouse-button*hook.ps1*') } | % { Stop-Process -Id $$_.ProcessId -Force -ErrorAction SilentlyContinue }"`
  Pop $0
  nsExec::ExecToLog `"$CmdPath" /C taskkill /T /IM "${APP_EXECUTABLE_FILENAME}"`
  Pop $0
  nsExec::ExecToLog `"$CmdPath" /C taskkill /T /IM "快捷翻译.exe"`
  Pop $0
  nsExec::ExecToLog `"$CmdPath" /C taskkill /T /IM "quick-translate.exe"`
  Pop $0
  Sleep 2500

  nsExec::ExecToLog `"$PowerShellPath" -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance -ClassName Win32_Process | ? { ($$_.ExecutablePath -and $$_.ExecutablePath.StartsWith('$INSTDIR', [System.StringComparison]::CurrentCultureIgnoreCase)) -or ($$_.CommandLine -like '*quick-translate-mouse-button*hook.ps1*') } | % { Stop-Process -Id $$_.ProcessId -Force -ErrorAction SilentlyContinue }"`
  Pop $0
  nsExec::ExecToLog `"$CmdPath" /C taskkill /T /F /IM "${APP_EXECUTABLE_FILENAME}"`
  Pop $0
  nsExec::ExecToLog `"$CmdPath" /C taskkill /T /F /IM "快捷翻译.exe"`
  Pop $0
  nsExec::ExecToLog `"$CmdPath" /C taskkill /T /F /IM "quick-translate.exe"`
  Pop $0
  Sleep 2000
!macroend

!macro quickTranslateRemoveRegisteredInstall ROOT_KEY
  !define UniqueID ${__LINE__}
  ReadRegStr $3 ${ROOT_KEY} "${INSTALL_REGISTRY_KEY}" InstallLocation
  StrCmp "$3" "" QuickTranslateLegacyCleanupDone_${UniqueID}

  DetailPrint "Removing registered Quick Translate install before upgrade: $3"
  SetOutPath "$TEMP"
  nsExec::ExecToLog `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance -ClassName Win32_Process | ? { ($$_.ExecutablePath -and $$_.ExecutablePath.StartsWith('$3', [System.StringComparison]::CurrentCultureIgnoreCase)) -or ($$_.CommandLine -like '*quick-translate-mouse-button*hook.ps1*') } | % { Stop-Process -Id $$_.ProcessId -Force -ErrorAction SilentlyContinue }"`
  Pop $0
  Sleep 1000
  RMDir /r "$3"
  DeleteRegKey ${ROOT_KEY} "${UNINSTALL_REGISTRY_KEY}"
  !ifdef UNINSTALL_REGISTRY_KEY_2
    DeleteRegKey ${ROOT_KEY} "${UNINSTALL_REGISTRY_KEY_2}"
  !endif
  DeleteRegKey ${ROOT_KEY} "${INSTALL_REGISTRY_KEY}"

  QuickTranslateLegacyCleanupDone_${UniqueID}:
  !undef UniqueID
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

  !insertmacro quickTranslateRemoveRegisteredInstall HKEY_CURRENT_USER
  !insertmacro quickTranslateRemoveRegisteredInstall HKEY_LOCAL_MACHINE
!macroend
