package com.excel.forum.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
@Component
@ConfigurationProperties(prefix = "experience")
public class ExperienceProperties {
    private Map<String, Integer> rules = new HashMap<>();
    private List<LevelRule> levels = new ArrayList<>();

    @Data
    public static class LevelRule {
        private Integer level;
        private String name;
        private Integer threshold;
    }
}
