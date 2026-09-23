package com.internshiphub.opportunity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import javax.sql.DataSource;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.annotation.DirtiesContext;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class OpportunityPostgresTest {
    private static final EmbeddedPostgres POSTGRES = startPostgres();

    @Autowired
    private MockMvc mvc;

    @Autowired
    private DataSource dataSource;

    private static EmbeddedPostgres startPostgres() {
        try {
            return EmbeddedPostgres.start();
        } catch (java.io.IOException exception) {
            throw new IllegalStateException("Could not start PostgreSQL for tests", exception);
        }
    }

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> POSTGRES.getJdbcUrl("postgres", "postgres"));
        registry.add("spring.datasource.username", () -> "postgres");
        registry.add("spring.datasource.password", () -> "postgres");
    }

    @Test
    void savesDetectsDuplicateAndMovesCardInPostgres() throws Exception {
        try (var connection = dataSource.getConnection()) {
            assertEquals("PostgreSQL", connection.getMetaData().getDatabaseProductName());
        }

        String create = """
                {"title":"Software Intern","company":"Example Co","postingUrl":"https://example.com/job/pg"}
                """;
        mvc.perform(post("/api/opportunities").contentType(MediaType.APPLICATION_JSON).content(create))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.stage").value("SAVED"));

        mvc.perform(post("/api/opportunities").contentType(MediaType.APPLICATION_JSON).content(create))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.existing.postingUrl").value("https://example.com/job/pg"));

        mvc.perform(patch("/api/opportunities/1/stage")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"stage\":\"APPLIED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stage").value("APPLIED"));

        mvc.perform(get("/api/opportunities/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stage").value("APPLIED"));

        mvc.perform(patch("/api/opportunities/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Updated Intern","company":"Example Co","postingUrl":"https://example.com/job/pg-updated"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated Intern"))
                .andExpect(jsonPath("$.stage").value("APPLIED"));

        mvc.perform(delete("/api/opportunities/1"))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/opportunities/1"))
                .andExpect(status().isNotFound());
    }
}
