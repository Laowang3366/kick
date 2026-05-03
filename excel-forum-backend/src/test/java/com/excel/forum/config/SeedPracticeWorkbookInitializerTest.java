package com.excel.forum.config;

import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class SeedPracticeWorkbookInitializerTest {

    @TempDir
    Path tempDir;

    @Test
    void runCreatesSeedPracticeWorkbooks() throws Exception {
        FileStorageConfig config = new FileStorageConfig();
        config.setType("local");
        config.getLocal().setPath(tempDir.toString());

        SeedPracticeWorkbookInitializer initializer = new SeedPracticeWorkbookInitializer(config);

        initializer.run(null);

        try (Stream<Path> seedFiles = Files.list(tempDir.resolve("seed/practice"))) {
            assertThat(seedFiles.toList()).hasSize(8);
        }
        Path workbookPath = tempDir.resolve("seed/practice/sum-quarter-sales.xlsx");
        assertThat(workbookPath).exists();

        try (InputStream inputStream = Files.newInputStream(workbookPath);
             Workbook workbook = WorkbookFactory.create(inputStream)) {
            Sheet sheet = workbook.getSheet("练习");
            assertThat(sheet).isNotNull();
            assertThat(sheet.getRow(0).getCell(0).getStringCellValue()).contains("SUM 练习");
            assertThat(sheet.getRow(1).getCell(0).getStringCellValue()).isEqualTo("门店");
            assertThat(sheet.getRow(1).getCell(5).getStringCellValue()).isEqualTo("季度销售额");
            assertThat(sheet.getRow(2).getCell(5).getCellType()).isEqualTo(CellType.BLANK);
        }
    }

    @Test
    void runSkipsNonLocalStorage() throws Exception {
        FileStorageConfig config = new FileStorageConfig();
        config.setType("minio");
        config.getLocal().setPath(tempDir.toString());

        SeedPracticeWorkbookInitializer initializer = new SeedPracticeWorkbookInitializer(config);

        initializer.run(null);

        assertThat(tempDir.resolve("seed/practice")).doesNotExist();
    }
}
