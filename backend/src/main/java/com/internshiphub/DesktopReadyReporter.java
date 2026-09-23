package com.internshiphub;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.web.context.WebServerApplicationContext;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
class DesktopReadyReporter {
    private final String nonce;

    DesktopReadyReporter(@Value("${HUB_DESKTOP_NONCE:}") String nonce) {
        this.nonce = nonce;
    }

    @EventListener
    void reportReady(ApplicationReadyEvent event) {
        if (!nonce.isBlank() && event.getApplicationContext() instanceof WebServerApplicationContext context) {
            System.out.println("INTERNSHIP_HUB_READY " + nonce + " " + context.getWebServer().getPort());
        }
    }
}
