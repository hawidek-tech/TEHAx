package org.accessflow.files;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import org.accessflow.testsupport.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;

class FileUploadTest extends IntegrationTest {

    private static final byte[] PDF = "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n".getBytes(StandardCharsets.US_ASCII);

    @Test
    void realPdfIsAcceptedAndOnlyDownloadableAsAttachmentByOwner() throws Exception {
        MockHttpSession owner = registerApplicant(uniqueEmail());
        String id = read(mvc.perform(multipart("/api/v1/files").file(new MockMultipartFile("file", "cv.pdf", "application/pdf", PDF))
                        .param("purpose", "RESUME").session(owner).with(csrf()))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.contentType").value("application/pdf")).andReturn())
                .get("id").asText();
        mvc.perform(get("/api/v1/files/" + id + "/content").session(owner)).andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.startsWith("attachment")))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"));
        MockHttpSession other = registerApplicant(uniqueEmail());
        mvc.perform(get("/api/v1/files/" + id + "/content").session(other)).andExpect(status().isNotFound());
    }

    @Test
    void disguisedFilesAreRejectedByContentNotExtension() throws Exception {
        MockHttpSession owner = registerApplicant(uniqueEmail());
        byte[] html = "<html><script>alert(1)</script></html>".getBytes(StandardCharsets.UTF_8);
        mvc.perform(multipart("/api/v1/files").file(new MockMultipartFile("file", "id.pdf", "application/pdf", html))
                        .param("purpose", "IDENTITY_DOCUMENT").session(owner).with(csrf()))
                .andExpect(status().isUnsupportedMediaType()).andExpect(jsonPath("$.code").value("file.typeNotAllowed"));
    }

    @Test
    void unknownPurposeIsRejected() throws Exception {
        MockHttpSession owner = registerApplicant(uniqueEmail());
        mvc.perform(multipart("/api/v1/files").file(new MockMultipartFile("file", "a.pdf", "application/pdf", PDF))
                        .param("purpose", "AVATAR").session(owner).with(csrf()))
                .andExpect(status().isBadRequest());
    }
}
