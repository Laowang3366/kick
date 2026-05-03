package com.excel.forum.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class SeedPracticeWorkbookInitializer implements ApplicationRunner {
    private static final String LOCAL_STORAGE_TYPE = "local";
    private static final String SEED_DIR = "seed/practice";

    private final FileStorageConfig fileStorageConfig;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (!LOCAL_STORAGE_TYPE.equalsIgnoreCase(fileStorageConfig.getType())) {
            return;
        }
        String uploadDir = fileStorageConfig.getLocal().getPath();
        if (!StringUtils.hasText(uploadDir)) {
            return;
        }

        Path seedDir = Paths.get(uploadDir).resolve(SEED_DIR);
        Files.createDirectories(seedDir);

        for (SeedWorkbook seedWorkbook : seedWorkbooks()) {
            Path target = seedDir.resolve(seedWorkbook.fileName());
            if (Files.exists(target)) {
                continue;
            }
            try (Workbook workbook = new XSSFWorkbook();
                 OutputStream outputStream = Files.newOutputStream(target)) {
                seedWorkbook.writer().write(workbook);
                workbook.write(outputStream);
            }
            log.info("Created seed practice workbook: {}", target);
        }
    }

    private List<SeedWorkbook> seedWorkbooks() {
        return List.of(
                new SeedWorkbook("sum-quarter-sales.xlsx", this::writeSumQuarterSales),
                new SeedWorkbook("average-score-review.xlsx", this::writeAverageScoreReview),
                new SeedWorkbook("countif-attendance.xlsx", this::writeCountifAttendance),
                new SeedWorkbook("sumif-channel-sales.xlsx", this::writeSumifChannelSales),
                new SeedWorkbook("if-risk-flag.xlsx", this::writeIfRiskFlag),
                new SeedWorkbook("vlookup-department.xlsx", this::writeVlookupDepartment),
                new SeedWorkbook("left-code-category.xlsx", this::writeLeftCodeCategory),
                new SeedWorkbook("days-contract-duration.xlsx", this::writeDaysContractDuration)
        );
    }

    private void writeSumQuarterSales(Workbook workbook) {
        Sheet sheet = createPracticeSheet(workbook, "SUM 练习：在 F 列计算每个门店 1-3 月销售额合计。");
        writeRows(sheet, new Object[][] {
                {"门店", "城市", "1月", "2月", "3月", "季度销售额"},
                {"华东一店", "上海", 125000, 132000, 141000, null},
                {"华东二店", "杭州", 98000, 105000, 111000, null},
                {"华南一店", "广州", 143000, 139000, 152000, null},
                {"华北一店", "北京", 118000, 121000, 127000, null},
                {"西南一店", "成都", 76000, 84000, 93000, null}
        });
        styleSheet(sheet, 6);
    }

    private void writeAverageScoreReview(Workbook workbook) {
        Sheet sheet = createPracticeSheet(workbook, "AVERAGE 练习：在 F 列计算每位学员四次测评平均分。");
        writeRows(sheet, new Object[][] {
                {"学员", "部门", "测评1", "测评2", "测评3", "平均分"},
                {"陈杰", "销售", 86, 91, 88, null},
                {"李宁", "运营", 74, 82, 79, null},
                {"王雨", "财务", 92, 95, 90, null},
                {"赵敏", "客服", 68, 72, 75, null},
                {"周一凡", "市场", 81, 84, 87, null}
        });
        styleSheet(sheet, 6);
    }

    private void writeCountifAttendance(Workbook workbook) {
        Sheet sheet = createPracticeSheet(workbook, "COUNTIF 练习：在 F 列统计每位员工 1-4 月达标次数，1 表示达标。");
        writeRows(sheet, new Object[][] {
                {"员工", "1月", "2月", "3月", "4月", "达标次数"},
                {"陈杰", 1, 1, 0, 1, null},
                {"李宁", 0, 1, 1, 1, null},
                {"王雨", 1, 1, 1, 1, null},
                {"赵敏", 0, 0, 1, 0, null},
                {"周一凡", 1, 0, 1, 1, null}
        });
        styleSheet(sheet, 6);
    }

    private void writeSumifChannelSales(Workbook workbook) {
        Sheet sheet = createPracticeSheet(workbook, "SUMIF 练习：在 H 列按渠道汇总销售额。");
        writeRows(sheet, new Object[][] {
                {"日期", "渠道", "负责人", "销售额", null, null, "渠道", "渠道销售额"},
                {"2026-04-01", "线上", "陈杰", 18500, null, null, "线上", null},
                {"2026-04-02", "门店", "李宁", 12600, null, null, "门店", null},
                {"2026-04-03", "代理", "王雨", 9800, null, null, "代理", null},
                {"2026-04-04", "线上", "赵敏", 21300, null, null, null, null},
                {"2026-04-05", "门店", "周一凡", 15700, null, null, null, null},
                {"2026-04-06", "线上", "陈杰", 14200, null, null, null, null},
                {"2026-04-07", "代理", "王雨", 11600, null, null, null, null},
                {"2026-04-08", "门店", "李宁", 10400, null, null, null, null}
        });
        styleSheet(sheet, 8);
    }

    private void writeIfRiskFlag(Workbook workbook) {
        Sheet sheet = createPracticeSheet(workbook, "IF / OR 练习：在 E 列标记是否优先跟进。逾期天数 >= 10 或未付金额 >= 50000 时填 1，否则填 0。");
        writeRows(sheet, new Object[][] {
                {"订单号", "客户", "逾期天数", "未付金额", "优先跟进"},
                {"SO-1001", "青木贸易", 3, 18000, null},
                {"SO-1002", "云川科技", 12, 24000, null},
                {"SO-1003", "北辰零售", 5, 68000, null},
                {"SO-1004", "海源制造", 0, 12000, null},
                {"SO-1005", "明锐服务", 18, 72000, null},
                {"SO-1006", "星禾供应链", 9, 49000, null}
        });
        styleSheet(sheet, 5);
    }

    private void writeVlookupDepartment(Workbook workbook) {
        Sheet practice = createPracticeSheet(workbook, "VLOOKUP 练习：在 C 列根据员工编号匹配部门。");
        writeRows(practice, new Object[][] {
                {"员工编号", "姓名", "部门"},
                {"E1004", "赵敏", null},
                {"E1001", "陈杰", null},
                {"E1005", "周一凡", null},
                {"E1002", "李宁", null},
                {"E1003", "王雨", null},
                {"E1006", "许航", null}
        });
        styleSheet(practice, 3);

        Sheet source = createNamedSheet(workbook, "名单", "员工编号、姓名和部门的基础名单，用于 VLOOKUP 匹配。");
        writeRows(source, new Object[][] {
                {"员工编号", "姓名", "部门"},
                {"E1001", "陈杰", "销售部"},
                {"E1002", "李宁", "运营部"},
                {"E1003", "王雨", "财务部"},
                {"E1004", "赵敏", "客服部"},
                {"E1005", "周一凡", "市场部"},
                {"E1006", "许航", "产品部"}
        });
        styleSheet(source, 3);
    }

    private void writeLeftCodeCategory(Workbook workbook) {
        Sheet sheet = createPracticeSheet(workbook, "LEFT 练习：在 B 列提取商品编码前两位作为品类代码。");
        writeRows(sheet, new Object[][] {
                {"商品编码", "品类代码"},
                {"FS-2026-001", null},
                {"OA-2026-014", null},
                {"EL-2026-088", null},
                {"FS-2026-102", null},
                {"HR-2026-055", null},
                {"EL-2026-143", null}
        });
        styleSheet(sheet, 2);
    }

    private void writeDaysContractDuration(Workbook workbook) {
        Sheet sheet = createPracticeSheet(workbook, "DAYS 练习：在 D 列计算合同结束日期与开始日期之间的天数。");
        writeRows(sheet, new Object[][] {
                {"合同", "开始日期", "结束日期", "履约天数"},
                {"A-2026-01", LocalDate.of(2026, 1, 5), LocalDate.of(2026, 2, 20), null},
                {"A-2026-02", LocalDate.of(2026, 2, 1), LocalDate.of(2026, 3, 15), null},
                {"A-2026-03", LocalDate.of(2026, 3, 12), LocalDate.of(2026, 5, 1), null},
                {"A-2026-04", LocalDate.of(2026, 4, 8), LocalDate.of(2026, 4, 30), null},
                {"A-2026-05", LocalDate.of(2026, 5, 3), LocalDate.of(2026, 6, 18), null}
        });
        styleSheet(sheet, 4);
    }

    private Sheet createPracticeSheet(Workbook workbook, String instruction) {
        return createNamedSheet(workbook, "练习", instruction);
    }

    private Sheet createNamedSheet(Workbook workbook, String sheetName, String instruction) {
        Sheet sheet = workbook.createSheet(sheetName);
        Row instructionRow = sheet.createRow(0);
        Cell instructionCell = instructionRow.createCell(0);
        instructionCell.setCellValue(instruction);
        sheet.createFreezePane(0, 2);
        return sheet;
    }

    private void writeRows(Sheet sheet, Object[][] rows) {
        Workbook workbook = sheet.getWorkbook();
        CellStyle dateStyle = workbook.createCellStyle();
        dateStyle.setDataFormat(workbook.getCreationHelper().createDataFormat().getFormat("yyyy-mm-dd"));
        for (int rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
            Row row = sheet.createRow(rowIndex + 1);
            Object[] values = rows[rowIndex];
            for (int columnIndex = 0; columnIndex < values.length; columnIndex += 1) {
                Cell cell = row.createCell(columnIndex);
                Object value = values[columnIndex];
                if (value instanceof Number number) {
                    cell.setCellValue(number.doubleValue());
                } else if (value instanceof LocalDate localDate) {
                    cell.setCellValue(localDate);
                    cell.setCellStyle(dateStyle);
                } else if (value != null) {
                    cell.setCellValue(String.valueOf(value));
                }
            }
        }
    }

    private void styleSheet(Sheet sheet, int columnCount) {
        Workbook workbook = sheet.getWorkbook();
        CellStyle instructionStyle = workbook.createCellStyle();
        Font instructionFont = workbook.createFont();
        instructionFont.setBold(true);
        instructionFont.setColor(IndexedColors.DARK_BLUE.getIndex());
        instructionStyle.setFont(instructionFont);
        instructionStyle.setWrapText(true);
        Row instructionRow = sheet.getRow(0);
        if (instructionRow != null && instructionRow.getCell(0) != null) {
            instructionRow.getCell(0).setCellStyle(instructionStyle);
        }

        CellStyle headerStyle = workbook.createCellStyle();
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerFont.setColor(IndexedColors.WHITE.getIndex());
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(IndexedColors.DARK_TEAL.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        headerStyle.setBorderBottom(BorderStyle.THIN);

        Row headerRow = sheet.getRow(1);
        if (headerRow != null) {
            for (int columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
                Cell cell = headerRow.getCell(columnIndex);
                if (cell != null) {
                    cell.setCellStyle(headerStyle);
                }
            }
        }

        for (int columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
            sheet.setColumnWidth(columnIndex, 16 * 256);
        }
        if (instructionRow != null) {
            instructionRow.setHeightInPoints(34);
        }
    }

    private record SeedWorkbook(String fileName, WorkbookWriter writer) {
    }

    @FunctionalInterface
    private interface WorkbookWriter {
        void write(Workbook workbook);
    }
}
