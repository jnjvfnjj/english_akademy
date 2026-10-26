package com.school.crm.repository;

import com.school.crm.model.entity.WeeklySchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WeeklyScheduleRepository extends JpaRepository<WeeklySchedule, Long> {
    List<WeeklySchedule> findAllByGroup_Teacher_IdOrderByDayOfWeekAscTimeAsc(Long teacherId);
    boolean existsByGroup_IdAndDayOfWeekAndTime(Long groupId, int dayOfWeek, String time);
    boolean existsByGroup_Id(Long groupId);
}
