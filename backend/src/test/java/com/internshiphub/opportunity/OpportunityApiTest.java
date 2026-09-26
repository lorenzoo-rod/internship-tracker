package com.internshiphub.opportunity;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:opportunities;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
class OpportunityApiTest {
    @Autowired
    private MockMvc mvc;

    @Autowired
    private OpportunityRepository repository;

    @BeforeEach
    void clearDatabase() {
        repository.deleteAll();
    }

    @Test
    void createsAndListsSavedOpportunity() throws Exception {
        mvc.perform(post("/api/opportunities")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Software Intern","company":"Example Co","applicationUrl":" https://example.com/job/1 "}
                                """))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", org.hamcrest.Matchers.matchesPattern("/api/opportunities/\\d+")))
                .andExpect(jsonPath("$.title").value("Software Intern"))
                .andExpect(jsonPath("$.stage").value("SAVED"))
                .andExpect(jsonPath("$.applicationUrl").value("https://example.com/job/1"));

        mvc.perform(get("/api/opportunities"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].company").value("Example Co"));
    }

    @Test
    void duplicateUrlReturnsExistingCardAndDoesNotCreateAnother() throws Exception {
        Opportunity existing = repository.saveAndFlush(
                new Opportunity("Software Intern", "Example Co", null, "https://example.com/job/1", null));

        mvc.perform(post("/api/opportunities")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Another title","company":"Another company","applicationUrl":" https://example.com/job/1 "}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_POSTING_URL"))
                .andExpect(jsonPath("$.existing.id").value(existing.getId()))
                .andExpect(jsonPath("$.existing.title").value("Software Intern"));

        org.junit.jupiter.api.Assertions.assertEquals(1, repository.count());
    }

    @Test
    void updatesStageAndReadsItBack() throws Exception {
        Opportunity existing = repository.saveAndFlush(
                new Opportunity("Software Intern", "Example Co", null, "https://example.com/job/2", null));

        mvc.perform(patch("/api/opportunities/{id}/stage", existing.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"stage\":\"INTERVIEWING\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stage").value("INTERVIEWING"));

        mvc.perform(get("/api/opportunities/{id}", existing.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stage").value("INTERVIEWING"));
    }

    @Test
    void rejectsInvalidInputAndMissingCard() throws Exception {
        mvc.perform(post("/api/opportunities")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":" ","company":"Example Co","applicationUrl":"https://example.com/job/3"}
                                """))
                .andExpect(status().isBadRequest());

        mvc.perform(patch("/api/opportunities/999/stage")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"stage\":\"APPLIED\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("OPPORTUNITY_NOT_FOUND"));
    }

    @Test
    void editsDetailsWithoutMovingCardAndRejectsAnotherCardsUrl() throws Exception {
        Opportunity edited = repository.saveAndFlush(
                new Opportunity("Old title", "Old company", null, "https://example.com/old", null));
        Opportunity other = repository.saveAndFlush(
                new Opportunity("Other title", "Other company", null, "https://example.com/other", null));

        mvc.perform(patch("/api/opportunities/{id}", edited.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":" New title ","company":" New company ","applicationUrl":" https://example.com/new "}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("New title"))
                .andExpect(jsonPath("$.company").value("New company"))
                .andExpect(jsonPath("$.applicationUrl").value("https://example.com/new"))
                .andExpect(jsonPath("$.stage").value("SAVED"));

        mvc.perform(patch("/api/opportunities/{id}", edited.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Changed","company":"Changed","applicationUrl":"https://example.com/other"}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.existing.id").value(other.getId()));

        mvc.perform(get("/api/opportunities/{id}", edited.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("New title"));

        mvc.perform(patch("/api/opportunities/999")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Missing","company":"Missing","applicationUrl":"https://example.com/missing"}
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("OPPORTUNITY_NOT_FOUND"));
    }

    @Test
    void deletesCardAndReportsMissingCards() throws Exception {
        Opportunity existing = repository.saveAndFlush(
                new Opportunity("Software Intern", "Example Co", null, "https://example.com/delete", null));

        mvc.perform(delete("/api/opportunities/{id}", existing.getId()))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/opportunities/{id}", existing.getId()))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/opportunities/{id}", existing.getId()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("OPPORTUNITY_NOT_FOUND"));
    }

    @Test
    void allowsSharedDiscoveryWithDifferentApplicationsButBlocksMatchingApplication() throws Exception {
        Opportunity existing = repository.saveAndFlush(new Opportunity(
                "First Intern", "Example Co", "https://example.com/discovery", "https://example.com/apply", "https://example.com/status"));

        mvc.perform(post("/api/opportunities")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Second Intern","company":"Other Co","discoveryUrl":"https://example.com/discovery","applicationUrl":"https://example.com/another","statusUrl":"https://example.com/status"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.statusUrlMatchId").value(existing.getId()));

        mvc.perform(post("/api/opportunities")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Duplicate","company":"Third Co","applicationUrl":" https://example.com/apply "}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.existing.id").value(existing.getId()));

        org.junit.jupiter.api.Assertions.assertEquals(2, repository.count());
    }

    @Test
    void blocksAnExactDiscoveryMatchWhenBothCardsHaveNoApplicationUrl() throws Exception {
        Opportunity existing = repository.saveAndFlush(new Opportunity(
                "First Intern", "Example Co", "https://example.com/jobs/1", null, null));

        mvc.perform(post("/api/opportunities")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Duplicate","company":"Example Co","discoveryUrl":" https://example.com/jobs/1 "}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.existing.id").value(existing.getId()));
    }

    @Test
    void acceptsStatusOnlyLegacyShapeAndRejectsNoLinks() throws Exception {
        mvc.perform(post("/api/opportunities")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Applied Intern","company":"Example Co","statusUrl":"https://example.com/status"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.applicationUrl").doesNotExist());

        mvc.perform(post("/api/opportunities")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"No Link","company":"Example Co"}
                                """))
                .andExpect(status().isBadRequest());
    }
}
