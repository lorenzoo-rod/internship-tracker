package com.internshiphub.opportunity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

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

    @Column(name = "posting_url", nullable = false, unique = true, length = 2048)
    private String postingUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Stage stage;

    protected Opportunity() {
    }

    public Opportunity(String title, String company, String postingUrl) {
        this.title = title;
        this.company = company;
        this.postingUrl = postingUrl;
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

    public String getPostingUrl() {
        return postingUrl;
    }

    public Stage getStage() {
        return stage;
    }

    public void setStage(Stage stage) {
        this.stage = stage;
    }

    public void updateDetails(String title, String company, String postingUrl) {
        this.title = title;
        this.company = company;
        this.postingUrl = postingUrl;
    }
}
