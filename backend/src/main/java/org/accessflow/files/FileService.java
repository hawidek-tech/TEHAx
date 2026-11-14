package org.accessflow.files;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.accessflow.audit.AuditService;
import org.accessflow.common.ApiException;
import org.apache.tika.Tika;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * Protected document storage.
 * <ul>
 *   <li>Type detected from file contents (Tika magic bytes); the client-supplied type and extension are ignored.</li>
 *   <li>Allow-list per purpose; maximum 5 MB.</li>
 *   <li>Stored outside the web root under a random name; the original name is kept only as metadata.</li>
 *   <li>Downloads go through authorised endpoints only, served as attachments.</li>
 * </ul>
 */
@Service
public class FileService {

    public static final long MAX_BYTES = 5L * 1024 * 1024;
    private static final Map<String, Set<String>> ALLOWED = Map.of(
            "IDENTITY_DOCUMENT", Set.of("application/pdf", "image/jpeg", "image/png"),
            "RESUME", Set.of("application/pdf",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "application/x-tika-ooxml"));
    private static final SecureRandom RANDOM = new SecureRandom();

    private final StoredFileRepository files;
    private final AuditService audit;
    private final Path root;
    private final Tika tika = new Tika();

    public FileService(StoredFileRepository files, AuditService audit, @Value("${accessflow.storage-dir}") String storageDir)
            throws IOException {
        this.files = files;
        this.audit = audit;
        this.root = Path.of(storageDir).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    @Transactional
    public StoredFile store(UUID ownerId, String purpose, MultipartFile upload) {
        if (!ALLOWED.containsKey(purpose)) throw ApiException.badRequest("file.invalidPurpose");
        if (upload == null || upload.isEmpty()) throw ApiException.badRequest("file.empty");
        if (upload.getSize() > MAX_BYTES) throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "file.tooLarge");

        String detected;
        try (InputStream in = upload.getInputStream()) {
            detected = tika.detect(in, upload.getOriginalFilename());
        } catch (IOException e) {
            throw ApiException.badRequest("file.unreadable");
        }
        // Tika may report OOXML generically when only magic bytes are checked; accept it for RESUME and record as DOCX.
        if (!ALLOWED.get(purpose).contains(detected)) throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "file.typeNotAllowed");
        if ("application/x-tika-ooxml".equals(detected)) {
            detected = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        }

        byte[] key = new byte[24];
        RANDOM.nextBytes(key);
        String storageKey = HexFormat.of().formatHex(key);
        Path target = root.resolve(storageKey);
        String sha;
        try (InputStream in = upload.getInputStream()) {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            Files.copy(new java.security.DigestInputStream(in, digest), target, StandardCopyOption.REPLACE_EXISTING);
            sha = HexFormat.of().formatHex(digest.digest());
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "file.storeFailed");
        }
        StoredFile saved = files.save(new StoredFile(ownerId, purpose, safeName(upload.getOriginalFilename()), detected,
                upload.getSize(), storageKey, sha));
        audit.record(ownerId, "FILE_UPLOADED", "FILE", saved.getId());
        return saved;
    }

    public StoredFile requireOwned(UUID fileId, UUID ownerId) {
        return files.findByIdAndOwnerId(fileId, ownerId).orElseThrow(ApiException::notFound);
    }

    public StoredFile require(UUID fileId) {
        return files.findById(fileId).orElseThrow(ApiException::notFound);
    }

    public Path pathOf(StoredFile file) {
        return root.resolve(file.getStorageKey());
    }

    @Transactional
    public void delete(StoredFile file) {
        try {
            Files.deleteIfExists(pathOf(file));
        } catch (IOException ignored) {
            // The database row is removed regardless; orphaned bytes are not addressable.
        }
        files.delete(file);
    }

    static String safeName(String name) {
        if (name == null || name.isBlank()) return "document";
        String base = Path.of(name).getFileName().toString().replaceAll("[^\\p{L}\\p{N}._ -]", "_");
        return base.length() > 120 ? base.substring(base.length() - 120) : base;
    }
}
