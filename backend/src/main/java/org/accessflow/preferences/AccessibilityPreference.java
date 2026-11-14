package org.accessflow.preferences;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "accessibility_preferences")
public class AccessibilityPreference {
    @Id @Column(name = "user_id") private UUID userId;
    private String locale = "en";
    @Column(name = "text_scale") private short textScale = 100;
    @Column(name = "high_contrast") private boolean highContrast;
    @Column(name = "simplified_language") private boolean simplifiedLanguage;
    private boolean captions;
    @Column(name = "keyboard_first") private boolean keyboardFirst;
    @Column(name = "read_aloud") private boolean readAloud;
    @Column(name = "reduced_motion") private boolean reducedMotion;
    @Column(name = "shared_device") private boolean sharedDevice;
    @Column(name = "updated_at") private Instant updatedAt = Instant.now();

    protected AccessibilityPreference() {}

    public AccessibilityPreference(UUID userId) { this.userId = userId; }

    @PreUpdate void touch() { updatedAt = Instant.now(); }

    public PreferencesDto toDto() {
        return new PreferencesDto(locale, textScale, highContrast, simplifiedLanguage, captions, keyboardFirst,
                readAloud, reducedMotion, sharedDevice);
    }

    public void apply(PreferencesDto d) {
        locale = d.locale();
        textScale = (short) d.textScale();
        highContrast = d.highContrast();
        simplifiedLanguage = d.simplifiedLanguage();
        captions = d.captions();
        keyboardFirst = d.keyboardFirst();
        readAloud = d.readAloud();
        reducedMotion = d.reducedMotion();
        sharedDevice = d.sharedDevice();
    }
}
