Var /GLOBAL QuickTranslateAttemptedInstallCleanupPath

!macro quickTranslateTerminateProcesses INSTALL_PATH
  DetailPrint "正在清理旧进程..."
  nsExec::ExecToLog `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "$$target='${INSTALL_PATH}'; $$names=@('${APP_EXECUTABLE_FILENAME}','快捷翻译.exe','quick-translate.exe'); $$deadline=(Get-Date).AddSeconds(6); do { $$processes=Get-CimInstance -ClassName Win32_Process | ? { (($$target -ne '') -and $$_.ExecutablePath -and $$_.ExecutablePath.StartsWith($$target, [System.StringComparison]::CurrentCultureIgnoreCase)) -or ($$names -contains $$_.Name) -or ($$_.CommandLine -like '*quick-translate-*hook.ps1*') -or ($$_.CommandLine -like '*quick-translate-copy-shortcut.ps1*') }; $$ids=@($$processes | % { $$_.ProcessId } | ? { $$_ -ne $$PID }); if ($$ids.Count -eq 0) { exit 0 }; $$ids | % { Stop-Process -Id $$_ -Force -ErrorAction SilentlyContinue }; Start-Sleep -Milliseconds 250 } while ((Get-Date) -lt $$deadline); exit 0"`
  Pop $0
  nsExec::ExecToLog `"$SYSDIR\cmd.exe" /C taskkill /T /F /IM "${APP_EXECUTABLE_FILENAME}"`
  Pop $0
  nsExec::ExecToLog `"$SYSDIR\cmd.exe" /C taskkill /T /F /IM "快捷翻译.exe"`
  Pop $0
  nsExec::ExecToLog `"$SYSDIR\cmd.exe" /C taskkill /T /F /IM "quick-translate.exe"`
  Pop $0
!macroend

!macro quickTranslateRemoveInstallDirectory INSTALL_PATH
  !define RemoveDirUniqueID ${__LINE__}
  Push $R6
  Push $R7
  SetOutPath "$TEMP"
  StrCmp "${INSTALL_PATH}" "" QuickTranslateRemoveInstallDirectoryDone_${RemoveDirUniqueID}
  StrCmp "${INSTALL_PATH}" "$QuickTranslateAttemptedInstallCleanupPath" QuickTranslateRemoveInstallDirectoryDone_${RemoveDirUniqueID}
  StrCpy $QuickTranslateAttemptedInstallCleanupPath "${INSTALL_PATH}"
  StrCpy $R7 0
  !insertmacro quickTranslateTerminateProcesses "${INSTALL_PATH}"

  QuickTranslateRemoveInstallDirectoryLoop_${RemoveDirUniqueID}:
    IntOp $R7 $R7 + 1
    StrCpy $R6 "$TEMP\QuickTranslateOld-${VERSION}-$R7"
    ClearErrors
    RMDir /r "$R6"
    DetailPrint "正在隔离旧版本文件..."
    ClearErrors
    Rename "${INSTALL_PATH}" "$R6"
    IfErrors 0 QuickTranslateRemoveInstallDirectoryCleanupQuarantine_${RemoveDirUniqueID}
    DetailPrint "正在替换旧版本文件..."
    ClearErrors
    RMDir /r "${INSTALL_PATH}"
    IfFileExists "${INSTALL_PATH}\*.*" 0 QuickTranslateRemoveInstallDirectoryDone_${RemoveDirUniqueID}
    DetailPrint "旧版本文件仍被占用，等待释放：${INSTALL_PATH}"
    Sleep 300
    IntCmp $R7 2 QuickTranslateRemoveInstallDirectoryDone_${RemoveDirUniqueID} QuickTranslateRemoveInstallDirectoryLoop_${RemoveDirUniqueID} QuickTranslateRemoveInstallDirectoryDone_${RemoveDirUniqueID}

  QuickTranslateRemoveInstallDirectoryCleanupQuarantine_${RemoveDirUniqueID}:
    DetailPrint "旧版本文件已隔离，正在清理临时文件..."
    ClearErrors
    RMDir /r "$R6"
    Goto QuickTranslateRemoveInstallDirectoryDone_${RemoveDirUniqueID}

  QuickTranslateRemoveInstallDirectoryDone_${RemoveDirUniqueID}:
  Pop $R7
  Pop $R6
  !undef RemoveDirUniqueID
