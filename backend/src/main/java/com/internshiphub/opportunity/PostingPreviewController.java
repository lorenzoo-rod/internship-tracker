package com.internshiphub.opportunity;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PostingPreviewController {
    private final PostingPreviewService service;

    public PostingPreviewController(PostingPreviewService service) {
        this.service = service;
    }

    @GetMapping("/api/posting-preview")
    public PostingPreviewService.PostingPreview preview(@RequestParam String url) {
        return service.preview(url);
    }
}
