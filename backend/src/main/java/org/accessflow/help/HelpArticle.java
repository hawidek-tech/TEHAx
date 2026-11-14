package org.accessflow.help;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Approved help content. The assistant may only answer from these articles. */
@Entity
@Table(name = "help_articles")
public class HelpArticle {
    @Id private UUID id;
    private String slug;
    private String locale;
    private String topic;
    private String title;
    private String body;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> keywords;
    /** true only after review by a fluent speaker; shown to users as "draft translation" otherwise. */
    private boolean reviewed;

    protected HelpArticle() {}

    public UUID getId() { return id; }
    public String getSlug() { return slug; }
    public String getLocale() { return locale; }
    public String getTopic() { return topic; }
    public String getTitle() { return title; }
    public String getBody() { return body; }
    public List<String> getKeywords() { return keywords; }
    public boolean isReviewed() { return reviewed; }
}