!macroend

!macro quickTranslateBeforeExtractRetry INSTALL_PATH ATTEMPT
  !define ExtractRetryUniqueID ${__LINE__}
  StrCmp "${ATTEMPT}" "1" 0 QuickTranslateBeforeExtractRetryWait_${ExtractRetryUniqueID}
  DetailPrint "安装目录被占用，正在执行安装器兜底清理..."
  Goto QuickTranslateBeforeExtractRetryDone_${ExtractRetryUniqueID}

  QuickTranslateBeforeExtractRetryWait_${ExtractRetryUniqueID}:
  DetailPrint "安装目录仍被占用，正在短暂等待后重试..."

  QuickTranslateBeforeExtractRetryDone_${ExtractRetryUniqueID}:
  !insertmacro quickTranslateTerminateProcesses "${INSTALL_PATH}"
  SetOutPath "$TEMP"
  ClearErrors
  RMDir /r "${INSTALL_PATH}"
  Sleep 500
  CreateDirectory "${INSTALL_PATH}"
  SetOutPath "${INSTALL_PATH}"
  !undef ExtractRetryUniqueID
!macroend

!macro quickTranslateMarkUpdateTransactionInstalled
  DetailPrint "正在记录更新安装完成状态..."
  nsExec::ExecToLog `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "$$transactionPath=$$env:QUICK_TRANSLATE_UPDATE_TRANSACTION; if ([string]::IsNullOrWhiteSpace($$transactionPath) -or -not (Test-Path -LiteralPath $$transactionPath -PathType Leaf)) { exit 0 }; try { $$state=Get-Content -LiteralPath $$transactionPath -Raw -Encoding UTF8 | ConvertFrom-Json } catch { $$state=[pscustomobject]@{} }; $$now=(Get-Date).ToUniversalTime().ToString('o'); $$state | Add-Member -NotePropertyName status -NotePropertyValue 'installed' -Force; $$state | Add-Member -NotePropertyName percent -NotePropertyValue 100 -Force; $$state | Add-Member -NotePropertyName message -NotePropertyValue '安装完成' -Force; $$state | Add-Member -NotePropertyName result -NotePropertyValue 'done' -Force; $$state | Add-Member -NotePropertyName installedAt -NotePropertyValue $$now -Force; $$state | Add-Member -NotePropertyName updatedAt -NotePropertyValue $$now -Force; $$state | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $$transactionPath -Encoding UTF8; exit 0"`
  Pop $0
!macroend

!macro preInit
  SetOutPath "$TEMP"
!macroend

!macro customCheckAppRunning
  SetDetailsPrint both
  DetailPrint "正在准备安装并清理旧版本..."
  IfFileExists "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0 QuickTranslateInstallDirCleanupDone
  DetailPrint "正在清理旧安装目录：$INSTDIR"
  !insertmacro quickTranslateRemoveInstallDirectory "$INSTDIR"
  QuickTranslateInstallDirCleanupDone:
  DetailPrint "旧版本清理完成，正在替换文件..."
!macroend

