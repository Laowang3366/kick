package com.excel.forum.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@ConditionalOnProperty(name = "app.db.legacy-initializer.enabled", havingValue = "true")
@RequiredArgsConstructor
public class DatabaseInitializer {
    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void init() {
        try {
            log.info("开始检查数据库结构...");
            
            try {
                jdbcTemplate.execute("ALTER TABLE user ADD COLUMN is_online BOOLEAN DEFAULT FALSE COMMENT '是否在线'");
                log.info("添加 is_online 字段成功");
            } catch (Exception e) {
                String message = e.getMessage();
                if (message != null && (message.contains("Duplicate column name") || message.contains("already exists"))) {
                    log.info("is_online 字段已存在");
                } else {
                    log.warn("添加 is_online 字段时出现异常: {}", message);
                }
            }
            
            try {
                jdbcTemplate.execute("ALTER TABLE user ADD COLUMN last_active_time DATETIME COMMENT '最后活跃时间'");
                log.info("添加 last_active_time 字段成功");
            } catch (Exception e) {
                String message = e.getMessage();
                if (message != null && (message.contains("Duplicate column name") || message.contains("already exists"))) {
                    log.info("last_active_time 字段已存在");
                } else {
                    log.warn("添加 last_active_time 字段时出现异常: {}", message);
                }
            }
            
            try {
                jdbcTemplate.execute("CREATE INDEX idx_is_online ON user(is_online)");
                log.info("创建 idx_is_online 索引成功");
            } catch (Exception e) {
                String message = e.getMessage();
                if (message != null && (message.contains("Duplicate key name") || message.contains("already exists"))) {
                    log.info("idx_is_online 索引已存在");
                } else {
                    log.warn("创建 idx_is_online 索引时出现异常: {}", message);
                }
            }
            
            try {
                jdbcTemplate.execute("CREATE INDEX idx_last_active_time ON user(last_active_time)");
                log.info("创建 idx_last_active_time 索引成功");
            } catch (Exception e) {
                String message = e.getMessage();
                if (message != null && (message.contains("Duplicate key name") || message.contains("already exists"))) {
                    log.info("idx_last_active_time 索引已存在");
                } else {
                    log.warn("创建 idx_last_active_time 索引时出现异常: {}", message);
                }
            }
            
            try {
                jdbcTemplate.execute("ALTER TABLE post ADD COLUMN is_locked TINYINT(1) DEFAULT 0 COMMENT '是否锁定'");
                log.info("添加 is_locked 字段成功");
            } catch (Exception e) {
                String message = e.getMessage();
                if (message != null && (message.contains("Duplicate column name") || message.contains("already exists"))) {
                    log.info("is_locked 字段已存在");
                } else {
                    log.warn("添加 is_locked 字段时出现异常: {}", e.toString());
                }
            }
            
            try {
                jdbcTemplate.execute("ALTER TABLE post ADD COLUMN is_top TINYINT(1) DEFAULT 0 COMMENT '是否置顶'");
                log.info("添加 is_top 字段成功");
            } catch (Exception e) {
                String message = e.getMessage();
                if (message != null && (message.contains("Duplicate column name") || message.contains("already exists"))) {
                    log.info("is_top 字段已存在");
                } else {
                    log.warn("添加 is_top 字段时出现异常: {}", e.toString());
                }
            }
            
            try {
                jdbcTemplate.execute("ALTER TABLE post ADD COLUMN is_essence TINYINT(1) DEFAULT 0 COMMENT '是否精华'");
                log.info("添加 is_essence 字段成功");
            } catch (Exception e) {
                String message = e.getMessage();
                if (message != null && (message.contains("Duplicate column name") || message.contains("already exists"))) {
                    log.info("is_essence 字段已存在");
                } else {
                    log.warn("添加 is_essence 字段时出现异常: {}", e.toString());
                }
            }
            
            try {
                jdbcTemplate.execute("ALTER TABLE post ADD COLUMN attachments TEXT COMMENT '附件JSON'");
                log.info("添加 attachments 字段成功");
            } catch (Exception e) {
                String message = e.getMessage();
                if (message != null && (message.contains("Duplicate column name") || message.contains("already exists"))) {
                    log.info("attachments 字段已存在");
                } else {
                    log.warn("添加 attachments 字段时出现异常: {}", e.toString());
                }
            }
            
            try {
                jdbcTemplate.execute("ALTER TABLE post ADD COLUMN tags TEXT COMMENT '标签JSON'");
                log.info("添加 tags 字段成功");
            } catch (Exception e) {
                String message = e.getMessage();
                if (message != null && (message.contains("Duplicate column name") || message.contains("already exists"))) {
                    log.info("tags 字段已存在");
                } else {
                    log.warn("添加 tags 字段时出现异常: {}", e.toString());
                }
            }
            
            try {
                jdbcTemplate.execute(
                    "CREATE TABLE IF NOT EXISTS chat_message (" +
                    "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                    "user_id BIGINT COMMENT '用户ID', " +
                    "username VARCHAR(50) COMMENT '用户名', " +
                    "avatar VARCHAR(255) COMMENT '头像', " +
                    "content TEXT COMMENT '消息内容', " +
                    "create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间', " +
                    "INDEX idx_create_time (create_time)" +
                    ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='聊天消息表'"
                );
                log.info("创建 chat_message 表成功");
            } catch (Exception e) {
                String message = e.getMessage();
                if (message != null && message.contains("already exists")) {
                    log.info("chat_message 表已存在");
                } else {
                    log.warn("创建 chat_message 表时出现异常: {}", message);
                }
            }
            
            try {
                jdbcTemplate.execute(
                    "CREATE TABLE IF NOT EXISTS notification (" +
                    "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                    "user_id BIGINT NOT NULL COMMENT '用户ID', " +
                    "type VARCHAR(20) NOT NULL COMMENT '通知类型', " +
                    "content TEXT NOT NULL COMMENT '通知内容', " +
                    "related_id BIGINT COMMENT '关联ID', " +
                    "sender_id BIGINT COMMENT '发送者ID', " +
                    "is_read TINYINT DEFAULT 0 COMMENT '是否已读', " +
                    "create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间', " +
                    "INDEX idx_user_id (user_id), " +
                    "INDEX idx_is_read (is_read), " +
                    "INDEX idx_create_time (create_time)" +
                    ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知表'"
                );
                log.info("创建 notification 表成功");
            } catch (Exception e) {
                String message = e.getMessage();
                if (message != null && message.contains("already exists")) {
                    log.info("notification 表已存在");
                } else {
                    log.warn("创建 notification 表时出现异常: {}", message);
                }
            }
            
            try {
                jdbcTemplate.execute("ALTER TABLE notification ADD COLUMN sender_id BIGINT COMMENT '发送者ID'");
                log.info("添加 sender_id 字段成功");
            } catch (Exception e) {
                String message = e.getMessage();
                if (message != null && (message.contains("Duplicate column name") || message.contains("already exists"))) {
                    log.info("sender_id 字段已存在");
                } else {
                    log.warn("添加 sender_id 字段时出现异常: {}", message);
                }
            }
            
            try {
                jdbcTemplate.execute(
                    "CREATE TABLE IF NOT EXISTS message (" +
                    "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                    "from_user_id BIGINT NOT NULL COMMENT '发送者ID', " +
                    "to_user_id BIGINT NOT NULL COMMENT '接收者ID', " +
                    "content TEXT NOT NULL COMMENT '消息内容', " +
                    "is_read TINYINT DEFAULT 0 COMMENT '是否已读', " +
                    "create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间', " +
                    "INDEX idx_from_user_id (from_user_id), " +
                    "INDEX idx_to_user_id (to_user_id), " +
                    "INDEX idx_is_read (is_read), " +
                    "INDEX idx_create_time (create_time)" +
                    ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='私信表'"
                );
                log.info("创建 message 表成功");
            } catch (Exception e) {
                String message = e.getMessage();
                if (message != null && message.contains("already exists")) {
                    log.info("message 表已存在");
                } else {
                    log.warn("创建 message 表时出现异常: {}", message);
                }
            }
            
            try {
                jdbcTemplate.execute("ALTER TABLE user ADD COLUMN managed_categories TEXT COMMENT '管理的板块ID列表(JSON格式)'");
                log.info("添加 managed_categories 字段成功");
            } catch (Exception e) {
                String message = e.getMessage();
                if (message != null && (message.contains("Duplicate column name") || message.contains("already exists"))) {
                    log.info("managed_categories 字段已存在");
                } else {
                    log.warn("添加 managed_categories 字段时出现异常: {}", message);
                }
            }

            try {
                jdbcTemplate.execute("ALTER TABLE post ADD COLUMN review_status VARCHAR(20) DEFAULT 'approved' COMMENT '审核状态'");
                log.info("添加 review_status 字段成功");
            } catch (Exception e) {
                String message = e.getMessage();
                if (message != null && (message.contains("Duplicate column name") || message.contains("already exists"))) {
                    log.info("review_status 字段已存在");
                } else {
                    log.warn("添加 review_status 字段时出现异常: {}", message);
                }
            }

            try {
                jdbcTemplate.execute("ALTER TABLE post ADD COLUMN review_reason TEXT COMMENT '审核原因'");
                log.info("添加 review_reason 字段成功");
            } catch (Exception e) {
                String message = e.getMessage();
                if (message != null && (message.contains("Duplicate column name") || message.contains("already exists"))) {
                    log.info("review_reason 字段已存在");
                } else {
                    log.warn("添加 review_reason 字段时出现异常: {}", message);
                }
            }

            try {
                jdbcTemplate.execute(
                    "CREATE TABLE IF NOT EXISTS points_rule (" +
                    "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                    "name VARCHAR(100) NOT NULL COMMENT '规则名称', " +
                    "description TEXT COMMENT '描述', " +
                    "points INT DEFAULT 0 COMMENT '积分变化', " +
                    "type VARCHAR(20) DEFAULT 'daily' COMMENT '类型: daily/once', " +
                    "enabled TINYINT DEFAULT 1 COMMENT '是否启用', " +
                    "create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间', " +
                    "update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'" +
                    ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='积分规则表'"
                );
                log.info("创建 points_rule 表成功");
            } catch (Exception e) {
                String message = e.getMessage();
                if (message != null && message.contains("already exists")) {
                    log.info("points_rule 表已存在");
                } else {
                    log.warn("创建 points_rule 表时出现异常: {}", message);
                }
            }

            try {
                jdbcTemplate.execute(
                    "CREATE TABLE IF NOT EXISTS points_record (" +
                    "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                    "user_id BIGINT NOT NULL COMMENT '用户ID', " +
                    "rule_name VARCHAR(100) COMMENT '规则名称', " +
                    "change INT DEFAULT 0 COMMENT '积分变化', " +
                    "balance INT DEFAULT 0 COMMENT '变动后余额', " +
                    "description TEXT COMMENT '描述', " +
                    "create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间', " +
                    "INDEX idx_user_id (user_id), " +
                    "INDEX idx_create_time (create_time)" +
                    ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='积分记录表'"
                );
                log.info("创建 points_record 表成功");
            } catch (Exception e) {
                String message = e.getMessage();
                if (message != null && message.contains("already exists")) {
                    log.info("points_record 表已存在");
                } else {
                    log.warn("创建 points_record 表时出现异常: {}", message);
                }
            }

            try {
                jdbcTemplate.execute(
                    "CREATE TABLE IF NOT EXISTS question (" +
                    "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                    "title TEXT NOT NULL COMMENT '题目内容', " +
                    "type VARCHAR(20) NOT NULL COMMENT '类型: single/multiple/judge/fill', " +
                    "category_id BIGINT COMMENT '分类ID', " +
                    "options TEXT COMMENT '选项JSON', " +
                    "answer TEXT NOT NULL COMMENT '答案', " +
                    "difficulty INT DEFAULT 3 COMMENT '难度1-5', " +
                    "points INT DEFAULT 10 COMMENT '分值', " +
                    "explanation TEXT COMMENT '解析', " +
                    "enabled TINYINT DEFAULT 1 COMMENT '是否启用', " +
                    "create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间', " +
                    "update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间', " +
                    "INDEX idx_type (type), " +
                    "INDEX idx_category_id (category_id)" +
                    ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='题目表'"
                );
                log.info("创建 question 表成功");
            } catch (Exception e) {
                String message = e.getMessage();
                if (message != null && message.contains("already exists")) {
                    log.info("question 表已存在");
                } else {
                    log.warn("创建 question 表时出现异常: {}", message);
                }
            }

            try {
                jdbcTemplate.execute(
                    "CREATE TABLE IF NOT EXISTS category_follow (" +
                    "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                    "user_id BIGINT NOT NULL COMMENT '关注者', " +
                    "category_id BIGINT NOT NULL COMMENT '关注的板块', " +
                    "create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间', " +
                    "UNIQUE KEY uk_user_category (user_id, category_id), " +
                    "INDEX idx_category_id (category_id), " +
                    "FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE, " +
                    "FOREIGN KEY (category_id) REFERENCES category(id) ON DELETE CASCADE" +
                    ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='板块关注表'"
                );
                log.info("创建 category_follow 表成功");
            } catch (Exception e) {
                String message = e.getMessage();
                if (message != null && message.contains("already exists")) {
                    log.info("category_follow 表已存在");
                } else {
                    log.warn("创建 category_follow 表时出现异常: {}", message);
                }
            }

            try {
                jdbcTemplate.execute(
                    "CREATE TABLE IF NOT EXISTS site_notification (" +
                    "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                    "title VARCHAR(200) NOT NULL COMMENT '标题', " +
                    "content TEXT NOT NULL COMMENT '内容', " +
                    "type VARCHAR(20) DEFAULT 'system' COMMENT '类型: system/activity/update/urgent', " +
                    "status VARCHAR(20) DEFAULT 'draft' COMMENT '状态: draft/sent', " +
                    "target_type VARCHAR(20) DEFAULT 'all' COMMENT '目标类型: all/role', " +
                    "target_roles VARCHAR(100) COMMENT '目标角色', " +
                    "read_count INT DEFAULT 0 COMMENT '阅读数', " +
                    "total_count INT DEFAULT 0 COMMENT '总接收数', " +
                    "created_by BIGINT COMMENT '创建者ID', " +
                    "send_time DATETIME COMMENT '发送时间', " +
                    "create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间', " +
                    "update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间', " +
                    "INDEX idx_status (status), " +
                    "INDEX idx_type (type)" +
                    ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='网站通知表'"
                );
                log.info("创建 site_notification 表成功");
            } catch (Exception e) {
                String message = e.getMessage();
                if (message != null && message.contains("already exists")) {
                    log.info("site_notification 表已存在");
                } else {
                    log.warn("创建 site_notification 表时出现异常: {}", message);
                }
            }

            // 添加 User 隐私设置字段

            try {
                jdbcTemplate.execute("ALTER TABLE notification ADD COLUMN reply_id BIGINT COMMENT '关联回复ID'");
                log.info("添加 reply_id 字段成功");
            } catch (Exception e) {
                String message = e.getMessage();
                if (message != null && (message.contains("Duplicate column name") || message.contains("already exists"))) {
                    log.info("reply_id 字段已存在");
                } else {
                    log.warn("添加 reply_id 字段时出现异常: {}", message);
                }
            }
            String[] userPrivacyColumns = {
                "ALTER TABLE user ADD COLUMN public_profile TINYINT(1) DEFAULT 1 COMMENT '是否公开资料'",
                "ALTER TABLE user ADD COLUMN show_online_status TINYINT(1) DEFAULT 1 COMMENT '是否显示在线状态'",
                "ALTER TABLE user ADD COLUMN allow_messages TINYINT(1) DEFAULT 1 COMMENT '是否允许私信'",
                "ALTER TABLE user ADD COLUMN show_following TINYINT(1) DEFAULT 1 COMMENT '是否显示关注列表'",
                "ALTER TABLE user ADD COLUMN show_followers TINYINT(1) DEFAULT 1 COMMENT '是否显示粉丝列表'"
            };
            for (String sql : userPrivacyColumns) {
                try {
                    jdbcTemplate.execute(sql);
                    log.info("添加隐私设置字段成功");
                } catch (Exception e) {
                    String message = e.getMessage();
                    if (message != null && (message.contains("Duplicate column name") || message.contains("already exists"))) {
                        // 字段已存在
                    } else {
                        log.warn("添加隐私设置字段时出现异常: {}", message);
                    }
                }
            }

            log.info("数据库结构检查完成");
        } catch (Exception e) {
            log.error("数据库结构更新失败", e);
        }
    }
}
