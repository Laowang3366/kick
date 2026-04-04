package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.excel.forum.entity.CheckinRecord;
import com.excel.forum.mapper.CheckinRecordMapper;
import com.excel.forum.service.CheckinService;
import com.excel.forum.service.ExperienceService;
import com.excel.forum.service.ExperienceRuleService;
import com.excel.forum.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CheckinServiceImpl implements CheckinService {
    public static final int MIN_EXP = 1;
    public static final int MAX_EXP = 20;

    private final CheckinRecordMapper checkinRecordMapper;
    private final ExperienceService experienceService;
    private final ExperienceRuleService experienceRuleService;
    private final UserService userService;

    @Override
    public Map<String, Object> getCheckinStatus(Long userId, String month) {
        LocalDate today = LocalDate.now();
        YearMonth targetMonth = parseMonth(month);

        CheckinRecord todayRecord = getTodayRecord(userId, today);
        List<CheckinRecord> monthRecords = listMonthRecords(userId, targetMonth);

        Map<String, Object> response = new HashMap<>();
        response.put("hasCheckedInToday", todayRecord != null);
        response.put("todayExp", todayRecord != null ? todayRecord.getGainedExp() : 0);
        response.put("continuousDays", calculateContinuousDays(userId, today));
        response.put("totalDays", countTotalDays(userId));
        response.put("totalExp", sumTotalExp(userId));
        response.put("checkinDates", monthRecords.stream().map(record -> record.getCheckinDate().toString()).toList());
        response.put("month", targetMonth.toString());
        response.put("expMin", MIN_EXP);
        response.put("expMax", MAX_EXP);
        response.put("expProgress", experienceService.getProgress(userService.getById(userId).getExp()));
        return response;
    }

    @Override
    @Transactional
    public Map<String, Object> performCheckin(Long userId) {
        LocalDate today = LocalDate.now();
        if (getTodayRecord(userId, today) != null) {
            throw new IllegalStateException("今天已经签到过了");
        }

        int gainedExp = experienceRuleService.resolveRandomExp(ExperienceService.BIZ_DAILY_CHECKIN, MIN_EXP, MAX_EXP);

        CheckinRecord record = new CheckinRecord();
        record.setUserId(userId);
        record.setCheckinDate(today);
        record.setGainedExp(gainedExp);
        try {
            checkinRecordMapper.insert(record);
        } catch (DuplicateKeyException ignored) {
            throw new IllegalStateException("今天已经签到过了");
        }

        experienceService.awardDailyCheckin(userId, today, gainedExp);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "签到成功");
        response.put("gainedExp", gainedExp);
        response.put("continuousDays", calculateContinuousDays(userId, today));
        response.put("totalDays", countTotalDays(userId));
        response.put("totalExp", sumTotalExp(userId));
        response.put("checkinDate", today.toString());
        response.put("expProgress", experienceService.getProgress(userService.getById(userId).getExp()));
        return response;
    }

    private CheckinRecord getTodayRecord(Long userId, LocalDate today) {
        QueryWrapper<CheckinRecord> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId).eq("checkin_date", today);
        return checkinRecordMapper.selectOne(queryWrapper);
    }

    private List<CheckinRecord> listMonthRecords(Long userId, YearMonth month) {
        QueryWrapper<CheckinRecord> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId)
                .between("checkin_date", month.atDay(1), month.atEndOfMonth())
                .orderByAsc("checkin_date");
        return checkinRecordMapper.selectList(queryWrapper);
    }

    private int calculateContinuousDays(Long userId, LocalDate today) {
        QueryWrapper<CheckinRecord> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId).le("checkin_date", today).orderByDesc("checkin_date");
        List<CheckinRecord> records = checkinRecordMapper.selectList(queryWrapper);
        int streak = 0;
        LocalDate cursor = today;
        for (CheckinRecord record : records) {
            if (record.getCheckinDate() == null) {
                continue;
            }
            if (record.getCheckinDate().isEqual(cursor)) {
                streak += 1;
                cursor = cursor.minusDays(1);
                continue;
            }
            if (record.getCheckinDate().isBefore(cursor)) {
                break;
            }
        }
        return streak;
    }

    private long countTotalDays(Long userId) {
        QueryWrapper<CheckinRecord> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId);
        return checkinRecordMapper.selectCount(queryWrapper);
    }

    private int sumTotalExp(Long userId) {
        QueryWrapper<CheckinRecord> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId).select("COALESCE(SUM(gained_exp), 0) AS total_exp");
        Map<String, Object> result = checkinRecordMapper.selectMaps(queryWrapper).stream().findFirst().orElse(Map.of());
        Object value = result.get("total_exp");
        if (value instanceof Number number) {
            return number.intValue();
        }
        return 0;
    }

    private YearMonth parseMonth(String month) {
        if (month == null || month.isBlank()) {
            return YearMonth.now();
        }
        try {
            return YearMonth.parse(month, DateTimeFormatter.ofPattern("yyyy-MM"));
        } catch (DateTimeParseException ignored) {
            return YearMonth.now();
        }
    }
}
