package org.accessflow.forms;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;

/** Loads flow definitions from classpath:flows/*.json at startup and resolves dynamic option lists. */
@Component
public class FlowRegistry {

    private final Map<String, FlowDefinition> flows = new ConcurrentHashMap<>();
    private final OptionSources optionSources;

    public FlowRegistry(ObjectMapper mapper, OptionSources optionSources) throws IOException {
        this.optionSources = optionSources;
        Resource[] resources = new PathMatchingResourcePatternResolver().getResources("classpath:flows/*.json");
        for (Resource r : resources) {
            try (InputStream in = r.getInputStream()) {
                FlowDefinition def = mapper.readValue(in, FlowDefinition.class);
                flows.put(def.key(), def);
            }
        }
    }

    public Optional<FlowDefinition> raw(String key) {
        return Optional.ofNullable(flows.get(key));
    }

    /** Definition with optionsSource lists (regions, referral partners, …) resolved into concrete options. */
    public Optional<FlowDefinition> resolved(String key) {
        return raw(key).map(this::resolve);
    }

    /** A definition restricted to the given sections (used to validate partial edits, e.g. profile editing). */
    public FlowDefinition subset(FlowDefinition def, java.util.Set<String> sections) {
        return def.withSteps(def.steps().stream().filter(s -> sections.contains(s.section())).toList());
    }

    public FlowDefinition resolve(FlowDefinition def) {
        List<FlowDefinition.Step> steps = new ArrayList<>();
        for (FlowDefinition.Step s : def.steps()) {
            List<FlowDefinition.Field> fields = s.fields().stream()
                    .map(f -> f.optionsSource() != null ? f.withOptions(optionSources.options(f.optionsSource())) : f)
                    .toList();
            steps.add(new FlowDefinition.Step(s.id(), s.section(), s.showIf(), fields));
        }
        return def.withSteps(steps);
    }
}
