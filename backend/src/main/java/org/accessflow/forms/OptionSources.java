package org.accessflow.forms;

import java.util.List;
import org.accessflow.organizations.OrganizationRepository;
import org.springframework.stereotype.Component;

/** Dynamic option lists referenced by flow definitions through "optionsSource". */
@Component
public class OptionSources {

    /** Ethiopian regional states and chartered cities (labels are i18n keys "regions.<value>"). */
    public static final List<String> REGIONS = List.of(
            "ADDIS_ABABA", "AFAR", "AMHARA", "BENISHANGUL_GUMUZ", "CENTRAL_ETHIOPIA", "DIRE_DAWA", "GAMBELA", "HARARI",
            "OROMIA", "SIDAMA", "SOMALI", "SOUTH_ETHIOPIA", "SOUTH_WEST_ETHIOPIA", "TIGRAY", "OUTSIDE_ETHIOPIA");

    /** Workplace support categories (no diagnoses - only the support itself). */
    public static final List<String> ACCOMMODATIONS = List.of(
            "SCREEN_READER", "SIGN_LANGUAGE", "CAPTIONS", "ACCESSIBLE_BUILDING", "FLEXIBLE_HOURS", "REMOTE_WORK",
            "ASSISTIVE_TECH", "ACCESSIBLE_INTERVIEW", "EXTRA_TIME", "WRITTEN_INSTRUCTIONS", "QUIET_SPACE", "TRANSPORT");

    private final OrganizationRepository organizations;

    public OptionSources(OrganizationRepository organizations) {
        this.organizations = organizations;
    }

    public List<FlowDefinition.Option> options(String source) {
        return switch (source) {
            case "regions" -> REGIONS.stream().map(v -> new FlowDefinition.Option(v, "regions." + v, null)).toList();
            case "accommodations" -> ACCOMMODATIONS.stream()
                    .map(v -> new FlowDefinition.Option(v, "accommodations." + v, null)).toList();
            case "referralPartners" -> organizations.findByReferralEnabledTrueAndActiveTrueOrderByName().stream()
                    .map(o -> new FlowDefinition.Option(o.getId().toString(), null, o.getName())).toList();
            default -> throw new IllegalArgumentException("Unknown options source: " + source);
        };
    }
}
