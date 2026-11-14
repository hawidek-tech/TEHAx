package org.accessflow.help;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.stereotype.Service;

/** Approved help content with English fallback when an article is not yet translated. */
@Service
public class HelpService {

    private final HelpArticleRepository repository;

    public HelpService(HelpArticleRepository repository) {
        this.repository = repository;
    }

    public List<HelpArticle> all(String locale) {
        List<HelpArticle> local = repository.findByLocaleOrderByTopicAscTitleAsc(locale);
        if ("en".equals(locale)) return local;
        // Fill gaps with English so every topic is available.
        List<String> present = local.stream().map(HelpArticle::getSlug).toList();
        List<HelpArticle> english = repository.findByLocaleOrderByTopicAscTitleAsc("en").stream()
                .filter(a -> !present.contains(a.getSlug())).toList();
        return java.util.stream.Stream.concat(local.stream(), english.stream()).toList();
    }

    public Optional<HelpArticle> get(String slug, String locale) {
        return repository.findBySlugAndLocale(slug, locale).or(() -> repository.findBySlugAndLocale(slug, "en"));
    }

    /** Simple keyword relevance ranking over approved articles (title, keywords, body). */
    public List<HelpArticle> search(String query, String locale, String topicHint, int limit) {
        String q = query == null ? "" : query.toLowerCase(Locale.ROOT);
        String[] terms = q.split("[\\s,.?!።፣፤:;]+");
        return all(locale).stream()
                .map(a -> new Scored(a, score(a, terms, topicHint)))
                .filter(s -> s.score > 0)
                .sorted(Comparator.comparingInt((Scored s) -> s.score).reversed())
                .limit(limit)
                .map(s -> s.article)
                .toList();
    }

    private record Scored(HelpArticle article, int score) {}

    private static int score(HelpArticle a, String[] terms, String topicHint) {
        int score = topicHint != null && topicHint.equals(a.getTopic()) ? 2 : 0;
        String title = a.getTitle().toLowerCase(Locale.ROOT);
        String body = a.getBody().toLowerCase(Locale.ROOT);
        for (String t : terms) {
            if (t.length() < 3) continue;
            if (title.contains(t)) score += 4;
            if (a.getKeywords().stream().anyMatch(k -> k.toLowerCase(Locale.ROOT).contains(t) || t.contains(k.toLowerCase(Locale.ROOT)))) score += 3;
            if (body.contains(t)) score += 1;
        }
        return score;
    }
}
