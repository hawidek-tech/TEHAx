package org.accessflow.forms;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/**
 * A versioned, data-driven form flow (ADR 0003). The SAME definition drives the frontend renderer and the
 * server-side validator. Text is referenced by i18n keys; employer-written custom questions use literal labels.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public record FlowDefinition(
        String key,
        int version,
        String titleKey,
        List<String> sections,
        List<Step> steps,
        List<String> requireOneOf) {

    public FlowDefinition withSteps(List<Step> newSteps) {
        return new FlowDefinition(key, version, titleKey, sections, newSteps, requireOneOf);
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Step(String id, String section, Condition showIf, List<Field> fields) {}

    /** Show a step only when another field equals one of the given values. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Condition(String field, List<String> in) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Field(
            String id,
            String type,
            String labelKey,
            String label,
            String hintKey,
            String exampleKey,
            String whyKey,
            String icon,
            Boolean required,
            Boolean voice,
            Boolean sensitive,
            String autocomplete,
            Integer minLength,
            Integer maxLength,
            Integer min,
            Integer max,
            Integer maxItems,
            String validator,
            List<Option> options,
            String optionsSource,
            String prefill,
            Object defaultValue,
            List<Field> itemFields,
            String filePurpose) {

        public boolean isRequired() { return Boolean.TRUE.equals(required); }
        public boolean isSensitive() { return Boolean.TRUE.equals(sensitive); }

        public Field withOptions(List<Option> resolved) {
            return new Field(id, type, labelKey, label, hintKey, exampleKey, whyKey, icon, required, voice, sensitive,
                    autocomplete, minLength, maxLength, min, max, maxItems, validator, resolved, null, prefill,
                    defaultValue, itemFields, filePurpose);
        }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Option(String value, String labelKey, String label) {}
}
