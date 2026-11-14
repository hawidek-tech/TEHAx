package org.accessflow.notifications;

import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {
    private final NotificationRepository repository;

    public NotificationService(NotificationRepository repository) {
        this.repository = repository;
    }

    public void notify(UUID userId, String type, Map<String, Object> params) {
        repository.save(new Notification(userId, type, params));
    }
}
