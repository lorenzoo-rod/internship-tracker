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

    public Opportunity create(CreateOpportunityRequest request) {
        String url = request.postingUrl().trim();
        repository.findByPostingUrl(url).ifPresent(existing -> {
            throw new DuplicateOpportunityException(existing);
        });

        Opportunity opportunity = new Opportunity(request.title().trim(), request.company().trim(), url);
        try {
            return repository.saveAndFlush(opportunity);
        } catch (DataIntegrityViolationException failure) {
            repository.findByPostingUrl(url).ifPresent(existing -> {
                throw new DuplicateOpportunityException(existing);
            });
            throw failure;
        }
    }

    @Transactional
    public Opportunity updateStage(Long id, Stage stage) {
        Opportunity opportunity = get(id);
        opportunity.setStage(stage);
        return opportunity;
    }

    public Opportunity updateDetails(Long id, CreateOpportunityRequest request) {
        Opportunity opportunity = get(id);
        String url = request.postingUrl().trim();
        repository.findByPostingUrl(url)
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> { throw new DuplicateOpportunityException(existing); });

        opportunity.updateDetails(request.title().trim(), request.company().trim(), url);
        try {
            return repository.saveAndFlush(opportunity);
        } catch (DataIntegrityViolationException failure) {
            repository.findByPostingUrl(url)
                    .filter(existing -> !existing.getId().equals(id))
                    .ifPresent(existing -> { throw new DuplicateOpportunityException(existing); });
            throw failure;
        }
    }

    @Transactional
    public void delete(Long id) {
        repository.delete(get(id));
    }
}
