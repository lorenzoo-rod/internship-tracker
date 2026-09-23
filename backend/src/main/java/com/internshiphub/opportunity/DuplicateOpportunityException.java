package com.internshiphub.opportunity;

public class DuplicateOpportunityException extends RuntimeException {
    private final Opportunity existing;

    public DuplicateOpportunityException(Opportunity existing) {
        super("An opportunity with this posting URL already exists");
        this.existing = existing;
    }

    public Opportunity getExisting() {
        return existing;
    }
}
