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
	)

	expectedTemp := filepath.Join(`C:\Users\wfq\AppData\Local`, "Temp")
	expectEnvironmentValue(t, environment, "TEMP", expectedTemp)
	expectEnvironmentValue(t, environment, "TMP", expectedTemp)
	expectEnvironmentValue(t, environment, "QUICK_TRANSLATE_UPDATE_TRANSACTION", `C:\Users\wfq\AppData\Local\Temp\QuickTranslateUpdateTransaction-123.json`)
}

func TestUpsertEnvironmentValueIsCaseInsensitive(t *testing.T) {
	environment := upsertEnvironmentValue([]string{"Path=C:\\Windows", "temp=C:\\Windows\\Temp"}, "TEMP", "C:\\Users\\wfq\\Temp")

	expectEnvironmentValue(t, environment, "TEMP", "C:\\Users\\wfq\\Temp")
	if len(environment) != 2 {
		t.Fatalf("expected upsert to replace existing value, got %d entries: %#v", len(environment), environment)
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
