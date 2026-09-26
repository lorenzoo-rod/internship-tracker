package com.internshiphub.opportunity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

@Entity
@Table(name = "opportunities")
public class Opportunity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String company;

    @Column(name = "discovery_url", length = 2048)
    private String discoveryUrl;

    @Column(name = "application_url", unique = true, length = 2048)
    private String applicationUrl;

    @Column(name = "status_url", length = 2048)
    private String statusUrl;

    @Transient
    private Long statusUrlMatchId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Stage stage;

    protected Opportunity() {
    }

    public Opportunity(String title, String company, String discoveryUrl, String applicationUrl, String statusUrl) {
        this.title = title;
        this.company = company;
        this.discoveryUrl = discoveryUrl;
        this.applicationUrl = applicationUrl;
        this.statusUrl = statusUrl;
        this.stage = Stage.SAVED;
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getCompany() {
        return company;
    }

    public String getDiscoveryUrl() {
        return discoveryUrl;
    }

    public String getApplicationUrl() {
        return applicationUrl;
    }

    public String getStatusUrl() {
        return statusUrl;
    }

    public Long getStatusUrlMatchId() {
        return statusUrlMatchId;
    }

    public void setStatusUrlMatchId(Long statusUrlMatchId) {
        this.statusUrlMatchId = statusUrlMatchId;
    }

    public Stage getStage() {
        return stage;
    }

    public void setStage(Stage stage) {
        this.stage = stage;
    }

    public void updateDetails(String title, String company, String discoveryUrl, String applicationUrl, String statusUrl) {
        this.title = title;
        this.company = company;
        this.discoveryUrl = discoveryUrl;
        this.applicationUrl = applicationUrl;
        this.statusUrl = statusUrl;
    }
}
