package com.internshiphub.opportunity;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface OpportunityRepository extends JpaRepository<Opportunity, Long> {
    Optional<Opportunity> findFirstByApplicationUrl(String applicationUrl);

    Optional<Opportunity> findFirstByDiscoveryUrlAndApplicationUrlIsNull(String discoveryUrl);

    Optional<Opportunity> findFirstByStatusUrlAndIdNot(String statusUrl, Long id);
}
