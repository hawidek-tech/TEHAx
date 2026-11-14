package org.accessflow.assistant;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Duration;
import java.util.List;
import org.accessflow.common.ApiException;
import org.accessflow.help.HelpArticle;
import org.accessflow.help.HelpController.ArticleDto;
import org.accessflow.help.HelpService;
import org.accessflow.security.ClientIp;
import org.accessflow.security.RateLimiter;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Optional help assistant. Always returns approved help articles (works with no AI at all). An AI answer is added
 * only when a provider is configured AND the user has explicitly allowed external processing for this question.
 * The assistant never sees profile data, never fills fields and never makes decisions.
 */
@Tag(name = "Assistant", description = "Optional help assistant grounded in approved help content")
@RestController
@RequestMapping("/api/v1/assistant")
public class AssistantController {

    private final HelpService help;
    private final AssistantProvider provider;
    private final RateLimiter rateLimiter;

    public AssistantController(HelpService help, List<AssistantProvider> providers, RateLimiter rateLimiter) {
        this.help = help;
        this.provider = providers.stream().filter(AssistantProvider::isAvailable).findFirst().orElse(null);
        this.rateLimiter = rateLimiter;
    }

    public record AskRequest(
            @NotBlank @Size(max = 500) String question,
            @NotBlank @Pattern(regexp = "en|am|om|so|ti") String locale,
            @Size(max = 64) String flowKey,
            @Size(max = 64) String fieldId,
            @Size(max = 300) String fieldLabel,
            @Size(max = 32) String topic,
            /** Public content to explain (e.g. a job description). The UI never puts personal data here. */
            @Size(max = 6000) String contextText,
            boolean allowExternalAi) {}

    public record AskResponse(String answer, String source, boolean aiAvailable, boolean uncertain,
                              List<ArticleDto> articles, String humanSupportPath) {}

    public record Status(boolean aiAvailable, String provider) {}

    @GetMapping("/status")
    public Status status() {
        return new Status(provider != null, provider == null ? "local" : provider.name());
    }

    @Operation(summary = "Ask for help with a question, field, error or next step")
    @PostMapping("/ask")
    public AskResponse ask(@Valid @RequestBody AskRequest req, HttpServletRequest http) {
        if (!rateLimiter.tryAcquire("assistant:" + ClientIp.of(http), 30, Duration.ofMinutes(10))) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "error.rateLimited");
        }
        String searchText = req.question() + " " + (req.fieldLabel() == null ? "" : req.fieldLabel());
        List<HelpArticle> articles = help.search(searchText, req.locale(), req.topic(), 3);
        List<ArticleDto> dtos = articles.stream().map(ArticleDto::of).toList();

        if (provider != null && req.allowExternalAi()) {
            String context = "flow=" + safe(req.flowKey()) + ", field=" + safe(req.fieldId())
                    + (req.fieldLabel() == null ? "" : ", question shown to user: \"" + req.fieldLabel() + "\"")
                    + (req.contextText() == null ? "" : "\nPUBLIC TEXT THE USER WANTS EXPLAINED SIMPLY:\n" + PersonalDataRedactor.redact(req.contextText()));
            var answer = provider.answer(PersonalDataRedactor.redact(req.question()), context, req.locale(), articles);
            if (answer.isPresent()) {
                return new AskResponse(answer.get(), "ai", true, articles.isEmpty(), dtos, "/support");
            }
        }
        // Local fallback: approved articles only. "uncertain" tells the UI to offer human support prominently.
        return new AskResponse(null, "local", provider != null, articles.isEmpty(), dtos, "/support");
    }

    private static String safe(String s) {
        return s == null ? "none" : s.replaceAll("[^a-zA-Z0-9_-]", "");
    }
}
