package com.school.crm.repository;

import com.school.crm.model.entity.SchoolGroup;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SchoolGroupRepository extends JpaRepository<SchoolGroup, Long> {
    List<SchoolGroup> findAllByOrderByTitleAsc();
    List<SchoolGroup> findAllByTeacher_IdOrderByTitleAsc(Long teacherId);
    boolean existsByTeacher_Id(Long teacherId);
}
