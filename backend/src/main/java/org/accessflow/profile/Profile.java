package org.accessflow.profile;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "profiles")
public class Profile {
    @Id @Column(name = "user_id") private UUID userId;
    @Column(name = "given_name") private String givenName;
    @Column(name = "father_name") private String fatherName;
    @Column(name = "grandfather_name") private String grandfatherName;
    @Column(name = "birth_year") private Short birthYear;
    private String region;
    private String city;
    private String headline;
    private String summary;
    @JdbcTypeCode(SqlTypes.JSON) private List<Map<String, Object>> education = new ArrayList<>();
    @JdbcTypeCode(SqlTypes.JSON) private List<Map<String, Object>> experience = new ArrayList<>();
    @JdbcTypeCode(SqlTypes.JSON) private List<String> skills = new ArrayList<>();
    @JdbcTypeCode(SqlTypes.JSON) private List<String> languages = new ArrayList<>();
    /** PRIVATE: used only for the owner's own job filtering. Never included in employer-facing data. */
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "support_preferences") private List<String> supportPreferences = new ArrayList<>();
    @Column(name = "resume_file_id") private UUID resumeFileId;
    @Column(name = "completed_at") private Instant completedAt;
    @Column(name = "updated_at") private Instant updatedAt = Instant.now();

    protected Profile() {}

    public Profile(UUID userId) { this.userId = userId; }

    public UUID getUserId() { return userId; }
    public String getGivenName() { return givenName; }
    public String getFatherName() { return fatherName; }
    public String getGrandfatherName() { return grandfatherName; }
    public Short getBirthYear() { return birthYear; }
    public String getRegion() { return region; }
    public String getCity() { return city; }
    public String getHeadline() { return headline; }
    public String getSummary() { return summary; }
    public List<Map<String, Object>> getEducation() { return education; }
    public List<Map<String, Object>> getExperience() { return experience; }
    public List<String> getSkills() { return skills; }
    public List<String> getLanguages() { return languages; }
    public List<String> getSupportPreferences() { return supportPreferences; }
    public UUID getResumeFileId() { return resumeFileId; }
    public Instant getCompletedAt() { return completedAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setGivenName(String v) { givenName = v; }
    public void setFatherName(String v) { fatherName = v; }
    public void setGrandfatherName(String v) { grandfatherName = v; }
    public void setBirthYear(Short v) { birthYear = v; }
    public void setRegion(String v) { region = v; }
    public void setCity(String v) { city = v; }
    public void setHeadline(String v) { headline = v; }
    public void setSummary(String v) { summary = v; }
    public void setEducation(List<Map<String, Object>> v) { education = v; }
    public void setExperience(List<Map<String, Object>> v) { experience = v; }
    public void setSkills(List<String> v) { skills = v; }
    public void setLanguages(List<String> v) { languages = v; }
    public void setSupportPreferences(List<String> v) { supportPreferences = v; }
    public void setResumeFileId(UUID v) { resumeFileId = v; }
    public void markCompleted() { if (completedAt == null) completedAt = Instant.now(); }
    public void touch() { updatedAt = Instant.now(); }
}
