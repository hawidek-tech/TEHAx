package org.accessflow.assistant;

import java.util.List;
import java.util.Optional;
import org.accessflow.help.HelpArticle;

/**
 * Replaceable AI provider. Implementations receive only: the user's (redacted) question, non-personal context
 * (which question/field they are on), the language, and approved help articles to ground the answer.
 */
public interface AssistantProvider {

    String name();

    boolean isAvailable();

    /** @return the answer, or empty if the provider declined or failed (the caller falls back to local help). */
    Optional<String> answer(String question, String contextDescription, String locale, List<HelpArticle> grounding);
}
