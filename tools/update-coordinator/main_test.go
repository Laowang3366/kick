package main

import (
	"path/filepath"
	"testing"
)

func TestInstallerEnvironmentUsesUserTempDirectory(t *testing.T) {
	t.Setenv("LOCALAPPDATA", `C:\Users\wfq\AppData\Local`)
	t.Setenv("TEMP", `C:\WINDOWS\TEMP`)
	t.Setenv("TMP", `C:\WINDOWS\TEMP`)

	environment := installerEnvironment(
		[]string{
			`TEMP=C:\WINDOWS\TEMP`,
			`TMP=C:\WINDOWS\TEMP`,
			"PATH=C:\\Windows\\System32",
		},
		`C:\Users\wfq\AppData\Local\Temp\QuickTranslateUpdateTransaction-123.json`,
		123,
	)

	expectedTemp := filepath.Join(`C:\Users\wfq\AppData\Local`, "Temp")
	expectEnvironmentValue(t, environment, "TEMP", expectedTemp)
	expectEnvironmentValue(t, environment, "TMP", expectedTemp)
	expectEnvironmentValue(t, environment, "QUICK_TRANSLATE_UPDATE_TRANSACTION", `C:\Users\wfq\AppData\Local\Temp\QuickTranslateUpdateTransaction-123.json`)
	expectEnvironmentValue(t, environment, "QUICK_TRANSLATE_UPDATE_PROCESS_ID", "123")
}

func TestUpsertEnvironmentValueIsCaseInsensitive(t *testing.T) {
	environment := upsertEnvironmentValue([]string{"Path=C:\\Windows", "temp=C:\\Windows\\Temp"}, "TEMP", "C:\\Users\\wfq\\Temp")

	expectEnvironmentValue(t, environment, "TEMP", "C:\\Users\\wfq\\Temp")
	if len(environment) != 2 {
		t.Fatalf("expected upsert to replace existing value, got %d entries: %#v", len(environment), environment)
	}
}

func TestShouldTerminateProcessMatchesExactPidAndKnownNames(t *testing.T) {
	criteria := cleanupCriteria{CurrentProcessID: 456, InstallDirectory: `D:\Tools\快捷翻译`}

	if !shouldTerminateProcess(processSnapshot{PID: 456, Name: "node.exe"}, criteria) {
		t.Fatal("expected current process pid to match")
	}
	if !shouldTerminateProcess(processSnapshot{PID: 789, Name: "快捷翻译.exe"}, criteria) {
		t.Fatal("expected localized app process name to match")
	}
	if !shouldTerminateProcess(processSnapshot{PID: 790, Name: "quick-translate.exe"}, criteria) {
		t.Fatal("expected legacy app process name to match")
	}
}

func TestShouldTerminateProcessMatchesReadableInstallDirectoryPathOnly(t *testing.T) {
	criteria := cleanupCriteria{InstallDirectory: `D:\Tools\快捷翻译`}

	if !shouldTerminateProcess(processSnapshot{PID: 1, Name: "helper.exe", ImagePath: `D:\Tools\快捷翻译\resources\helper.exe`}, criteria) {
		t.Fatal("expected readable path inside install directory to match")
	}
	if shouldTerminateProcess(processSnapshot{PID: 2, Name: "powershell.exe", PathQueryError: "access denied"}, criteria) {
		t.Fatal("must not match by install directory when the image path cannot be queried")
	}
	if shouldTerminateProcess(processSnapshot{PID: 3, Name: "helper.exe", ImagePath: `D:\Tools\快捷翻译旧版\helper.exe`}, criteria) {
		t.Fatal("must not match sibling directories with a shared prefix")
	}
}

func TestNormalizeWindowsPathSupportsCaseInsensitiveComparisons(t *testing.T) {
	if !pathIsInsideDirectory(`D:\TOOLS\快捷翻译\快捷翻译.exe`, `d:\tools\快捷翻译\`) {
		t.Fatal("expected path comparison to be case-insensitive and trailing-slash tolerant")
	}
	if !pathIsInsideDirectory(`\\?\D:\Tools\快捷翻译\快捷翻译.exe`, `D:\Tools\快捷翻译`) {
		t.Fatal("expected extended-length path prefix to be ignored")
	}
}

func expectEnvironmentValue(t *testing.T, environment []string, key string, expected string) {
	t.Helper()
	prefix := key + "="
	for _, item := range environment {
		if len(item) >= len(prefix) && equalFold(item[:len(prefix)], prefix) {
			if actual := item[len(prefix):]; actual != expected {
				t.Fatalf("expected %s=%q, got %q", key, expected, actual)
			}
			return
		}
	}
	t.Fatalf("missing %s in environment: %#v", key, environment)
}

func equalFold(left string, right string) bool {
	if len(left) != len(right) {
		return false
	}
	for index := range left {
		l := left[index]
		r := right[index]
		if 'a' <= l && l <= 'z' {
			l -= 'a' - 'A'
		}
		if 'a' <= r && r <= 'z' {
			r -= 'a' - 'A'
		}
		if l != r {
			return false
		}
	}
	return true
}
