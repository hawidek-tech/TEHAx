package org.accessflow.preferences;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.accessflow.security.CurrentUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Accessibility preferences")
@RestController
@RequestMapping("/api/v1/preferences")
public class PreferencesController {

    private final PreferencesService service;

    public PreferencesController(PreferencesService service) {
        this.service = service;
    }

    @GetMapping
    public PreferencesDto get() {
        return service.get(CurrentUser.id());
    }

    @PutMapping
    public PreferencesDto update(@Valid @RequestBody PreferencesDto dto) {
        return service.update(CurrentUser.id(), dto);
    }
}
