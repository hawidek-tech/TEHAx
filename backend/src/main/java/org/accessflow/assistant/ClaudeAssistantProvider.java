package org.accessflow.assistant;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.errors.AnthropicException;
import com.anthropic.models.beta.messages.BetaMessage;
import com.anthropic.models.beta.messages.BetaOutputConfig;
import com.anthropic.models.beta.messages.BetaStopReason;
import com.anthropic.models.beta.messages.MessageCreateParams;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.accessflow.help.HelpArticle;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Optional Claude-backed provider. Active only when ANTHROPIC_API_KEY is set. The API key stays on the server.
 * Answers are grounded in approved help articles; the system prompt forbids decisions, invention and form filling.
 */
@Component
public class ClaudeAssistantProvider implements AssistantProvider {

    private static final Logger log = LoggerFactory.getLogger(ClaudeAssistantProvider.class);

    static final String SYSTEM_PROMPT = """
            You are the ACCESSFLOW help assistant. ACCESSFLOW helps people in Ethiopia, including people with \
            disabilities, register, build a profile and apply for jobs on their own.

            How to answer:
            - Use plain, short sentences that a person with low literacy can follow. Prefer numbered steps.
            - Answer in the language with code {locale}. If you cannot write well in that language, answer in simple English and say so.
            - Base your answer only on the APPROVED HELP below and the question context. If the help does not cover it, \
            say you are not sure and suggest contacting a human through "Get support" (Private support page).
            - Explain questions, options, errors and next steps. You may give examples of how someone could answer, \
            but never write the user's personal answers for them, never ask for personal details, and never say you have \
            filled in, submitted or changed anything - you cannot.
            - Never judge whether someone is eligible for a job, never rank or assess candidates, and never guess or \
            mention anyone's health condition or disability.
            - Do not invent rules, requirements, deadlines, laws or contact details.
            - Keep the answer under 150 words.
            """;

    private final String model;
    private final AnthropicClient client;

    public ClaudeAssistantProvider(@Value("${accessflow.assistant.anthropic-api-key:}") String apiKey,
                                   @Value("${accessflow.assistant.model}") String model) {
        this.model = model;
        this.client = apiKey == null || apiKey.isBlank() ? null
                : AnthropicOkHttpClient.builder().apiKey(apiKey).timeout(Duration.ofSeconds(60)).build();
    }

    @Override
    public String name() {
        return "claude";
    }

    @Override
    public boolean isAvailable() {
        return client != null;
    }

    @Override
    public Optional<String> answer(String question, String contextDescription, String locale, List<HelpArticle> grounding) {
        if (client == null) return Optional.empty();
        String help = grounding.isEmpty() ? "(no matching approved help)"
                : grounding.stream().map(a -> "## " + a.getTitle() + "\n" + a.getBody()).collect(Collectors.joining("\n\n"));
        String user = "APPROVED HELP:\n" + help + "\n\nQUESTION CONTEXT: " + contextDescription + "\n\nUSER QUESTION:\n" + question;
        try {
            MessageCreateParams params = MessageCreateParams.builder()
                    .model(model)
                    .maxTokens(16000L)
                    .system(SYSTEM_PROMPT.replace("{locale}", locale))
                    // Short, grounded explanations: low effort keeps answers fast on slow connections.
                    .outputConfig(BetaOutputConfig.builder().effort(BetaOutputConfig.Effort.LOW).build())
                    // Server-side fallback: if the primary model declines, the API retries on a suitable model.
                    .addBeta("server-side-fallback-2026-07-01")
                    .fallbacksDefault()
                    .addUserMessage(user)
                    .build();
            BetaMessage response = client.beta().messages().create(params);
            if (response.stopReason().map(BetaStopReason.REFUSAL::equals).orElse(false)) {
                return Optional.empty();
            }
            String text = response.content().stream()
                    .flatMap(b -> b.text().stream())
                    .map(t -> t.text())
                    .collect(Collectors.joining("\n"))
                    .strip();
            return text.isEmpty() ? Optional.empty() : Optional.of(text);
        } catch (AnthropicException e) {
            // Log the error class only - never the question text.
            log.warn("AI assistant unavailable: {}", e.getClass().getSimpleName());
            return Optional.empty();
        }
    }
}
