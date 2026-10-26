package com.school.crm.repository;

import com.school.crm.model.entity.Lesson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface LessonRepository extends JpaRepository<Lesson, Long> {
    List<Lesson> findByStudentId(Long studentId);
    List<Lesson> findAllByGroup_Teacher_Id(Long teacherId);
    boolean existsByGroup_Id(Long groupId);
    boolean existsByWeeklySchedule_IdAndDate(Long weeklyScheduleId, java.time.LocalDate date);
    List<Lesson> findAllByStatusAndDateLessThanEqual(String status, java.time.LocalDate date);
    boolean existsByWeeklySchedule_Id(Long weeklyScheduleId);
}
