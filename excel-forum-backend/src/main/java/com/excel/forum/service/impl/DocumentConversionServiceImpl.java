package com.excel.forum.service.impl;

import com.excel.forum.config.FileStorageConfig;
import com.excel.forum.service.DocumentConversionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DocumentConversionServiceImpl implements DocumentConversionService {
    private static final long MAX_FILE_SIZE = 25L * 1024 * 1024;
    private static final DateTimeFormatter FILE_TIME_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final FileStorageConfig fileStorageConfig;

    @Override
    public Map<String, Object> convert(MultipartFile file, String targetType) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("请上传文件");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("文件大小不能超过25MB");
        }

        ConversionTarget target = ConversionTarget.from(targetType);
        SourceType sourceType = SourceType.fromFilename(file.getOriginalFilename());
        if (sourceType == SourceType.UNKNOWN) {
            throw new IllegalArgumentException("仅支持 Word、Excel、PDF 文件");
        }

        Path uploadRoot = resolveUploadRoot();
        Path conversionDir = uploadRoot.resolve("conversions");
        Path tempDir = conversionDir.resolve("tmp");
        try {
            Files.createDirectories(conversionDir);
            Files.createDirectories(tempDir);

            String sourceExt = sourceType.primaryExtension(file.getOriginalFilename());
            Path sourcePath = tempDir.resolve(UUID.randomUUID() + sourceExt);
            String outputFilename = buildOutputFilename(file.getOriginalFilename(), target);
            Path outputPath = conversionDir.resolve(outputFilename);
            Files.copy(file.getInputStream(), sourcePath);

            if (shouldCopyDirectly(sourceExt, target)) {
                Files.copy(sourcePath, outputPath);
            } else {
                runConversion(sourcePath, outputPath, target);
            }

            if (!Files.exists(outputPath)) {
                throw new IllegalStateException("转换失败，未生成结果文件");
            }

            Files.deleteIfExists(sourcePath);
            return Map.of(
                    "message", "转换成功",
                    "fileName", outputFilename,
                    "url", fileStorageConfig.getLocal().getUrlPrefix() + "/conversions/" + outputFilename,
                    "sourceType", sourceType.label,
                    "targetType", target.label
            );
        } catch (IOException e) {
            throw new IllegalStateException("文件处理失败");
        }
    }

    private void runConversion(Path sourcePath, Path outputPath, ConversionTarget target) throws IOException {
        Path scriptPath = Files.createTempFile(sourcePath.getParent(), "doc-convert-", ".ps1");
        Files.writeString(scriptPath, buildPowerShellScript(), StandardCharsets.UTF_8);

        Process process = new ProcessBuilder(
                "powershell.exe",
                "-NoLogo",
                "-NoProfile",
                "-ExecutionPolicy", "Bypass",
                "-File", scriptPath.toString(),
                "-InputPath", sourcePath.toString(),
                "-OutputPath", outputPath.toString(),
                "-TargetKind", target.id
        ).redirectErrorStream(true).start();

        String output;
        try {
            output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                throw new IllegalStateException(normalizeScriptError(output));
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("文件转换被中断");
        } finally {
            Files.deleteIfExists(scriptPath);
        }
    }

    private String normalizeScriptError(String output) {
        String message = output == null ? "" : output.trim();
        if (message.contains("ActiveX component can't create object")
                || message.contains("Retrieving the COM class factory component")
                || message.contains("Cannot create ActiveX component")) {
            return "本机未安装可用的 Microsoft Word/Excel，无法执行文件转换";
        }
        if (message.contains("PDF cannot be opened") || message.contains("无法打开")) {
            return "文件无法打开，可能已损坏或格式不受支持";
        }
        return StringUtils.hasText(message) ? message : "文件转换失败";
    }

    private Path resolveUploadRoot() {
        String uploadDir = fileStorageConfig.getLocal().getPath();
        Path path = Paths.get(uploadDir);
        return path.isAbsolute() ? path : Paths.get("").toAbsolutePath().resolve(path).normalize();
    }

    private String buildOutputFilename(String originalFilename, ConversionTarget target) {
        String baseName = "converted-file";
        if (StringUtils.hasText(originalFilename)) {
            int dotIndex = originalFilename.lastIndexOf('.');
            baseName = dotIndex > 0 ? originalFilename.substring(0, dotIndex) : originalFilename;
        }
        String sanitized = baseName.replaceAll("[^A-Za-z0-9\\u4e00-\\u9fa5_-]", "-");
        sanitized = sanitized.replaceAll("-{2,}", "-");
        if (!StringUtils.hasText(sanitized)) {
            sanitized = "converted-file";
        }
        return sanitized + "-" + LocalDateTime.now().format(FILE_TIME_FORMAT) + target.extension;
    }

    private boolean shouldCopyDirectly(String sourceExtension, ConversionTarget target) {
        return (".pdf".equals(sourceExtension) && target == ConversionTarget.PDF)
                || (".docx".equals(sourceExtension) && target == ConversionTarget.WORD)
                || (".xlsx".equals(sourceExtension) && target == ConversionTarget.EXCEL);
    }

    private String buildPowerShellScript() {
        return """
param(
  [Parameter(Mandatory=$true)][string]$InputPath,
  [Parameter(Mandatory=$true)][string]$OutputPath,
  [Parameter(Mandatory=$true)][ValidateSet('pdf','word','excel')][string]$TargetKind
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Release-ComObject($obj) {
  if ($null -ne $obj) {
    try { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($obj) } catch {}
  }
}

function Convert-WordFile {
  param([string]$SourcePath,[string]$DestinationPath,[string]$Format)
  $word = $null
  $document = $null
  try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $document = $word.Documents.Open($SourcePath, $false, $true)
    switch ($Format) {
      'pdf' { $formatCode = 17 }
      'docx' { $formatCode = 16 }
      'filteredhtml' { $formatCode = 10 }
      default { throw "Unsupported Word format: $Format" }
    }
    $document.SaveAs2($DestinationPath, $formatCode)
  }
  finally {
    if ($document) { try { $document.Close($false) } catch {} }
    if ($word) { try { $word.Quit() } catch {} }
    Release-ComObject $document
    Release-ComObject $word
  }
}

function Convert-ExcelFile {
  param([string]$SourcePath,[string]$DestinationPath,[string]$Format)
  $excel = $null
  $workbook = $null
  try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    $workbook = $excel.Workbooks.Open($SourcePath)
    switch ($Format) {
      'pdf' { $workbook.ExportAsFixedFormat(0, $DestinationPath) }
      'xlsx' { $workbook.SaveAs($DestinationPath, 51) }
      default { throw "Unsupported Excel format: $Format" }
    }
  }
  finally {
    if ($workbook) { try { $workbook.Close($false) } catch {} }
    if ($excel) { try { $excel.Quit() } catch {} }
    Release-ComObject $workbook
    Release-ComObject $excel
  }
}

function Convert-ExcelToWord {
  param([string]$SourcePath,[string]$DestinationPath)
  $excel = $null
  $workbook = $null
  $word = $null
  $document = $null
  try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    $workbook = $excel.Workbooks.Open($SourcePath)

    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $document = $word.Documents.Add()

    $firstSheet = $true
    foreach ($sheet in $workbook.Worksheets) {
      $usedRange = $sheet.UsedRange
      $cellCount = [int]$usedRange.Cells.Count
      $hasContent = $cellCount -gt 1 -or ([string]$usedRange.Text).Trim().Length -gt 0
      if (-not $hasContent) {
        Release-ComObject $usedRange
        Release-ComObject $sheet
        continue
      }
      if (-not $firstSheet) {
        $word.Selection.InsertBreak(7)
      }
      $firstSheet = $false
      $word.Selection.TypeText($sheet.Name)
      $word.Selection.TypeParagraph()
      $usedRange.Copy() | Out-Null
      $word.Selection.Paste()
      $word.Selection.TypeParagraph()
      Release-ComObject $usedRange
      Release-ComObject $sheet
    }

    $document.SaveAs2($DestinationPath, 16)
  }
  finally {
    if ($document) { try { $document.Close($false) } catch {} }
    if ($word) { try { $word.Quit() } catch {} }
    if ($workbook) { try { $workbook.Close($false) } catch {} }
    if ($excel) { try { $excel.Quit() } catch {} }
    Release-ComObject $document
    Release-ComObject $word
    Release-ComObject $workbook
    Release-ComObject $excel
  }
}

$inputExtension = [System.IO.Path]::GetExtension($InputPath).ToLowerInvariant()
$tempDir = [System.IO.Path]::GetDirectoryName($InputPath)
$tempHtml = [System.IO.Path]::Combine($tempDir, ([System.Guid]::NewGuid().ToString() + '.html'))

try {
  switch ($TargetKind) {
    'pdf' {
      switch ($inputExtension) {
        '.doc' { Convert-WordFile -SourcePath $InputPath -DestinationPath $OutputPath -Format 'pdf' }
        '.docx' { Convert-WordFile -SourcePath $InputPath -DestinationPath $OutputPath -Format 'pdf' }
        '.xls' { Convert-ExcelFile -SourcePath $InputPath -DestinationPath $OutputPath -Format 'pdf' }
        '.xlsx' { Convert-ExcelFile -SourcePath $InputPath -DestinationPath $OutputPath -Format 'pdf' }
        '.pdf' { Copy-Item -LiteralPath $InputPath -Destination $OutputPath -Force }
        default { throw "Unsupported source type for PDF conversion: $inputExtension" }
      }
    }
    'word' {
      switch ($inputExtension) {
        '.doc' { Convert-WordFile -SourcePath $InputPath -DestinationPath $OutputPath -Format 'docx' }
        '.docx' { Copy-Item -LiteralPath $InputPath -Destination $OutputPath -Force }
        '.pdf' { Convert-WordFile -SourcePath $InputPath -DestinationPath $OutputPath -Format 'docx' }
        '.xls' { Convert-ExcelToWord -SourcePath $InputPath -DestinationPath $OutputPath }
        '.xlsx' { Convert-ExcelToWord -SourcePath $InputPath -DestinationPath $OutputPath }
        default { throw "Unsupported source type for Word conversion: $inputExtension" }
      }
    }
    'excel' {
      switch ($inputExtension) {
        '.xls' { Convert-ExcelFile -SourcePath $InputPath -DestinationPath $OutputPath -Format 'xlsx' }
        '.xlsx' { Copy-Item -LiteralPath $InputPath -Destination $OutputPath -Force }
        '.doc' { Convert-WordFile -SourcePath $InputPath -DestinationPath $tempHtml -Format 'filteredhtml'; Convert-ExcelFile -SourcePath $tempHtml -DestinationPath $OutputPath -Format 'xlsx' }
        '.docx' { Convert-WordFile -SourcePath $InputPath -DestinationPath $tempHtml -Format 'filteredhtml'; Convert-ExcelFile -SourcePath $tempHtml -DestinationPath $OutputPath -Format 'xlsx' }
        '.pdf' { Convert-WordFile -SourcePath $InputPath -DestinationPath $tempHtml -Format 'filteredhtml'; Convert-ExcelFile -SourcePath $tempHtml -DestinationPath $OutputPath -Format 'xlsx' }
        default { throw "Unsupported source type for Excel conversion: $inputExtension" }
      }
    }
  }
}
finally {
  if (Test-Path -LiteralPath $tempHtml) {
    Remove-Item -LiteralPath $tempHtml -Force -ErrorAction SilentlyContinue
  }
}
""";
    }

    private enum ConversionTarget {
        PDF("pdf", ".pdf", "PDF"),
        WORD("word", ".docx", "Word"),
        EXCEL("excel", ".xlsx", "Excel");

        private final String id;
        private final String extension;
        private final String label;

        ConversionTarget(String id, String extension, String label) {
            this.id = id;
            this.extension = extension;
            this.label = label;
        }

        private static ConversionTarget from(String raw) {
            if (!StringUtils.hasText(raw)) {
                throw new IllegalArgumentException("请选择目标格式");
            }
            return switch (raw.trim().toLowerCase(Locale.ROOT)) {
                case "pdf" -> PDF;
                case "word", "doc", "docx" -> WORD;
                case "excel", "xls", "xlsx" -> EXCEL;
                default -> throw new IllegalArgumentException("不支持的目标格式");
            };
        }
    }

    private enum SourceType {
        WORD("word"),
        EXCEL("excel"),
        PDF("pdf"),
        UNKNOWN("unknown");

        private final String label;

        SourceType(String label) {
            this.label = label;
        }

        private static SourceType fromFilename(String originalFilename) {
            String ext = extensionOf(originalFilename);
            return switch (ext) {
                case ".doc", ".docx" -> WORD;
                case ".xls", ".xlsx" -> EXCEL;
                case ".pdf" -> PDF;
                default -> UNKNOWN;
            };
        }

        private String primaryExtension(String originalFilename) {
            String ext = extensionOf(originalFilename);
            return StringUtils.hasText(ext) ? ext : switch (this) {
                case WORD -> ".docx";
                case EXCEL -> ".xlsx";
                case PDF -> ".pdf";
                case UNKNOWN -> "";
            };
        }

        private static String extensionOf(String filename) {
            if (!StringUtils.hasText(filename) || !filename.contains(".")) {
                return "";
            }
            return filename.substring(filename.lastIndexOf('.')).toLowerCase(Locale.ROOT);
        }
    }
}