!macro quickTranslateRemoveRegisteredInstall ROOT_KEY
  !define UniqueID ${__LINE__}
  ReadRegStr $3 ${ROOT_KEY} "${INSTALL_REGISTRY_KEY}" InstallLocation
  ReadRegStr $4 ${ROOT_KEY} "${UNINSTALL_REGISTRY_KEY}" UninstallString
  !ifdef UNINSTALL_REGISTRY_KEY_2
    StrCmp "$4" "" 0 QuickTranslateHasUninstallString_${UniqueID}
    ReadRegStr $4 ${ROOT_KEY} "${UNINSTALL_REGISTRY_KEY_2}" UninstallString
    QuickTranslateHasUninstallString_${UniqueID}:
  !endif
  StrCmp "$3" "" QuickTranslateRemoveStaleUninstallRegistry_${UniqueID}

  DetailPrint "Removing registered Quick Translate install before upgrade: $3"
  !insertmacro quickTranslateRemoveInstallDirectory "$3"
  Goto QuickTranslateDeleteUninstallRegistry_${UniqueID}

  QuickTranslateRemoveStaleUninstallRegistry_${UniqueID}:
  StrCmp "$4" "" QuickTranslateLegacyCleanupDone_${UniqueID}
  DetailPrint "Removing stale Quick Translate uninstall registry before upgrade."

  QuickTranslateDeleteUninstallRegistry_${UniqueID}:
  DeleteRegKey ${ROOT_KEY} "${UNINSTALL_REGISTRY_KEY}"
  !ifdef UNINSTALL_REGISTRY_KEY_2
    DeleteRegKey ${ROOT_KEY} "${UNINSTALL_REGISTRY_KEY_2}"
  !endif
  DetailPrint "Keeping Quick Translate install location registry for retryable upgrades."

  QuickTranslateLegacyCleanupDone_${UniqueID}:
  !undef UniqueID
!macroend

!macro quickTranslateRemoveRegisteredInstallAllViews ROOT_KEY
  !insertmacro quickTranslateRemoveRegisteredInstall ${ROOT_KEY}
  ${If} ${RunningX64}
    SetRegView 32
    !insertmacro quickTranslateRemoveRegisteredInstall ${ROOT_KEY}
    SetRegView 64
    !insertmacro quickTranslateRemoveRegisteredInstall ${ROOT_KEY}
  ${EndIf}
!macroend

!macro quickTranslateRestoreRegisteredInstallDirectory ROOT_KEY
  !define UniqueID ${__LINE__}
  StrCmp "$9" "1" QuickTranslateRestoreRegisteredInstallDirectoryDone_${UniqueID}
  ReadRegStr $5 ${ROOT_KEY} "${INSTALL_REGISTRY_KEY}" InstallLocation
  StrCmp "$5" "" QuickTranslateRestoreRegisteredInstallDirectoryDone_${UniqueID}
  IfFileExists "$5\*.*" 0 QuickTranslateRestoreRegisteredInstallDirectoryDone_${UniqueID}
  StrCpy $INSTDIR "$5"
  StrCpy $9 "1"
  DetailPrint "Using previous Quick Translate install directory: $INSTDIR"

  QuickTranslateRestoreRegisteredInstallDirectoryDone_${UniqueID}:
  !undef UniqueID
!macroend

!macro quickTranslateRestoreRegisteredInstallDirectoryAllViews ROOT_KEY
  !insertmacro quickTranslateRestoreRegisteredInstallDirectory ${ROOT_KEY}
  ${If} ${RunningX64}
    SetRegView 32
    !insertmacro quickTranslateRestoreRegisteredInstallDirectory ${ROOT_KEY}
    SetRegView 64
    !insertmacro quickTranslateRestoreRegisteredInstallDirectory ${ROOT_KEY}
  ${EndIf}
!macroend

!macro customInit
  StrCpy $QuickTranslateAttemptedInstallCleanupPath ""
  StrCpy $9 "0"
  !insertmacro quickTranslateRestoreRegisteredInstallDirectoryAllViews HKEY_CURRENT_USER
  !insertmacro quickTranslateRestoreRegisteredInstallDirectoryAllViews HKEY_LOCAL_MACHINE

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

  !insertmacro quickTranslateRemoveRegisteredInstallAllViews HKEY_CURRENT_USER
  !insertmacro quickTranslateRemoveRegisteredInstallAllViews HKEY_LOCAL_MACHINE
!macroend

!macro customInstall
  !insertmacro quickTranslateMarkUpdateTransactionInstalled
!macroend
