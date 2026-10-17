package com.school.crm.repository;

import com.school.crm.model.entity.StudentDeletionNotice;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface StudentDeletionNoticeRepository extends JpaRepository<StudentDeletionNotice, Long> {
    List<StudentDeletionNotice> findTop50ByIdGreaterThanOrderByIdAsc(Long afterId);
    java.util.Optional<StudentDeletionNotice> findFirstByOrderByIdDesc();
}
