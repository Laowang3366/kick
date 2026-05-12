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
	ID               string `json:"id"`
	InstallerPath    string `json:"installerPath"`
	InstallDirectory string `json:"installDirectory,omitempty"`
	CurrentProcessID int    `json:"currentProcessId"`
	Status           string `json:"status"`
	Percent          int    `json:"percent"`
	Message          string `json:"message"`
	UpdatedAt        string `json:"updatedAt"`
}

func main() {
	installerPath := flag.String("installer", "", "installer path")
	workingDirectory := flag.String("working-dir", "", "installer working directory")
	currentProcessID := flag.Int("current-pid", 0, "current app process id")
	argumentList := flag.String("argument-list", "", "installer argument")
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
		CurrentProcessID: *currentProcessID,
		Status:           "launching-installer",
		Percent:          80,
		Message:          "正在启动安装器",
		UpdatedAt:        now(),
	})

	args := installerArgs(*argumentList)
	cmd := exec.Command(*installerPath, args...)
	cmd.Dir = *workingDirectory
	if err := cmd.Start(); err != nil {
		message := "安装器启动失败：" + err.Error()
		writeLog(*logPath, "installer failed: "+err.Error())
		writeState(*transactionPath, transactionState{
			ID:               strconv.Itoa(*currentProcessID),
			InstallerPath:    *installerPath,
			InstallDirectory: *installDirectory,
			CurrentProcessID: *currentProcessID,
			Status:           "failed",
			Percent:          100,
			Message:          message,
			UpdatedAt:        now(),
		})
		os.Exit(1)
	}

	writeLog(*logPath, "installer started")
	writeState(*transactionPath, transactionState{
		ID:               strconv.Itoa(*currentProcessID),
		InstallerPath:    *installerPath,
		InstallDirectory: *installDirectory,
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
		CurrentProcessID: pid,
		Status:           "cleaning-processes",
		Percent:          45,
		Message:          "正在清理旧版本进程",
		UpdatedAt:        now(),
	})

	if pid > 0 {
		runQuiet("taskkill.exe", "/PID", strconv.Itoa(pid), "/T", "/F")
	}
	runQuiet("taskkill.exe", "/T", "/F", "/IM", "快捷翻译.exe")
	runQuiet("taskkill.exe", "/T", "/F", "/IM", "quick-translate.exe")
	time.Sleep(200 * time.Millisecond)
	writeLog(logPath, "cleanup finished")
}

func installerArgs(argumentList string) []string {
	argument := strings.TrimSpace(argumentList)
	if argument == "" {
		return nil
	}
	return []string{argument}
}

func runQuiet(name string, args ...string) {
	cmd := exec.Command(name, args...)
	_ = cmd.Run()
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
