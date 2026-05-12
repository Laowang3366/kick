package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type transactionState struct {
	ID                string `json:"id"`
	InstallerPath     string `json:"installerPath"`
	InstallDirectory  string `json:"installDirectory,omitempty"`
	CoordinatorPath   string `json:"coordinatorPath,omitempty"`
	FailureCode       string `json:"failureCode,omitempty"`
	InstallerExitHint string `json:"installerExitHint,omitempty"`
	CurrentProcessID  int    `json:"currentProcessId"`
	Status            string `json:"status"`
	Percent           int    `json:"percent"`
	Message           string `json:"message"`
	UpdatedAt         string `json:"updatedAt"`
}

func main() {
	installerPath := flag.String("installer", "", "installer path")
	workingDirectory := flag.String("working-dir", "", "installer working directory")
	currentProcessID := flag.Int("current-pid", 0, "current app process id")
	argumentList := flag.String("argument-list", "", "installer argument")
	var installerArguments stringListFlag
	flag.Var(&installerArguments, "installer-arg", "installer argument")
	logPath := flag.String("log", "", "handoff log path")
	transactionPath := flag.String("transaction", "", "transaction state path")
	installDirectory := flag.String("install-dir", "", "install directory")
	flag.Parse()

	if strings.TrimSpace(*workingDirectory) == "" && strings.TrimSpace(*installerPath) != "" {
		*workingDirectory = filepath.Dir(*installerPath)
	}

	writeLog(*logPath, "coordinator started")
	writeState(*transactionPath, transactionState{
		ID:               strconv.Itoa(*currentProcessID),
		InstallerPath:    *installerPath,
		InstallDirectory: *installDirectory,
		CoordinatorPath:  os.Args[0],
		CurrentProcessID: *currentProcessID,
		Status:           "waiting-app-exit",
		Percent:          15,
		Message:          "正在等待旧版本退出",
		UpdatedAt:        now(),
	})

	waitForExit(*currentProcessID, 2*time.Second)
	cleanupProcesses(*currentProcessID, *logPath, *transactionPath, *installerPath, *installDirectory)

	writeLog(*logPath, "installer start requested")
	writeState(*transactionPath, transactionState{
		ID:               strconv.Itoa(*currentProcessID),
		InstallerPath:    *installerPath,
		InstallDirectory: *installDirectory,
		CoordinatorPath:  os.Args[0],
		CurrentProcessID: *currentProcessID,
		Status:           "launching-installer",
		Percent:          80,
		Message:          "正在启动安装器",
		UpdatedAt:        now(),
	})

	args := installerArgs(installerArguments, *argumentList)
	cmd := exec.Command(*installerPath, args...)
	cmd.Dir = *workingDirectory
	cmd.Env = installerEnvironment(os.Environ(), *transactionPath)
	if err := cmd.Start(); err != nil {
		message := "安装器启动失败：" + err.Error()
		writeLog(*logPath, "installer failed: "+err.Error())
		writeState(*transactionPath, transactionState{
			ID:                strconv.Itoa(*currentProcessID),
			InstallerPath:     *installerPath,
			InstallDirectory:  *installDirectory,
			CoordinatorPath:   os.Args[0],
			CurrentProcessID:  *currentProcessID,
			Status:            "failed",
			Percent:           100,
			Message:           message,
			FailureCode:       "installer-start-failed",
			InstallerExitHint: "请手动运行已下载的安装包，或重新下载最新安装包。",
			UpdatedAt:         now(),
		})
		os.Exit(1)
	}

	writeLog(*logPath, "installer started")
	writeState(*transactionPath, transactionState{
		ID:               strconv.Itoa(*currentProcessID),
		InstallerPath:    *installerPath,
		InstallDirectory: *installDirectory,
		CoordinatorPath:  os.Args[0],
		CurrentProcessID: *currentProcessID,
		Status:           "installer-started",
		Percent:          100,
		Message:          "安装器已启动",
		UpdatedAt:        now(),
	})
}

func waitForExit(pid int, timeout time.Duration) {
	if pid <= 0 {
		return
	}
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if !processExists(pid) {
			return
		}
		time.Sleep(100 * time.Millisecond)
	}
}

func processExists(pid int) bool {
	cmd := exec.Command("tasklist.exe", "/FI", fmt.Sprintf("PID eq %d", pid), "/FO", "CSV", "/NH")
	output, err := cmd.Output()
	if err != nil {
		return false
	}
	return strings.Contains(string(output), strconv.Itoa(pid))
}

func cleanupProcesses(pid int, logPath string, transactionPath string, installerPath string, installDirectory string) {
	writeLog(logPath, "cleanup started")
	writeState(transactionPath, transactionState{
		ID:               strconv.Itoa(pid),
		InstallerPath:    installerPath,
		InstallDirectory: installDirectory,
		CoordinatorPath:  os.Args[0],
		CurrentProcessID: pid,
		Status:           "cleaning-processes",
		Percent:          45,
		Message:          "正在清理旧版本进程",
		UpdatedAt:        now(),
	})

	if pid > 0 {
		runQuiet("taskkill.exe", "/PID", strconv.Itoa(pid), "/T", "/F")
	}
	runPowerShellCleanup(pid, installDirectory)
	runQuiet("taskkill.exe", "/T", "/F", "/IM", "快捷翻译.exe")
	runQuiet("taskkill.exe", "/T", "/F", "/IM", "quick-translate.exe")
	waitForProcessNamesToExit(5*time.Second, "快捷翻译.exe", "quick-translate.exe")
	writeLog(logPath, "cleanup finished")
}

