package com.internshiphub.opportunity;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class OpportunityExceptionHandler {
    @ExceptionHandler(DuplicateOpportunityException.class)
    public ResponseEntity<DuplicateResponse> duplicate(DuplicateOpportunityException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new DuplicateResponse("DUPLICATE_POSTING_URL", exception.getExisting()));
    }

    @ExceptionHandler(OpportunityNotFoundException.class)
    public ResponseEntity<ErrorResponse> notFound(OpportunityNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("OPPORTUNITY_NOT_FOUND", exception.getMessage()));
    }

    public record DuplicateResponse(String code, Opportunity existing) {
    }

    public record ErrorResponse(String code, String message) {
    }
}
