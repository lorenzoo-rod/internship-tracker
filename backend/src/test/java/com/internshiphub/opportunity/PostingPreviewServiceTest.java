package com.internshiphub.opportunity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withResourceNotFound;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class PostingPreviewServiceTest {
    @Test
    void loadsPublishedJobDetailsFromTheFixedGreenhouseApi() {
        var builder = RestClient.builder().baseUrl("https://boards-api.greenhouse.io");
        var server = MockRestServiceServer.bindTo(builder).build();
        var service = new PostingPreviewService(builder.build());
        server.expect(requestTo("https://boards-api.greenhouse.io/v1/boards/example/jobs/12345"))
                .andRespond(withSuccess("{\"title\":\" Software Intern \",\"company_name\":\" Example Co \",\"absolute_url\":\"https://other.example/job\"}", MediaType.APPLICATION_JSON));

        var result = service.preview("https://job-boards.greenhouse.io/example/jobs/12345?gh_src=abc");
        assertEquals("found", result.status());
        assertEquals("Software Intern", result.title());
        assertEquals("Example Co", result.company());
        server.verify();
    }

    @Test
    void rejectsUnsupportedLinksWithoutMakingRequests() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var service = new PostingPreviewService(builder.build());
        for (String url : new String[] {
                "https://www.linkedin.com/jobs/view/123", "http://boards.greenhouse.io/example/jobs/123",
                "https://boards.greenhouse.io.evil.test/example/jobs/123",
                "https://boards.greenhouse.io/example/jobs/not-a-number",
                "https://boards.greenhouse.io/example/jobs/123/extra"
        }) {
            assertEquals("unsupported", service.preview(url).status());
        }
        server.verify();
    }

    @Test
    void missingOrIncompleteJobKeepsManualEntryAvailable() {
        var builder = RestClient.builder().baseUrl("https://boards-api.greenhouse.io");
        var server = MockRestServiceServer.bindTo(builder).build();
        var service = new PostingPreviewService(builder.build());
        server.expect(requestTo("https://boards-api.greenhouse.io/v1/boards/example/jobs/123"))
                .andRespond(withResourceNotFound());
        server.expect(requestTo("https://boards-api.greenhouse.io/v1/boards/example/jobs/124"))
                .andRespond(withSuccess("{\"title\":\"Intern\"}", MediaType.APPLICATION_JSON));
        assertEquals("unavailable", service.preview("https://boards.greenhouse.io/example/jobs/123").status());
        assertEquals("unavailable", service.preview("https://boards.greenhouse.io/example/jobs/124").status());
        server.verify();
    }
}
