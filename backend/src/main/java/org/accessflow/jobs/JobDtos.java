package org.accessflow.jobs;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class JobDtos {
    private JobDtos() {}

    public record AccommodationDto(
            @Size(max = 12) List<String> categories,
            @Size(max = 2000) String workplaceAccommodations,
            @Size(max = 2000) String interviewArrangements,
            @Size(max = 2000) String flexibleWorking,
            @Size(max = 2000) String assistiveTechnology,
            @Size(max = 2000) String applicationAccessibility,
            @Size(max = 100) String contactName,
            @Email @Size(max = 254) String contactEmail,
            @Size(max = 20) String contactPhone) {}

    public record JobSummary(UUID id, String title, String organizationName, String summary, String plainSummary,
                             String region, String city, String workMode, String employmentType, LocalDate deadline,
                             long daysLeft, List<String> accommodations, boolean saved) {}

    public record CustomQuestion(String id, String label, String type, boolean required, List<String> options) {}

    public record JobDetail(UUID id, String title, String organizationName, String organizationDescription,
                            String summary, String plainSummary, String description, String region, String city,
                            String workMode, String employmentType, String salaryText, LocalDate deadline, long daysLeft,
                            String status, AccommodationDto accommodations, List<CustomQuestion> customQuestions,
                            boolean saved, boolean open) {}

    public record CustomQuestionInput(
            @NotBlank @Size(max = 300) String label,
            @NotBlank @Pattern(regexp = "text|textarea|radio") String type,
            boolean required,
            @Size(max = 8) List<@NotBlank @Size(max = 100) String> options) {}

    public record JobInput(
            @NotBlank @Size(max = 200) String title,
            @NotBlank @Size(max = 500) String summary,
            @NotBlank @Size(max = 1000) String plainSummary,
            @NotBlank @Size(max = 10000) String description,
            @NotBlank @Size(max = 64) String region,
            @Size(max = 100) String city,
            @NotBlank @Pattern(regexp = "ONSITE|REMOTE|HYBRID") String workMode,
            @NotBlank @Pattern(regexp = "FULL_TIME|PART_TIME|CONTRACT|INTERNSHIP") String employmentType,
            @Size(max = 100) String salaryText,
            @NotNull @FutureOrPresent LocalDate deadline,
            @NotBlank @Pattern(regexp = "DRAFT|PUBLISHED|CLOSED") String status,
            @Valid @NotNull AccommodationDto accommodations,
            @Valid @Size(max = 5) List<CustomQuestionInput> customQuestions) {}

    public record EmployerJobSummary(UUID id, String title, String status, LocalDate deadline, long applicationCount,
                                     List<String> accommodations) {}
}
