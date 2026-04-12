package com.excel.forum.config;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.excel.forum.entity.Category;
import com.excel.forum.entity.User;
import com.excel.forum.mapper.CategoryMapper;
import com.excel.forum.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final CategoryMapper categoryMapper;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        initAdminUser();
        initCategories();
    }
    
    private void initAdminUser() {
        QueryWrapper<User> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("role", "admin");
        Long adminCount = userMapper.selectCount(queryWrapper);
        
        if (adminCount == 0) {
            log.info("开始初始化管理员账户...");
            
            User admin = new User();
            admin.setUsername("admin");
            admin.setEmail("admin@excelforum.com");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setRole("admin");
            admin.setStatus(0);
            admin.setLevel(1);
            admin.setPoints(0);
            admin.setExp(0);
            admin.setBio("系统管理员");
            
            userMapper.insert(admin);
            
            log.info("管理员账户初始化完成");
            log.warn("检测到系统使用默认管理员凭据初始化，仅限开发/演示环境使用");
            log.warn("默认管理员账户：admin");
            log.warn("请登录后立即修改默认管理员密码");
        } else {
            log.info("管理员账户已存在，跳过初始化");
        }
    }
    
    private void initCategories() {
        Long categoryCount = categoryMapper.selectCount(null);
        
        if (categoryCount == 0) {
            log.info("开始初始化分类数据...");
            
            List<Category> categories = new ArrayList<>();
            
            Category cat1 = new Category();
            cat1.setName("Excel基础");
            cat1.setDescription("Excel入门教程、基础操作、界面介绍等");
            cat1.setGroupName("入门提升");
            cat1.setSortOrder(1);
            categories.add(cat1);
            
            Category cat2 = new Category();
            cat2.setName("函数公式");
            cat2.setDescription("Excel函数、公式应用、计算技巧等");
            cat2.setGroupName("入门提升");
            cat2.setSortOrder(2);
            categories.add(cat2);
            
            Category cat3 = new Category();
            cat3.setName("数据透视表");
            cat3.setDescription("数据透视表创建、使用技巧、高级应用等");
            cat3.setGroupName("进阶应用");
            cat3.setSortOrder(3);
            categories.add(cat3);
            
            Category cat4 = new Category();
            cat4.setName("图表制作");
            cat4.setDescription("Excel图表、数据可视化、图表美化等");
            cat4.setGroupName("入门提升");
            cat4.setSortOrder(4);
            categories.add(cat4);
            
            Category cat5 = new Category();
            cat5.setName("VBA编程");
            cat5.setDescription("Excel VBA、宏编程、自动化处理等");
            cat5.setGroupName("进阶应用");
            cat5.setSortOrder(5);
            categories.add(cat5);
            
            Category cat6 = new Category();
            cat6.setName("Power Query");
            cat6.setDescription("Power Query数据处理、ETL、数据清洗等");
            cat6.setGroupName("进阶应用");
            cat6.setSortOrder(6);
            categories.add(cat6);
            
            Category cat7 = new Category();
            cat7.setName("Power Pivot");
            cat7.setDescription("Power Pivot数据建模、DAX公式等");
            cat7.setGroupName("进阶应用");
            cat7.setSortOrder(7);
            categories.add(cat7);
            
            Category cat8 = new Category();
            cat8.setName("数据分析");
            cat8.setDescription("数据分析方法、商业智能、报表制作等");
            cat8.setGroupName("进阶应用");
            cat8.setSortOrder(8);
            categories.add(cat8);
            
            Category cat9 = new Category();
            cat9.setName("模板分享");
            cat9.setDescription("Excel模板、实用工具、资源分享等");
            cat9.setGroupName("社区交流");
            cat9.setSortOrder(9);
            categories.add(cat9);
            
            Category cat10 = new Category();
            cat10.setName("问答互助");
            cat10.setDescription("Excel问题求助、经验分享、技术交流等");
            cat10.setGroupName("社区交流");
            cat10.setSortOrder(10);
            categories.add(cat10);
            
            categories.forEach(categoryMapper::insert);
            
            log.info("分类数据初始化完成，共插入 {} 条数据", categories.size());
        } else {
            log.info("分类数据已存在，跳过初始化");
        }
    }
}
