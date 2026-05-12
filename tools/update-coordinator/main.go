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
	"syscall"
	"time"
	"unsafe"
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
	cmd.Env = installerEnvironment(os.Environ(), *transactionPath, *currentProcessID)
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
	cleanupMatchedProcesses(pid, installDirectory, logPath)
	waitForInstallDirectoryRelease(installDirectory, 2*time.Second)
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

func installerEnvironment(base []string, transactionPath string, currentProcessID int) []string {
	environment := append([]string{}, base...)
	tempDirectory := installerTempDirectory()
	if tempDirectory != "" {
		environment = upsertEnvironmentValue(environment, "TEMP", tempDirectory)
		environment = upsertEnvironmentValue(environment, "TMP", tempDirectory)
	}
	if strings.TrimSpace(transactionPath) != "" {
		environment = upsertEnvironmentValue(environment, "QUICK_TRANSLATE_UPDATE_TRANSACTION", transactionPath)
	}
	if currentProcessID > 0 {
		environment = upsertEnvironmentValue(environment, "QUICK_TRANSLATE_UPDATE_PROCESS_ID", strconv.Itoa(currentProcessID))
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

func cleanupMatchedProcesses(currentProcessID int, installDirectory string, logPath string) {
	processes, err := enumerateProcesses(installDirectory)
	if err != nil {
		writeLog(logPath, "process enumeration warning: "+err.Error())
		runQuiet("taskkill.exe", "/T", "/F", "/IM", "快捷翻译.exe")
		runQuiet("taskkill.exe", "/T", "/F", "/IM", "quick-translate.exe")
		return
	}

	seen := map[uint32]bool{}
	for _, process := range processes {
		if process.PID == 0 || int(process.PID) == os.Getpid() || seen[process.PID] {
			continue
		}
		seen[process.PID] = true
		if process.PathQueryError != "" && strings.TrimSpace(installDirectory) != "" {
			writeLog(logPath, fmt.Sprintf("path-query-denied pid=%d name=%s error=%s", process.PID, process.Name, process.PathQueryError))
		}
		if shouldTerminateProcess(process, cleanupCriteria{CurrentProcessID: currentProcessID, InstallDirectory: installDirectory}) {
			runQuiet("taskkill.exe", "/PID", strconv.Itoa(int(process.PID)), "/T", "/F")
		}
	}
}

type cleanupCriteria struct {
	CurrentProcessID int
	InstallDirectory string
}

type processSnapshot struct {
	PID            uint32
	ParentPID      uint32
	Name           string
	ImagePath      string
	PathQueryError string
}

func shouldTerminateProcess(process processSnapshot, criteria cleanupCriteria) bool {
	if criteria.CurrentProcessID > 0 && int(process.PID) == criteria.CurrentProcessID {
		return true
	}
	if isQuickTranslateProcessName(process.Name) {
		return true
	}
	if process.ImagePath == "" {
		return false
	}
	return pathIsInsideDirectory(process.ImagePath, criteria.InstallDirectory)
}

func isQuickTranslateProcessName(name string) bool {
	normalized := strings.ToLower(strings.TrimSpace(name))
	return normalized == strings.ToLower("快捷翻译.exe") || normalized == "quick-translate.exe"
}

func pathIsInsideDirectory(filePath string, directory string) bool {
	normalizedPath := normalizeWindowsPath(filePath)
	normalizedDirectory := normalizeWindowsPath(directory)
	if normalizedPath == "" || normalizedDirectory == "" {
		return false
	}
	return normalizedPath == normalizedDirectory || strings.HasPrefix(normalizedPath, normalizedDirectory+`\`)
}

func normalizeWindowsPath(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}
	normalized := strings.ToLower(filepath.Clean(trimmed))
	if strings.HasPrefix(normalized, `\\?\unc\`) {
		normalized = `\\` + strings.TrimPrefix(normalized, `\\?\unc\`)
	} else if strings.HasPrefix(normalized, `\\?\`) {
		normalized = strings.TrimPrefix(normalized, `\\?\`)
	}
	return strings.TrimRight(normalized, `\/`)
}

func waitForInstallDirectoryRelease(installDirectory string, timeout time.Duration) {
	if strings.TrimSpace(installDirectory) == "" {
		time.Sleep(500 * time.Millisecond)
		return
	}
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if installDirectoryLooksReleased(installDirectory) {
			return
		}
		time.Sleep(200 * time.Millisecond)
	}
}

func installDirectoryLooksReleased(installDirectory string) bool {
	if _, err := os.Stat(installDirectory); os.IsNotExist(err) {
		return true
	}
	probePath := filepath.Join(installDirectory, fmt.Sprintf(".quick-translate-lock-probe-%d.tmp", time.Now().UnixNano()))
	file, err := os.OpenFile(probePath, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		return false
	}
	_ = file.Close()
	_ = os.Remove(probePath)
	return true
}

const (
	th32csSnapProcess              = 0x00000002
	processQueryLimitedInformation = 0x1000
)

var (
	kernel32                       = syscall.NewLazyDLL("kernel32.dll")
	procCreateToolhelp32Snapshot   = kernel32.NewProc("CreateToolhelp32Snapshot")
	procProcess32FirstW            = kernel32.NewProc("Process32FirstW")
	procProcess32NextW             = kernel32.NewProc("Process32NextW")
	procOpenProcess                = kernel32.NewProc("OpenProcess")
	procCloseHandle                = kernel32.NewProc("CloseHandle")
	procQueryFullProcessImageNameW = kernel32.NewProc("QueryFullProcessImageNameW")
)

type processEntry32 struct {
	Size              uint32
	Usage             uint32
	ProcessID         uint32
	DefaultHeapID     uintptr
	ModuleID          uint32
	Threads           uint32
	ParentProcessID   uint32
	PriorityClassBase int32
	Flags             uint32
	ExeFile           [260]uint16
}

func enumerateProcesses(installDirectory string) ([]processSnapshot, error) {
	handle, _, lastErr := procCreateToolhelp32Snapshot.Call(uintptr(th32csSnapProcess), 0)
	if handle == uintptr(syscall.InvalidHandle) {
		return nil, windowsCallError(lastErr, "CreateToolhelp32Snapshot")
	}
	defer closeHandle(handle)

	var entry processEntry32
	entry.Size = uint32(unsafe.Sizeof(entry))
	if ok, _, lastErr := procProcess32FirstW.Call(handle, uintptr(unsafe.Pointer(&entry))); ok == 0 {
		return nil, windowsCallError(lastErr, "Process32FirstW")
	}

	var processes []processSnapshot
	for {
		process := processSnapshot{
			PID:       entry.ProcessID,
			ParentPID: entry.ParentProcessID,
			Name:      syscall.UTF16ToString(entry.ExeFile[:]),
		}
		if strings.TrimSpace(installDirectory) != "" || isQuickTranslateProcessName(process.Name) {
			imagePath, queryErr := queryProcessImagePath(process.PID)
			if queryErr != nil {
				process.PathQueryError = queryErr.Error()
			} else {
				process.ImagePath = imagePath
			}
		}
		processes = append(processes, process)

		ok, _, _ := procProcess32NextW.Call(handle, uintptr(unsafe.Pointer(&entry)))
		if ok == 0 {
			break
		}
	}
	return processes, nil
}

func queryProcessImagePath(pid uint32) (string, error) {
	handle, _, lastErr := procOpenProcess.Call(uintptr(processQueryLimitedInformation), 0, uintptr(pid))
	if handle == 0 {
		return "", windowsCallError(lastErr, "OpenProcess")
	}
	defer closeHandle(handle)

	buffer := make([]uint16, 32768)
	size := uint32(len(buffer))
	ok, _, lastErr := procQueryFullProcessImageNameW.Call(
		handle,
		0,
		uintptr(unsafe.Pointer(&buffer[0])),
		uintptr(unsafe.Pointer(&size)),
	)
	if ok == 0 {
		return "", windowsCallError(lastErr, "QueryFullProcessImageNameW")
	}
	return syscall.UTF16ToString(buffer[:size]), nil
}

func windowsCallError(lastErr any, fallback string) error {
	switch value := lastErr.(type) {
	case nil:
		return fmt.Errorf("%s failed without last error", fallback)
	case syscall.Errno:
		if value != 0 {
			return value
		}
	case uintptr:
		if value != 0 {
			return syscall.Errno(value)
		}
	case error:
		if errno, ok := value.(syscall.Errno); ok {
			if errno != 0 {
				return errno
			}
			break
		}
		return value
	default:
		return fmt.Errorf("%s failed: %v", fallback, value)
	}
	return fmt.Errorf("%s failed without last error", fallback)
}

func closeHandle(handle uintptr) {
	if handle != 0 && handle != uintptr(syscall.InvalidHandle) {
		procCloseHandle.Call(handle)
	}
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
