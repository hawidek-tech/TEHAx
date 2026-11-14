package org.accessflow.system;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public, non-sensitive service information. Used by the frontend to show
 * connection status and by partners to check API availability.
 */
@RestController
@RequestMapping("/api/v1/system")
public class SystemInfoController {

    private final String version;

    public SystemInfoController(@Value("${accessflow.version}") String version) {
        this.version = version;
    }

    @GetMapping("/info")
    public SystemInfo info() {
        return new SystemInfo("ACCESSFLOW", version, "v1");
    }

    public record SystemInfo(String name, String version, String apiVersion) {}
}
