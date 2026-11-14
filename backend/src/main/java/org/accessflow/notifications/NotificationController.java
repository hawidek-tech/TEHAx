package org.accessflow.notifications;

import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.accessflow.common.ApiException;
import org.accessflow.security.CurrentUser;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Notifications")
@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    private final NotificationRepository repository;

    public NotificationController(NotificationRepository repository) {
        this.repository = repository;
    }

    public record NotificationDto(UUID id, String type, Map<String, Object> params, boolean read, Instant createdAt) {}

    @GetMapping
    public List<NotificationDto> list() {
        return repository.findTop50ByUserIdOrderByCreatedAtDesc(CurrentUser.id()).stream()
                .map(n -> new NotificationDto(n.getId(), n.getType(), n.getParams(), n.getReadAt() != null, n.getCreatedAt()))
                .toList();
    }

    @Transactional
    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable UUID id) {
        Notification n = repository.findByIdAndUserId(id, CurrentUser.id()).orElseThrow(ApiException::notFound);
        n.markRead();
        return ResponseEntity.noContent().build();
    }
}
