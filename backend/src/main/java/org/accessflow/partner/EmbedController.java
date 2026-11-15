package org.accessflow.partner;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.accessflow.organizations.OrganizationRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Embedding", description = "Configuration for <accessflow-*> Web Components")
@RestController
@RequestMapping("/api/v1/embed")
public class EmbedController {

    private final EmbedTokenService tokens;
    private final OrganizationRepository organizations;
    private final PartnerIntegrationRepository integrations;

    public EmbedController(EmbedTokenService tokens, OrganizationRepository organizations, PartnerIntegrationRepository integrations) {
        this.tokens = tokens;
        this.organizations = organizations;
        this.integrations = integrations;
    }

    /** Public partner configuration used by the iframe to validate the parent origin for postMessage. */
    /** publishableKey is public by design; it is returned so a keyless install can identify itself to the API. */
    public record EmbedConfig(String partnerName, String publishableKey, List<String> allowedOrigins, List<String> components) {}

    @Operation(summary = "Partner configuration by publishable key, or by registered host origin (keyless <db-signup> install)")
    @GetMapping("/config")
    public EmbedConfig config(@RequestParam(required = false) String key, @RequestParam(required = false) String origin) {
        PartnerIntegration i = key != null && !key.isBlank() ? tokens.requireIntegration(key)
                : integrations.findActiveByOrigin(origin)
                        .orElseThrow(() -> new org.accessflow.common.ApiException(org.springframework.http.HttpStatus.FORBIDDEN, "embed.unknownPartner"));
        String name = organizations.findById(i.getOrganizationId()).map(o -> o.getName()).orElse("Partner");
        return new EmbedConfig(name, i.getPublishableKey(), i.getAllowedOrigins(), i.getEnabledComponents());
    }
}
