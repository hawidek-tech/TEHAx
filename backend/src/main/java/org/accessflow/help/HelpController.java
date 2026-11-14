package org.accessflow.help;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import org.accessflow.common.ApiException;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Help", description = "Approved help content (works without AI)")
@RestController
@RequestMapping("/api/v1/help")
@Validated
public class HelpController {

    private final HelpService service;

    public HelpController(HelpService service) {
        this.service = service;
    }

    public record ArticleDto(String slug, String locale, String topic, String title, String body, boolean reviewed) {
        public static ArticleDto of(HelpArticle a) {
            return new ArticleDto(a.getSlug(), a.getLocale(), a.getTopic(), a.getTitle(), a.getBody(), a.isReviewed());
        }
    }

    @GetMapping
    public List<ArticleDto> list(@RequestParam(defaultValue = "en") @Pattern(regexp = "en|am|om|so|ti") String locale,
                                 @RequestParam(required = false) String q) {
        var articles = q == null || q.isBlank() ? service.all(locale) : service.search(q, locale, null, 10);
        return articles.stream().map(ArticleDto::of).toList();
    }

    @GetMapping("/{slug}")
    public ArticleDto get(@PathVariable @Pattern(regexp = "[a-z0-9-]{1,64}") String slug,
                          @RequestParam(defaultValue = "en") @Pattern(regexp = "en|am|om|so|ti") String locale) {
        return service.get(slug, locale).map(ArticleDto::of).orElseThrow(ApiException::notFound);
    }
}
