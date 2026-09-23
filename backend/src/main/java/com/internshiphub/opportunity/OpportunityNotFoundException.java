package com.internshiphub.opportunity;

public class OpportunityNotFoundException extends RuntimeException {
    public OpportunityNotFoundException(Long id) {
        super("Opportunity " + id + " was not found");
    }
}
