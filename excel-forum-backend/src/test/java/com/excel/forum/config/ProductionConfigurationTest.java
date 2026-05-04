package com.excel.forum.config;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class ProductionConfigurationTest {

    @Test
    void productionConfigDoesNotWriteMybatisSqlToStdout() throws Exception {
        String applicationYaml = Files.readString(Path.of("src/main/resources/application.yml"));

        assertThat(applicationYaml).doesNotContain("org.apache.ibatis.logging.stdout.StdOutImpl");
        assertThat(applicationYaml).contains("org.apache.ibatis.logging.nologging.NoLoggingImpl");
    }
}
