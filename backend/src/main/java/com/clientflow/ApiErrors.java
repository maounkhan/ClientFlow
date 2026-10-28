package com.clientflow;

import java.util.*;
import org.slf4j.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
class ApiErrors {
  private static final Logger log = LoggerFactory.getLogger(ApiErrors.class);

  @ExceptionHandler(ResponseStatusException.class)
  ResponseEntity<?> known(ResponseStatusException e) {
    return ResponseEntity.status(e.getStatusCode())
        .body(Map.of("message", Objects.toString(e.getReason(), "Request failed")));
  }

  @ExceptionHandler(MaxUploadSizeExceededException.class)
  ResponseEntity<?> large(Exception e) {
    return ResponseEntity.status(413).body(Map.of("message", "Files must be no larger than 5 MB"));
  }

  @ExceptionHandler({
    org.springframework.http.converter.HttpMessageNotReadableException.class,
    org.springframework.web.bind.MissingServletRequestParameterException.class,
    org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class
  })
  ResponseEntity<?> invalid(Exception e) {
    return ResponseEntity.badRequest()
        .body(Map.of("message", "The request contains missing or invalid fields"));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<?> unknown(Exception e) {
    String reference = UUID.randomUUID().toString();
    log.error("Request failure reference={}", reference, e);
    return ResponseEntity.status(500)
        .body(Map.of("message", "Something went wrong. Please retry. Reference: " + reference));
  }
}
