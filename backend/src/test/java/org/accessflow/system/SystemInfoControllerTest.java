package org.accessflow.system;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** Phase 0 smoke test: full context starts against PostgreSQL, Flyway runs, API and health respond. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SystemInfoControllerTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void systemInfoReturnsServiceNameAndApiVersion() throws Exception {
        mvc.perform(get("/api/v1/system/info"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("ACCESSFLOW"))
                .andExpect(jsonPath("$.apiVersion").value("v1"));
    }

    @Test
    void healthEndpointIsUpAndHidesDetails() throws Exception {
        mvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.components").doesNotExist());
    }
}