type stringListFlag []string

func (values *stringListFlag) String() string {
	return strings.Join(*values, " ")
}

func (values *stringListFlag) Set(value string) error {
	*values = append(*values, value)
	return nil
}

func installerArgs(arguments []string, legacyArgumentList string) []string {
	if len(arguments) > 0 {
		return arguments
	}
	legacyArgument := strings.TrimSpace(legacyArgumentList)
	if legacyArgument == "" {
		return nil
	}
	return []string{legacyArgument}
}

func installerEnvironment(base []string, transactionPath string) []string {
	environment := append([]string{}, base...)
	tempDirectory := installerTempDirectory()
	if tempDirectory != "" {
		environment = upsertEnvironmentValue(environment, "TEMP", tempDirectory)
		environment = upsertEnvironmentValue(environment, "TMP", tempDirectory)
	}
	if strings.TrimSpace(transactionPath) != "" {
		environment = upsertEnvironmentValue(environment, "QUICK_TRANSLATE_UPDATE_TRANSACTION", transactionPath)
	}
	return environment
}

func installerTempDirectory() string {
	if localAppData := strings.TrimSpace(os.Getenv("LOCALAPPDATA")); localAppData != "" {
		tempDirectory := filepath.Join(localAppData, "Temp")
		if err := os.MkdirAll(tempDirectory, 0755); err == nil {
			return tempDirectory
		}
	}
	if tempDirectory := strings.TrimSpace(os.Getenv("TEMP")); tempDirectory != "" {
		return tempDirectory
	}
	if tempDirectory := strings.TrimSpace(os.Getenv("TMP")); tempDirectory != "" {
		return tempDirectory
	}
	return os.TempDir()
}

func upsertEnvironmentValue(environment []string, key string, value string) []string {
	prefix := strings.ToUpper(key) + "="
	entry := key + "=" + value
	for index, item := range environment {
		if strings.HasPrefix(strings.ToUpper(item), prefix) {
			environment[index] = entry
			return environment
		}
	}
	return append(environment, entry)
}

func runQuiet(name string, args ...string) {
	cmd := exec.Command(name, args...)
	_ = cmd.Run()
}

func runPowerShellCleanup(pid int, installDirectory string) {
	script := fmt.Sprintf(`
$target = %s
$current = %d
$names = @('快捷翻译.exe', 'quick-translate.exe')
$deadline = (Get-Date).AddSeconds(6)
do {
  $processes = Get-CimInstance -ClassName Win32_Process | Where-Object {
    (($current -gt 0) -and ($_.ProcessId -eq $current)) -or
    (($target -ne '') -and $_.ExecutablePath -and $_.ExecutablePath.StartsWith($target, [System.StringComparison]::CurrentCultureIgnoreCase)) -or
    ($names -contains $_.Name) -or
    ($_.CommandLine -like '*quick-translate-*hook.ps1*') -or
    ($_.CommandLine -like '*quick-translate-copy-shortcut.ps1*')
  }
  $ids = @($processes | ForEach-Object { $_.ProcessId } | Where-Object { $_ -ne $PID })
  if ($ids.Count -eq 0) { exit 0 }
  $ids | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Milliseconds 250
} while ((Get-Date) -lt $deadline)
exit 0
`, powerShellString(installDirectory), pid)
	runQuiet("powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script)
}

func waitForProcessNamesToExit(timeout time.Duration, names ...string) {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if !anyNamedProcessExists(names...) {
			return
		}
		time.Sleep(200 * time.Millisecond)
	}
}

func anyNamedProcessExists(names ...string) bool {
	for _, name := range names {
		if processNameExists(name) {
			return true
		}
	}
	return false
}

func processNameExists(name string) bool {
	cmd := exec.Command("tasklist.exe", "/FI", fmt.Sprintf("IMAGENAME eq %s", name), "/FO", "CSV", "/NH")
	output, err := cmd.Output()
	if err != nil {
		return false
	}
	text := strings.TrimSpace(string(output))
	return text != "" && !strings.Contains(text, "INFO:") && strings.Contains(text, name)
}

func powerShellString(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "''") + "'"
}

func writeLog(logPath string, message string) {
	if strings.TrimSpace(logPath) == "" {
		return
	}
	_ = os.MkdirAll(filepath.Dir(logPath), 0755)
	file, err := os.OpenFile(logPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return
	}
	defer file.Close()
	_, _ = fmt.Fprintf(file, "%s %s\n", now(), message)
}

func writeState(transactionPath string, state transactionState) {
	if strings.TrimSpace(transactionPath) == "" {
		return
	}
	_ = os.MkdirAll(filepath.Dir(transactionPath), 0755)
	content, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return
	}
	_ = os.WriteFile(transactionPath, append(content, '\n'), 0644)
}

func now() string {
	return time.Now().UTC().Format(time.RFC3339Nano)
}
