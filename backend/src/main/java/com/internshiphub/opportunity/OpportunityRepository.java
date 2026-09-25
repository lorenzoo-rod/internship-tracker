package com.internshiphub.opportunity;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OpportunityRepository extends JpaRepository<Opportunity, Long> {
    @Query("select o from Opportunity o where o.discoveryUrl = :url or o.applicationUrl = :url order by o.id")
    java.util.List<Opportunity> findByTrackedUrl(@Param("url") String url);

    Optional<Opportunity> findFirstByStatusUrlAndIdNot(String statusUrl, Long id);
}
