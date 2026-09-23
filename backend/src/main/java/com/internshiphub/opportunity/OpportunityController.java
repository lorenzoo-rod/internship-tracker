package com.internshiphub.opportunity;

import java.net.URI;
import java.util.List;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/opportunities")
public class OpportunityController {
    private final OpportunityService service;

    public OpportunityController(OpportunityService service) {
        this.service = service;
    }

    @GetMapping
    public List<Opportunity> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    public Opportunity get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    public ResponseEntity<Opportunity> create(@Valid @RequestBody CreateOpportunityRequest request) {
        Opportunity created = service.create(request);
        return ResponseEntity.created(URI.create("/api/opportunities/" + created.getId())).body(created);
    }

    @PatchMapping("/{id}/stage")
    public Opportunity updateStage(@PathVariable Long id, @Valid @RequestBody UpdateStageRequest request) {
        return service.updateStage(id, request.stage());
    }

    @PatchMapping("/{id}")
    public Opportunity updateDetails(@PathVariable Long id, @Valid @RequestBody CreateOpportunityRequest request) {
        return service.updateDetails(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
