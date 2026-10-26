package com.school.crm.model.entity;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "weekly_schedules",
        uniqueConstraints = @UniqueConstraint(columnNames = {"group_id", "day_of_week", "time"})
)
public class WeeklySchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private SchoolGroup group;

    @Column(name = "day_of_week", nullable = false)
    private int dayOfWeek;

    @Column(nullable = false)
    private String time;

    @Column(nullable = false)
    private String topic;

    @Column(nullable = false)
    private double duration = 1;

    @OneToMany(mappedBy = "weeklySchedule")
    private List<Lesson> lessons = new ArrayList<>();

    public Long getId() { return id; }
    public SchoolGroup getGroup() { return group; }
    public void setGroup(SchoolGroup group) { this.group = group; }
    public int getDayOfWeek() { return dayOfWeek; }
    public void setDayOfWeek(int dayOfWeek) { this.dayOfWeek = dayOfWeek; }
    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }
    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }
    public double getDuration() { return duration; }
    public void setDuration(double duration) { this.duration = duration; }
}
