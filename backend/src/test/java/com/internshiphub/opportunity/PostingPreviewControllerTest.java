package com.internshiphub.opportunity;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(PostingPreviewController.class)
class PostingPreviewControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean PostingPreviewService service;

    @Test
    void returnsPreviewForThePastedUrl() throws Exception {
        String url = "https://boards.greenhouse.io/example/jobs/123?gh_src=abc";
        when(service.preview(url)).thenReturn(new PostingPreviewService.PostingPreview("found", "Software Intern", "Example Co"));
        mvc.perform(get("/api/posting-preview").param("url", url))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("found"))
                .andExpect(jsonPath("$.title").value("Software Intern"))
                .andExpect(jsonPath("$.company").value("Example Co"));
    }
}
