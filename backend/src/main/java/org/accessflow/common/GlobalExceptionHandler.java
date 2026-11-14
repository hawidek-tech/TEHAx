package org.accessflow.common;

import java.net.URI;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Converts every error into one consistent RFC 7807 shape:
 * {@code {type, title, status, code, fieldErrors[]}}. Internal messages and stack traces are never exposed.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ProblemDetail handleApi(ApiException ex) {
        return problem(ex.status(), ex.code(), ex.fieldErrors());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleBeanValidation(MethodArgumentNotValidException ex) {
        List<ApiException.FieldError> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> new ApiException.FieldError(fe.getField(), "validation." + fe.getCode()))
                .toList();
        return problem(HttpStatus.UNPROCESSABLE_ENTITY, "error.validation", errors);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    public ProblemDetail handleUnreadable(Exception ex) {
        return problem(HttpStatus.BAD_REQUEST, "error.badRequest", List.of());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail handleDenied(AccessDeniedException ex) {
        return problem(HttpStatus.FORBIDDEN, "error.forbidden", List.of());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ProblemDetail handleTooLarge(MaxUploadSizeExceededException ex) {
        return problem(HttpStatus.PAYLOAD_TOO_LARGE, "file.tooLarge", List.of());
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ProblemDetail handleNoResource(NoResourceFoundException ex) {
        return problem(HttpStatus.NOT_FOUND, "error.notFound", List.of());
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ProblemDetail handleMethod(HttpRequestMethodNotSupportedException ex) {
        return problem(HttpStatus.METHOD_NOT_ALLOWED, "error.methodNotAllowed", List.of());
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpected(Exception ex) {
        // Log the exception type and message only - request bodies are never logged.
        log.error("Unexpected error: {}", ex.getClass().getName(), ex);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "error.unexpected", List.of());
    }

    public static ProblemDetail problem(HttpStatus status, String code, List<ApiException.FieldError> errors) {
        ProblemDetail pd = ProblemDetail.forStatus(status);
        pd.setType(URI.create("https://accessflow.local/problems/" + code));
        pd.setTitle(status.getReasonPhrase());
        pd.setProperty("code", code);
        if (!errors.isEmpty()) {
            pd.setProperty("fieldErrors", errors);
        }
        return pd;
    }
}
