package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

public class V2__align_existing_schema extends BaseJavaMigration {

    @Override
    public void migrate(Context context) throws Exception {
        Connection connection = context.getConnection();

        addColumnIfMissing(connection, "user", "is_online",
                "ALTER TABLE `user` ADD COLUMN `is_online` TINYINT(1) DEFAULT 0 COMMENT '是否在线'");
        addColumnIfMissing(connection, "user", "last_active_time",
                "ALTER TABLE `user` ADD COLUMN `last_active_time` DATETIME DEFAULT NULL COMMENT '最后活跃时间'");
        addColumnIfMissing(connection, "user", "managed_categories",
                "ALTER TABLE `user` ADD COLUMN `managed_categories` TEXT DEFAULT NULL COMMENT '管理的板块ID列表(JSON格式)'");
        addColumnIfMissing(connection, "user", "public_profile",
                "ALTER TABLE `user` ADD COLUMN `public_profile` TINYINT(1) DEFAULT 1 COMMENT '是否公开资料'");
        addColumnIfMissing(connection, "user", "show_online_status",
                "ALTER TABLE `user` ADD COLUMN `show_online_status` TINYINT(1) DEFAULT 1 COMMENT '是否显示在线状态'");
        addColumnIfMissing(connection, "user", "allow_messages",
                "ALTER TABLE `user` ADD COLUMN `allow_messages` TINYINT(1) DEFAULT 1 COMMENT '是否允许私信'");
        addColumnIfMissing(connection, "user", "show_following",
                "ALTER TABLE `user` ADD COLUMN `show_following` TINYINT(1) DEFAULT 1 COMMENT '是否显示关注列表'");
        addColumnIfMissing(connection, "user", "show_followers",
                "ALTER TABLE `user` ADD COLUMN `show_followers` TINYINT(1) DEFAULT 1 COMMENT '是否显示粉丝列表'");
        addIndexIfMissing(connection, "user", "idx_is_online",
                "CREATE INDEX `idx_is_online` ON `user`(`is_online`)");
        addIndexIfMissing(connection, "user", "idx_last_active_time",
                "CREATE INDEX `idx_last_active_time` ON `user`(`last_active_time`)");

        addColumnIfMissing(connection, "post", "share_count",
                "ALTER TABLE `post` ADD COLUMN `share_count` INT DEFAULT 0");
        addColumnIfMissing(connection, "post", "favorite_count",
                "ALTER TABLE `post` ADD COLUMN `favorite_count` INT DEFAULT 0");
        addColumnIfMissing(connection, "post", "is_locked",
                "ALTER TABLE `post` ADD COLUMN `is_locked` TINYINT(1) DEFAULT 0 COMMENT '是否锁定'");
        addColumnIfMissing(connection, "post", "is_top",
                "ALTER TABLE `post` ADD COLUMN `is_top` TINYINT(1) DEFAULT 0 COMMENT '是否置顶'");
        addColumnIfMissing(connection, "post", "is_essence",
                "ALTER TABLE `post` ADD COLUMN `is_essence` TINYINT(1) DEFAULT 0 COMMENT '是否精华'");
        addColumnIfMissing(connection, "post", "attachments",
                "ALTER TABLE `post` ADD COLUMN `attachments` TEXT DEFAULT NULL COMMENT '附件JSON'");
        addColumnIfMissing(connection, "post", "tags",
                "ALTER TABLE `post` ADD COLUMN `tags` TEXT DEFAULT NULL COMMENT '标签JSON'");
        addColumnIfMissing(connection, "post", "review_status",
                "ALTER TABLE `post` ADD COLUMN `review_status` VARCHAR(20) DEFAULT 'approved' COMMENT '审核状态'");
        addColumnIfMissing(connection, "post", "review_reason",
                "ALTER TABLE `post` ADD COLUMN `review_reason` TEXT DEFAULT NULL COMMENT '审核原因'");

        addColumnIfMissing(connection, "notification", "sender_id",
                "ALTER TABLE `notification` ADD COLUMN `sender_id` BIGINT DEFAULT NULL COMMENT '发送者ID'");
        addColumnIfMissing(connection, "notification", "reply_id",
                "ALTER TABLE `notification` ADD COLUMN `reply_id` BIGINT DEFAULT NULL COMMENT '关联回复ID'");

        createTableIfMissing(connection, "post_view",
                "CREATE TABLE `post_view` (" +
                        "`id` BIGINT NOT NULL AUTO_INCREMENT," +
                        "`post_id` BIGINT NOT NULL," +
                        "`user_id` BIGINT DEFAULT NULL," +
                        "`ip_address` VARCHAR(64) DEFAULT NULL," +
                        "`create_time` DATETIME DEFAULT CURRENT_TIMESTAMP," +
                        "PRIMARY KEY (`id`)," +
                        "INDEX `idx_post_view_post_id` (`post_id`)," +
                        "INDEX `idx_post_view_user_id` (`user_id`)," +
                        "INDEX `idx_post_view_create_time` (`create_time`)," +
                        "CONSTRAINT `fk_post_view_post` FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON DELETE CASCADE," +
                        "CONSTRAINT `fk_post_view_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE" +
                        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    }

    private void addColumnIfMissing(Connection connection, String tableName, String columnName, String sql) throws SQLException {
        DatabaseMetaData metaData = connection.getMetaData();
        String catalog = connection.getCatalog();
        try (ResultSet columns = metaData.getColumns(catalog, null, tableName, columnName)) {
            if (!columns.next()) {
                execute(connection, sql);
            }
        }
    }

    private void addIndexIfMissing(Connection connection, String tableName, String indexName, String sql) throws SQLException {
        DatabaseMetaData metaData = connection.getMetaData();
        String catalog = connection.getCatalog();
        try (ResultSet indexes = metaData.getIndexInfo(catalog, null, tableName, false, false)) {
            while (indexes.next()) {
                String existing = indexes.getString("INDEX_NAME");
                if (existing != null && existing.equalsIgnoreCase(indexName)) {
                    return;
                }
            }
        }
        execute(connection, sql);
    }

    private void createTableIfMissing(Connection connection, String tableName, String sql) throws SQLException {
        DatabaseMetaData metaData = connection.getMetaData();
        String catalog = connection.getCatalog();
        try (ResultSet tables = metaData.getTables(catalog, null, tableName, new String[]{"TABLE"})) {
            if (!tables.next()) {
                execute(connection, sql);
            }
        }
    }

    private void execute(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute(sql);
        }
    }
}
