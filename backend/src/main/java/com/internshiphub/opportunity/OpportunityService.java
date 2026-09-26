package com.internshiphub.opportunity;

import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OpportunityService {
    private final OpportunityRepository repository;

    public OpportunityService(OpportunityRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<Opportunity> list() {
        return repository.findAll();
    }

    @Transactional(readOnly = true)
    public Opportunity get(Long id) {
        return repository.findById(id).orElseThrow(() -> new OpportunityNotFoundException(id));
    }

    @Transactional
    public Opportunity create(CreateOpportunityRequest request) {
        String discoveryUrl = clean(request.discoveryUrl());
        String applicationUrl = clean(request.applicationUrl());
        String statusUrl = clean(request.statusUrl());
        checkDuplicates(discoveryUrl, applicationUrl, null);

        Opportunity opportunity = new Opportunity(request.title().trim(), request.company().trim(), discoveryUrl, applicationUrl, statusUrl);
        try {
            Opportunity created = repository.saveAndFlush(opportunity);
            setStatusWarning(created);
            return created;
        } catch (DataIntegrityViolationException failure) {
            checkDuplicates(discoveryUrl, applicationUrl, null);
            throw failure;
        }
    }

    @Transactional
    public Opportunity updateStage(Long id, Stage stage) {
        Opportunity opportunity = get(id);
        opportunity.setStage(stage);
        return opportunity;
    }

    @Transactional
    public Opportunity updateDetails(Long id, CreateOpportunityRequest request) {
        Opportunity opportunity = get(id);
        String discoveryUrl = clean(request.discoveryUrl());
        String applicationUrl = clean(request.applicationUrl());
        String statusUrl = clean(request.statusUrl());
        checkDuplicates(discoveryUrl, applicationUrl, id);

        opportunity.updateDetails(request.title().trim(), request.company().trim(), discoveryUrl, applicationUrl, statusUrl);
        try {
            Opportunity updated = repository.saveAndFlush(opportunity);
            setStatusWarning(updated);
            return updated;
        } catch (DataIntegrityViolationException failure) {
            checkDuplicates(discoveryUrl, applicationUrl, id);
            throw failure;
        }
    }

    private static String clean(String url) {
        if (url == null || url.isBlank()) return null;
        return url.trim();
    }

    private void checkDuplicates(String discoveryUrl, String applicationUrl, Long ownId) {
        if (applicationUrl != null) {
            repository.findFirstByApplicationUrl(applicationUrl)
                    .filter(existing -> !existing.getId().equals(ownId))
                    .ifPresent(existing -> { throw new DuplicateOpportunityException(existing); });
        } else if (discoveryUrl != null) {
            repository.findFirstByDiscoveryUrlAndApplicationUrlIsNull(discoveryUrl)
                    .filter(existing -> !existing.getId().equals(ownId))
                    .ifPresent(existing -> { throw new DuplicateOpportunityException(existing); });
        }
    }

    private void setStatusWarning(Opportunity opportunity) {
        if (opportunity.getStatusUrl() == null) return;
        repository.findFirstByStatusUrlAndIdNot(opportunity.getStatusUrl(), opportunity.getId())
                .ifPresent(existing -> opportunity.setStatusUrlMatchId(existing.getId()));
    }

    @Transactional
    public void delete(Long id) {
        repository.delete(get(id));
    }
}
