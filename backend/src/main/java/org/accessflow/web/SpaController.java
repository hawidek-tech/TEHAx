package org.accessflow.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Production: the built frontend is served by this application (ACCESSFLOW_FRONTEND_DIR) so the web app, API and
 * embed pages share one origin. Client-side routes are forwarded to index.html. In development, Vite serves the app.
 */
@Controller
public class SpaController {

    @GetMapping({"/", "/{path:^(?!api|v3|swagger-ui|actuator|assets|embed-assets)[^\\.]*$}",
            "/{path:^(?!api|v3|swagger-ui|actuator|assets)[^\\.]*$}/**"})
    public String forward() {
        return "forward:/index.html";
    }
}
