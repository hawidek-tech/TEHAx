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

    public EmbedController(EmbedTokenService tokens, OrganizationRepository organizations) {
        this.tokens = tokens;
        this.organizations = organizations;
    }

    /** Public partner configuration used by the iframe to validate the parent origin for postMessage. */
    public record EmbedConfig(String partnerName, List<String> allowedOrigins, List<String> components) {}

    @Operation(summary = "Partner configuration for a publishable key (allowed origins are not secret)")
    @GetMapping("/config")
    public EmbedConfig config(@RequestParam String key) {
        PartnerIntegration i = tokens.requireIntegration(key);
        String name = organizations.findById(i.getOrganizationId()).map(o -> o.getName()).orElse("Partner");
        return new EmbedConfig(name, i.getAllowedOrigins(), i.getEnabledComponents());
    }
}
