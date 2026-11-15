package org.accessflow.system;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI accessflowOpenApi(@Value("${accessflow.version}") String version) {
        return new OpenAPI().info(new Info()
                .title("ACCESSFLOW API")
                .version(version)
                .description("Accessible onboarding and job applications (DIGITAL BRIDGE Accessibility Hackathon 2026, Track 1). "
                        + "First-party clients use a session cookie plus the X-XSRF-TOKEN header; embedded components send "
                        + "X-AccessFlow-Embed and then 'Authorization: Bearer <embedToken>'. Errors are RFC 7807 problem details "
                        + "with a translatable 'code'. Learners can only access their own records (other ids return 404).")
                .license(new License().name("See THIRD_PARTY_LICENSES.md")));
    }
}
