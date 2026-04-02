-- 添加分享次数和收藏次数字段到帖子表
ALTER TABLE post ADD COLUMN share_count INT DEFAULT 0 COMMENT '分享次数';
ALTER TABLE post ADD COLUMN favorite_count INT DEFAULT 0 COMMENT '收藏次数';

-- 添加帖子状态字段
ALTER TABLE post ADD COLUMN is_locked TINYINT(1) DEFAULT 0 COMMENT '是否锁定';
ALTER TABLE post ADD COLUMN is_top TINYINT(1) DEFAULT 0 COMMENT '是否置顶';
ALTER TABLE post ADD COLUMN is_essence TINYINT(1) DEFAULT 0 COMMENT '是否精华';

-- 创建帖子浏览记录表
CREATE TABLE IF NOT EXISTS post_view (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT NOT NULL COMMENT '帖子ID',
    user_id BIGINT COMMENT '用户ID',
    ip_address VARCHAR(50) COMMENT 'IP地址',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_post_id (post_id),
    INDEX idx_user_id (user_id),
    INDEX idx_ip_address (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='帖子浏览记录表';

-- 添加在线状态字段到用户表
ALTER TABLE user ADD COLUMN is_online BOOLEAN DEFAULT FALSE COMMENT '是否在线';
ALTER TABLE user ADD COLUMN last_active_time DATETIME COMMENT '最后活跃时间';

-- 创建索引以提高查询性能
CREATE INDEX idx_is_online ON user(is_online);
CREATE INDEX idx_last_active_time ON user(last_active_time);

-- 添加标签和附件字段到帖子表
ALTER TABLE post ADD COLUMN tags TEXT COMMENT '标签(JSON格式)';
ALTER TABLE post ADD COLUMN attachments TEXT COMMENT '附件(JSON格式)';

-- 添加隐私设置字段到用户表
ALTER TABLE user ADD COLUMN public_profile BOOLEAN DEFAULT TRUE COMMENT '公开个人资料';
ALTER TABLE user ADD COLUMN show_online_status BOOLEAN DEFAULT TRUE COMMENT '显示在线状态';
ALTER TABLE user ADD COLUMN allow_messages BOOLEAN DEFAULT TRUE COMMENT '允许私信';
ALTER TABLE user ADD COLUMN show_following BOOLEAN DEFAULT TRUE COMMENT '显示关注列表';
ALTER TABLE user ADD COLUMN show_followers BOOLEAN DEFAULT TRUE COMMENT '显示粉丝列表';
