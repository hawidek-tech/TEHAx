package org.accessflow.organizations;

import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Organizations")
@RestController
@RequestMapping("/api/v1/organizations")
public class OrganizationController {

    private final OrganizationRepository repository;

    public OrganizationController(OrganizationRepository repository) {
        this.repository = repository;
    }

    public record ReferralPartner(UUID id, String name, String type, String description) {}

    /** Partner organisations that can refer people who lack standard identification. */
    @GetMapping("/referral-partners")
    public List<ReferralPartner> referralPartners() {
        return repository.findByReferralEnabledTrueAndActiveTrueOrderByName().stream()
                .map(o -> new ReferralPartner(o.getId(), o.getName(), o.getType(), o.getDescription())).toList();
    }
}
