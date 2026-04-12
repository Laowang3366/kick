package com.excel.forum.entity.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Data
public class ExcelTemplateExpectedSnapshot {
    private List<String> requiredSheets = new ArrayList<>();
    private Map<String, Object> cellValues = new LinkedHashMap<>();
    private Map<String, List<List<Object>>> rangeValues = new LinkedHashMap<>();
    private Map<String, List<List<String>>> rangeFormulas = new LinkedHashMap<>();
    private Map<String, List<String>> headerValues = new LinkedHashMap<>();
}
