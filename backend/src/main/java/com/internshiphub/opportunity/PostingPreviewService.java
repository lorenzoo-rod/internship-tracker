package com.internshiphub.opportunity;

import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class PostingPreviewService {
    private static final Pattern JOB_PATH = Pattern.compile("/([a-zA-Z0-9_-]+)/jobs/([0-9]+)/?");
    private final RestClient greenhouse;

    public PostingPreviewService() {
        var requestFactory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build());
        requestFactory.setReadTimeout(Duration.ofSeconds(5));
        this.greenhouse = RestClient.builder()
                .baseUrl("https://boards-api.greenhouse.io")
                .requestFactory(requestFactory)
                .build();
    }

    PostingPreviewService(RestClient greenhouse) {
        this.greenhouse = greenhouse;
    }

    public PostingPreview preview(String postingUrl) {
        if (postingUrl == null || postingUrl.length() > 2048) return PostingPreview.unsupported();
        URI uri;
        try {
            uri = URI.create(postingUrl.trim());
        } catch (IllegalArgumentException exception) {
            return PostingPreview.unsupported();
        }
        if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getUserInfo() != null || uri.getPort() != -1
                || !("boards.greenhouse.io".equalsIgnoreCase(uri.getHost())
                || "job-boards.greenhouse.io".equalsIgnoreCase(uri.getHost()))) {
            return PostingPreview.unsupported();
        }
        Matcher match = JOB_PATH.matcher(uri.getPath());
        if (!match.matches()) return PostingPreview.unsupported();

        try {
            GreenhouseJob job = greenhouse.get()
                    .uri("/v1/boards/{board}/jobs/{id}", match.group(1), match.group(2))
                    .retrieve()
                    .body(GreenhouseJob.class);
            if (job == null || blank(job.title()) || blank(job.company_name())) return PostingPreview.unavailable();
            return new PostingPreview("found", job.title().trim(), job.company_name().trim());
        } catch (Exception exception) {
            return PostingPreview.unavailable();
        }
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    public record PostingPreview(String status, String title, String company) {
        static PostingPreview unsupported() { return new PostingPreview("unsupported", null, null); }
        static PostingPreview unavailable() { return new PostingPreview("unavailable", null, null); }
    }

    private record GreenhouseJob(String title, String company_name) {}
}
