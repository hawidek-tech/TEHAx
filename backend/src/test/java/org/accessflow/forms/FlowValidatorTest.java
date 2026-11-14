package org.accessflow.forms;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.accessflow.common.ApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class FlowValidatorTest {

    private final FlowValidator validator = new FlowValidator();
    private FlowDefinition registration;

    @BeforeEach
    void load() throws Exception {
        registration = new ObjectMapper().readValue(getClass().getResourceAsStream("/flows/registration.json"), FlowDefinition.class);
    }

    private Map<String, Object> valid() {
        Map<String, Object> m = new HashMap<>();
        m.put("displayName", "  Almaz  ");
        m.put("contactMethod", "phone");
        m.put("phone", "0911 23 45 67");
        m.put("password", "a long passphrase");
        m.put("acceptPrivacy", true);
        return m;
    }

    @Test
    void normalisesValuesAndDropsUnknownFields() {
        Map<String, Object> in = valid();
        in.put("isAdmin", true);
        Map<String, Object> out = validator.validate(registration, in);
        assertThat(out).containsEntry("displayName", "Almaz").containsEntry("phone", "+251911234567").doesNotContainKey("isAdmin");
    }

    @Test
    void dropsAnswersToHiddenSteps() {
        Map<String, Object> in = valid();
        in.put("email", "not-validated@example.com"); // email step is hidden when contactMethod = phone
        assertThat(validator.validate(registration, in)).doesNotContainKey("email");
    }

    @Test
    void reportsRequiredAndFormatErrorsWithTranslatableCodes() {
        Map<String, Object> in = valid();
        in.remove("displayName");
        in.put("phone", "12345");
        in.put("acceptPrivacy", false);
        assertThatThrownBy(() -> validator.validate(registration, in))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).fieldErrors()).containsExactlyInAnyOrder(
                        new ApiException.FieldError("displayName", "validation.required"),
                        new ApiException.FieldError("phone", "validation.phone"),
                        new ApiException.FieldError("acceptPrivacy", "validation.consent")));
    }

    @Test
    void rejectsOptionsThatAreNotInTheDefinition() {
        Map<String, Object> in = valid();
        in.put("contactMethod", "fax");
        assertThatThrownBy(() -> validator.validate(registration, in)).isInstanceOf(ApiException.class);
    }

    @Test
    void validatesListItemsWithIndexedPaths() throws Exception {
        FlowDefinition profile = new ObjectMapper().readValue(getClass().getResourceAsStream("/flows/profile.json"), FlowDefinition.class);
        FlowDefinition education = profile.withSteps(profile.steps().stream().filter(s -> s.id().equals("education")).toList());
        assertThatThrownBy(() -> validator.validate(education, Map.of("education", List.of(Map.of("level", "BACHELOR")))))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).fieldErrors())
                        .contains(new ApiException.FieldError("education[0].institution", "validation.required")));
    }
}
