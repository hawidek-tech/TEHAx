package org.accessflow.preferences;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/** Accessibility preferences. None of these describe a disability; they only describe how the interface should behave. */
public record PreferencesDto(
        @NotNull @Pattern(regexp = "en|am|om|so|ti") String locale,
        @Min(100) @Max(200) int textScale,
        boolean highContrast,
        boolean simplifiedLanguage,
        boolean captions,
        boolean keyboardFirst,
        boolean readAloud,
        boolean reducedMotion,
        boolean sharedDevice,
        /** Spoken guidance through the whole journey, started by the user ("Activate Audio Accessibility"). */
        boolean audioGuide) {

    public static PreferencesDto defaults(String locale) {
        return new PreferencesDto(locale == null ? "en" : locale, 100, false, false, false, false, false, false, false, false);
    }
}
