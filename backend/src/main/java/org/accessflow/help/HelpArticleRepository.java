package org.accessflow.help;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HelpArticleRepository extends JpaRepository<HelpArticle, java.util.UUID> {
    List<HelpArticle> findByLocaleOrderByTopicAscTitleAsc(String locale);
    Optional<HelpArticle> findBySlugAndLocale(String slug, String locale);
}
