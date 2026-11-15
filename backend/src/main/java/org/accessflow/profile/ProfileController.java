package org.accessflow.profile;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.accessflow.files.FileController.FileDto;
import org.accessflow.files.FileService;
import org.accessflow.security.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Profile", description = "The signed-in user's reusable profile. Owner-only.")
@RestController
@RequestMapping("/api/v1")
public class ProfileController {

    private final ProfileService service;
    private final FileService files;

    public ProfileController(ProfileService service, FileService files) {
        this.service = service;
        this.files = files;
    }

    public record ProfileDto(String givenName, String fatherName, String grandfatherName, Short birthYear, String region,
                             String city, String headline, String summary, List<Map<String, Object>> education,
                             List<Map<String, Object>> experience, List<String> skills, List<String> languages,
                             List<String> supportPreferences, FileDto resume, boolean completed, List<String> missing,
                             Instant updatedAt) {}

    public ProfileDto toDto(Profile p) {
        FileDto resume = p.getResumeFileId() == null ? null : FileDto.of(files.require(p.getResumeFileId()));
        return new ProfileDto(p.getGivenName(), p.getFatherName(), p.getGrandfatherName(), p.getBirthYear(), p.getRegion(),
                p.getCity(), p.getHeadline(), p.getSummary(), p.getEducation(), p.getExperience(), p.getSkills(),
                p.getLanguages(), p.getSupportPreferences(), resume, p.getCompletedAt() != null, missing(p), p.getUpdatedAt());
    }

    /** Sections still missing - shown in the progress tracker as "missing information". */
    static List<String> missing(Profile p) {
        List<String> m = new ArrayList<>();
        if (p.getGivenName() == null || p.getFatherName() == null) m.add("NAME");
        if (p.getRegion() == null) m.add("LOCATION");
        if (p.getHeadline() == null) m.add("HEADLINE");
        if (p.getExperience().isEmpty()) m.add("EXPERIENCE");
        if (p.getEducation().isEmpty()) m.add("EDUCATION");
        if (p.getSkills().isEmpty()) m.add("SKILLS");
        if (p.getResumeFileId() == null) m.add("RESUME");
        return m;
    }

    @Operation(summary = "My profile")
    @GetMapping("/profile")
    public ProfileDto get() {
        return toDto(service.getOrEmpty(CurrentUser.id()));
    }

    @Operation(summary = "Edit my profile (same field ids and validation as the profile flow)")
    @PutMapping("/profile")
    public ProfileDto update(@RequestBody Map<String, Object> data) {
        return toDto(service.update(CurrentUser.id(), data));
    }

    @Operation(summary = "Save only some profile questions (one part of the guided profile, or what an application needs)",
            description = "`steps` lists profile step ids, e.g. `fatherName,region,headline,skills`. Other fields are unchanged.")
    @PutMapping("/profile/steps")
    public ProfileDto saveSteps(@RequestParam("steps") List<String> steps, @RequestBody Map<String, Object> data) {
        if (steps.size() > 30) throw org.accessflow.common.ApiException.badRequest("profile.unknownStep");
        return toDto(service.saveSteps(CurrentUser.id(), steps, data));
    }

    public record SupportPreferencesRequest(List<String> categories) {}

    @Operation(summary = "Update my PRIVATE workplace-support preferences (used only for my own job filtering)")
    @PutMapping("/profile/support-preferences")
    public ProfileDto supportPreferences(@RequestBody SupportPreferencesRequest req) {
        return toDto(service.updateSupportPreferences(CurrentUser.id(), req.categories() == null ? List.of() : req.categories()));
    }

    public record ResumeRequest(UUID fileId) {}

    @Operation(summary = "Attach (or remove, with null) my CV")
    @PutMapping("/profile/resume")
    public ProfileDto resume(@RequestBody ResumeRequest req) {
        return toDto(service.setResume(CurrentUser.id(), req.fileId()));
    }

    public record OnboardingResponse(ProfileDto profile, UUID identityVerificationId, UUID supportRequestId) {}

    @Operation(summary = "Submit the guided profile flow (profile + identity route + optional private support request)")
    @PostMapping("/onboarding/profile")
    public ResponseEntity<OnboardingResponse> onboarding(@RequestBody Map<String, Object> data) {
        var result = service.completeOnboarding(CurrentUser.id(), data);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new OnboardingResponse(toDto(result.profile()), result.identityVerificationId(), result.supportRequestId()));
    }
}
