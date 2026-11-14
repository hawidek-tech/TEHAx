package org.accessflow.files;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.accessflow.common.ApiException;
import org.accessflow.security.ClientIp;
import org.accessflow.security.CurrentUser;
import org.accessflow.security.RateLimiter;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Files", description = "Protected uploads (identity documents, CVs). Owner-only access.")
@RestController
@RequestMapping("/api/v1/files")
public class FileController {

    private final FileService files;
    private final RateLimiter rateLimiter;

    public FileController(FileService files, RateLimiter rateLimiter) {
        this.files = files;
        this.rateLimiter = rateLimiter;
    }

    public record FileDto(UUID id, String purpose, String name, String contentType, long sizeBytes, Instant createdAt) {
        public static FileDto of(StoredFile f) {
            return new FileDto(f.getId(), f.getPurpose(), f.getOriginalName(), f.getContentType(), f.getSizeBytes(), f.getCreatedAt());
        }
    }

    @Operation(summary = "Upload a file (PDF/JPEG/PNG for identity documents; PDF/DOCX for CVs; max 5 MB)")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileDto> upload(@RequestParam String purpose, @RequestPart("file") MultipartFile file,
                                          jakarta.servlet.http.HttpServletRequest request) {
        if (!rateLimiter.tryAcquire("upload:" + CurrentUser.id(), 20, Duration.ofHours(1))
                || !rateLimiter.tryAcquire("upload-ip:" + ClientIp.of(request), 60, Duration.ofHours(1))) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "error.rateLimited");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(FileDto.of(files.store(CurrentUser.id(), purpose, file)));
    }

    @Operation(summary = "Metadata of one of my files")
    @GetMapping("/{id}")
    public FileDto get(@PathVariable UUID id) {
        return FileDto.of(files.requireOwned(id, CurrentUser.id()));
    }

    @Operation(summary = "Download one of my files (always as an attachment)")
    @GetMapping("/{id}/content")
    public ResponseEntity<Resource> download(@PathVariable UUID id) {
        return asAttachment(files, files.requireOwned(id, CurrentUser.id()));
    }

    @Operation(summary = "Delete one of my files")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        files.delete(files.requireOwned(id, CurrentUser.id()));
        return ResponseEntity.noContent().build();
    }

    public static ResponseEntity<Resource> asAttachment(FileService files, StoredFile file) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(file.getOriginalName(), java.nio.charset.StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .contentType(MediaType.parseMediaType(file.getContentType()))
                .body(new FileSystemResource(files.pathOf(file)));
    }
}
